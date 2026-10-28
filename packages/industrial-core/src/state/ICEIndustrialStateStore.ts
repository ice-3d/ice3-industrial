import type {
  ICEIndustrialValue,
} from '../manifest/ICEIndustrialManifest.js';
import type {
  ICEIndustrialEntityRegistry,
} from '../registry/ICEIndustrialEntityRegistry.js';
import type {
  ICEIndustrialTypeRegistry,
} from '../registry/ICEIndustrialTypeRegistry.js';
import type {
  ICEIndustrialPropertyValue,
  ICEIndustrialQuality,
  ICEIndustrialStateChange,
  ICEIndustrialStatePatch,
} from './ICEIndustrialState.js';

export interface ICEIndustrialStateDiagnostics {
  readonly ignoredStalePatches: number;
}

interface ValidatedPatch {
  readonly patch: ICEIndustrialStatePatch;
}

const QUALITIES = new Set<ICEIndustrialQuality>([
  'good',
  'uncertain',
  'bad',
]);

function scheduleMicrotask(callback: () => void): void {
  void Promise.resolve().then(callback);
}

function invalid(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_STATE_INVALID: ${detail}`);
}

function cloneValue(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): ICEIndustrialValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      invalid(`${path} must be finite`);
    }
    return value;
  }
  if (typeof value !== 'object') {
    invalid(`${path} must be a serializable value`);
  }
  if (ancestors.has(value)) {
    invalid(`${path} must not contain a cycle`);
  }
  ancestors.add(value);
  let cloned: ICEIndustrialValue;
  if (Array.isArray(value)) {
    cloned = Object.freeze(value.map((entry, index) =>
      cloneValue(entry, `${path}[${index}]`, ancestors)));
  } else {
    if (
      Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null
    ) {
      invalid(`${path} must be a plain object`);
    }
    const record = Object.create(null) as Record<
      string,
      ICEIndustrialValue
    >;
    for (const [key, entry] of Object.entries(value)) {
      if (key.length === 0) {
        invalid(`${path} contains an empty key`);
      }
      record[key] = cloneValue(entry, `${path}.${key}`, ancestors);
    }
    cloned = Object.freeze(record);
  }
  ancestors.delete(value);
  return cloned;
}

function matchesDataType(
  value: ICEIndustrialValue,
  dataType: 'string' | 'number' | 'boolean' | 'enum' | 'object',
  enumValues: readonly string[] | undefined,
): boolean {
  switch (dataType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'enum':
      return (
        typeof value === 'string'
        && (enumValues?.includes(value) ?? false)
      );
    case 'object':
      return value !== null && typeof value === 'object';
  }
}

function optionalTimestamp(value: unknown, path: string): void {
  if (
    value !== undefined
    && (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    invalid(`${path} must be a finite number`);
  }
}

function optionalSource(value: unknown, path: string): void {
  if (
    value !== undefined
    && (typeof value !== 'string' || value.trim().length === 0)
  ) {
    invalid(`${path} must be a non-empty string`);
  }
}

function stateKey(entityId: string, propertyId: string): string {
  return `${entityId}\u0000${propertyId}`;
}

export class ICEIndustrialStateStore {
  readonly #entities: ICEIndustrialEntityRegistry;
  readonly #types: ICEIndustrialTypeRegistry;
  readonly #schedule: (callback: () => void) => void;
  readonly #values = new Map<string, ICEIndustrialPropertyValue>();
  readonly #listeners = new Set<(
    changes: readonly ICEIndustrialStateChange[],
  ) => void>();
  readonly #changes = new Map<string, ICEIndustrialStateChange>();
  #scheduled = false;
  #disposed = false;
  #ignoredStalePatches = 0;
  #diagnostics: ICEIndustrialStateDiagnostics = Object.freeze({
    ignoredStalePatches: 0,
  });

  constructor(
    entities: ICEIndustrialEntityRegistry,
    types: ICEIndustrialTypeRegistry,
    schedule: (callback: () => void) => void = scheduleMicrotask,
  ) {
    this.#entities = entities;
    this.#types = types;
    this.#schedule = schedule;
  }

  get diagnostics(): ICEIndustrialStateDiagnostics {
    return this.#diagnostics;
  }

  get(
    entityId: string,
    propertyId: string,
  ): ICEIndustrialPropertyValue | undefined {
    return this.#values.get(stateKey(entityId, propertyId));
  }

  snapshot(): ReadonlyMap<string, ICEIndustrialPropertyValue> {
    return new Map(this.#values);
  }

  update(patches: readonly ICEIndustrialStatePatch[]): void {
    this.#assertActive();
    if (!Array.isArray(patches)) {
      invalid('patches must be an array');
    }
    const validated = patches.map((patch, index) =>
      this.#validatePatch(patch, `patches[${index}]`));
    if (validated.length === 0) {
      return;
    }

    for (const { patch } of validated) {
      const key = stateKey(patch.entityId, patch.propertyId);
      const previous = this.#values.get(key);
      if (this.#isStale(previous, patch)) {
        this.#ignoredStalePatches += 1;
        this.#diagnostics = Object.freeze({
          ignoredStalePatches: this.#ignoredStalePatches,
        });
        continue;
      }
      const current = Object.freeze({
        entityId: patch.entityId,
        propertyId: patch.propertyId,
        value: patch.value,
        quality: patch.quality,
        ...(patch.sourceTimestamp === undefined
          ? {}
          : { sourceTimestamp: patch.sourceTimestamp }),
        ...(patch.serverTimestamp === undefined
          ? {}
          : { serverTimestamp: patch.serverTimestamp }),
        ...(patch.source === undefined ? {} : { source: patch.source }),
      });
      const pending = this.#changes.get(key);
      this.#changes.set(key, Object.freeze({
        current,
        ...(pending !== undefined
          ? pending.previous === undefined
            ? {}
            : { previous: pending.previous }
          : previous === undefined
            ? {}
            : { previous }),
      }));
      this.#values.set(key, current);
    }

    if (this.#changes.size > 0 && !this.#scheduled) {
      this.#scheduled = true;
      this.#schedule(this.flush);
    }
  }

  subscribe(
    listener: (
      changes: readonly ICEIndustrialStateChange[],
    ) => void,
  ): () => void {
    this.#assertActive();
    if (typeof listener !== 'function') {
      invalid('listener must be a function');
    }
    this.#listeners.add(listener);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      this.#listeners.delete(listener);
    };
  }

  flush = (): void => {
    if (this.#disposed || this.#changes.size === 0) {
      this.#scheduled = false;
      return;
    }
    const changes = Object.freeze(
      [...this.#changes.entries()]
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0)
        .map(([, change]) => change),
    );
    this.#changes.clear();
    this.#scheduled = false;
    for (const listener of [...this.#listeners]) {
      if (this.#listeners.has(listener)) {
        listener(changes);
      }
    }
  };

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#scheduled = false;
    this.#changes.clear();
    this.#listeners.clear();
    this.#values.clear();
  }

  #assertActive(): void {
    if (this.#disposed) {
      invalid('store is disposed');
    }
  }

  #validatePatch(
    patch: ICEIndustrialStatePatch,
    path: string,
  ): ValidatedPatch {
    if (patch === null || typeof patch !== 'object') {
      invalid(`${path} must be an object`);
    }
    if (
      typeof patch.entityId !== 'string'
      || patch.entityId.trim().length === 0
    ) {
      invalid(`${path}.entityId must be a non-empty string`);
    }
    if (
      typeof patch.propertyId !== 'string'
      || patch.propertyId.trim().length === 0
    ) {
      invalid(`${path}.propertyId must be a non-empty string`);
    }
    const entity = this.#entities.get(patch.entityId);
    if (entity === undefined) {
      invalid(`${path} references an unknown entity`);
    }
    const type = this.#types.require(entity.typeId);
    const definition = type.propertyDefinitions.find(
      (candidate) => candidate.id === patch.propertyId,
    );
    if (definition === undefined) {
      invalid(`${path} references an unknown property`);
    }
    if (!definition.readable) {
      invalid(`${path} references an unreadable property`);
    }
    if (!QUALITIES.has(patch.quality)) {
      invalid(`${path}.quality is invalid`);
    }
    optionalTimestamp(patch.sourceTimestamp, `${path}.sourceTimestamp`);
    optionalTimestamp(patch.serverTimestamp, `${path}.serverTimestamp`);
    optionalSource(patch.source, `${path}.source`);
    const value = cloneValue(patch.value, `${path}.value`);
    if (!matchesDataType(
      value,
      definition.dataType,
      definition.enumValues,
    )) {
      invalid(`${path}.value does not match ${definition.dataType}`);
    }
    return {
      patch: Object.freeze({
        entityId: patch.entityId,
        propertyId: patch.propertyId,
        value,
        quality: patch.quality,
        ...(patch.sourceTimestamp === undefined
          ? {}
          : { sourceTimestamp: patch.sourceTimestamp }),
        ...(patch.serverTimestamp === undefined
          ? {}
          : { serverTimestamp: patch.serverTimestamp }),
        ...(patch.source === undefined ? {} : { source: patch.source }),
      }),
    };
  }

  #isStale(
    previous: ICEIndustrialPropertyValue | undefined,
    patch: ICEIndustrialStatePatch,
  ): boolean {
    if (
      previous?.sourceTimestamp === undefined
      || patch.sourceTimestamp === undefined
    ) {
      return false;
    }
    if (patch.sourceTimestamp < previous.sourceTimestamp) {
      return true;
    }
    return (
      patch.sourceTimestamp === previous.sourceTimestamp
      && patch.source !== previous.source
    );
  }
}

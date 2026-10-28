import type {
  ICEIndustrialValue,
} from '../manifest/ICEIndustrialManifest.js';

export interface ICEIndustrialEventInput {
  readonly id?: string;
  readonly type: string;
  readonly entityId?: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly timestamp: number;
  readonly source?: string;
  readonly correlationId?: string;
  readonly payload?: Readonly<Record<string, ICEIndustrialValue>>;
}

export interface ICEIndustrialEvent {
  readonly id: string;
  readonly type: string;
  readonly entityId?: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly timestamp: number;
  readonly source?: string;
  readonly correlationId?: string;
  readonly sequence: number;
  readonly payload?: Readonly<Record<string, ICEIndustrialValue>>;
}

const SEVERITIES = new Set([
  'info',
  'warning',
  'error',
  'critical',
]);

const EMPTY_EVENTS = Object.freeze([] as readonly ICEIndustrialEvent[]);

function invalid(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_EVENT_INVALID: ${detail}`);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(`${path} must be a non-empty string`);
  }
  return value;
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

function clonePayload(
  value: unknown,
): Readonly<Record<string, ICEIndustrialValue>> {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    invalid('payload must be a plain object');
  }
  return cloneValue(value, 'payload') as Readonly<
    Record<string, ICEIndustrialValue>
  >;
}

export class ICEIndustrialEventStore {
  readonly #historyLimit: number;
  readonly #listeners = new Set<
    (event: ICEIndustrialEvent) => void
  >();
  readonly #usedIds = new Set<string>();
  #events: readonly ICEIndustrialEvent[] = EMPTY_EVENTS;
  #sequence = 0;
  #disposed = false;

  constructor(options: { readonly historyLimit?: number } = {}) {
    const historyLimit = options.historyLimit ?? 1_000;
    if (!Number.isInteger(historyLimit) || historyLimit < 0) {
      invalid('historyLimit must be a non-negative integer');
    }
    this.#historyLimit = historyLimit;
  }

  insert(input: ICEIndustrialEventInput): ICEIndustrialEvent {
    this.#assertActive();
    if (input === null || typeof input !== 'object') {
      invalid('event must be an object');
    }
    const type = nonEmptyString(input.type, 'type');
    const severity = String(input.severity);
    if (!SEVERITIES.has(severity)) {
      invalid('severity is invalid');
    }
    if (
      typeof input.timestamp !== 'number'
      || !Number.isFinite(input.timestamp)
    ) {
      invalid('timestamp must be a finite number');
    }
    const entityId = input.entityId === undefined
      ? undefined
      : nonEmptyString(input.entityId, 'entityId');
    const source = input.source === undefined
      ? undefined
      : nonEmptyString(input.source, 'source');
    const correlationId = input.correlationId === undefined
      ? undefined
      : nonEmptyString(input.correlationId, 'correlationId');
    const explicitId = input.id === undefined
      ? undefined
      : nonEmptyString(input.id, 'id');
    if (explicitId !== undefined && this.#usedIds.has(explicitId)) {
      invalid(`duplicate event id "${explicitId}"`);
    }
    const payload = input.payload === undefined
      ? undefined
      : clonePayload(input.payload);
    const sequence = this.#sequence + 1;
    const id = explicitId ?? `ice-event-${sequence}`;
    if (this.#usedIds.has(id)) {
      invalid(`duplicate event id "${id}"`);
    }

    const event = Object.freeze({
      id,
      type,
      severity: severity as ICEIndustrialEvent['severity'],
      timestamp: input.timestamp,
      sequence,
      ...(entityId === undefined ? {} : { entityId }),
      ...(source === undefined ? {} : { source }),
      ...(correlationId === undefined ? {} : { correlationId }),
      ...(payload === undefined ? {} : { payload }),
    });
    this.#sequence = sequence;
    this.#usedIds.add(id);
    const next = [...this.#events, event];
    this.#events = Object.freeze(
      this.#historyLimit === 0
        ? EMPTY_EVENTS
        : next.slice(-this.#historyLimit),
    );
    for (const listener of [...this.#listeners]) {
      if (this.#listeners.has(listener)) {
        listener(event);
      }
    }
    return event;
  }

  list(): readonly ICEIndustrialEvent[] {
    return this.#events;
  }

  subscribe(
    listener: (event: ICEIndustrialEvent) => void,
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

  clear(): void {
    this.#assertActive();
    this.#events = EMPTY_EVENTS;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#events = EMPTY_EVENTS;
    this.#listeners.clear();
    this.#usedIds.clear();
  }

  #assertActive(): void {
    if (this.#disposed) {
      invalid('store is disposed');
    }
  }
}

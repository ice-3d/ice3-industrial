import type {
  ICEIndustrialEvent,
  ICEIndustrialEventInput,
} from '../event/ICEIndustrialEventStore.js';
import {
  ICEIndustrialEventStore,
} from '../event/ICEIndustrialEventStore.js';
import type {
  ICEIndustrialExternalId,
  ICEIndustrialWorkspaceManifest,
} from '../manifest/ICEIndustrialManifest.js';
import {
  parseIndustrialManifest,
} from '../manifest/parseIndustrialManifest.js';
import {
  ICEIndustrialOperationRegistry,
} from '../operation/ICEIndustrialOperationRegistry.js';
import type {
  ICEIndustrialEntityQuery,
} from '../query/ICEIndustrialQuery.js';
import {
  ICEIndustrialQuery,
} from '../query/ICEIndustrialQuery.js';
import {
  ICEIndustrialEntityRegistry,
} from '../registry/ICEIndustrialEntityRegistry.js';
import {
  ICEIndustrialTypeRegistry,
} from '../registry/ICEIndustrialTypeRegistry.js';
import {
  ICEIndustrialRelationGraph,
} from '../relation/ICEIndustrialRelationGraph.js';
import type {
  ICEIndustrialPropertyValue,
  ICEIndustrialStateChange,
  ICEIndustrialStatePatch,
} from '../state/ICEIndustrialState.js';
import {
  ICEIndustrialStateStore,
} from '../state/ICEIndustrialStateStore.js';
import type {
  ICEIndustrialFilter,
  ICEIndustrialTimeRange,
  ICEIndustrialWorkspaceContext,
} from './ICEIndustrialWorkspaceContext.js';
import {
  emptyWorkspaceContext,
} from './ICEIndustrialWorkspaceContext.js';

type Listener = (event: unknown) => void;

function invalid(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_WORKSPACE_INVALID: ${detail}`);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeStrings(
  values: readonly string[],
  path: string,
): readonly string[] {
  if (!Array.isArray(values)) {
    invalid(`${path} must be an array`);
  }
  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      invalid(`${path} must contain non-empty strings`);
    }
    unique.add(value);
  }
  return Object.freeze([...unique].sort(compareIds));
}

function identityKey(identity: ICEIndustrialExternalId): string {
  return JSON.stringify([
    identity.scheme,
    identity.scope ?? null,
    identity.value,
  ]);
}

export class ICEIndustrialWorkspace {
  readonly entities: ICEIndustrialEntityRegistry;
  readonly types: ICEIndustrialTypeRegistry;
  readonly relations: ICEIndustrialRelationGraph;
  readonly state: ICEIndustrialStateStore;
  readonly events: ICEIndustrialEventStore;
  readonly operations: ICEIndustrialOperationRegistry;
  readonly #query: ICEIndustrialQuery;
  readonly #listeners = new Map<string, Set<Listener>>();
  readonly #stateUnsubscribe: () => void;
  readonly #eventUnsubscribe: () => void;
  #context: ICEIndustrialWorkspaceContext = emptyWorkspaceContext();
  #disposed = false;

  constructor(options: {
    readonly manifest: ICEIndustrialWorkspaceManifest;
    readonly stateScheduler?: (callback: () => void) => void;
    readonly eventHistoryLimit?: number;
  }) {
    const manifest = parseIndustrialManifest(options.manifest);
    this.types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
    this.entities = new ICEIndustrialEntityRegistry(
      manifest.entities,
      this.types,
    );
    this.relations = new ICEIndustrialRelationGraph(manifest.relations);
    this.state = options.stateScheduler === undefined
      ? new ICEIndustrialStateStore(this.entities, this.types)
      : new ICEIndustrialStateStore(
        this.entities,
        this.types,
        options.stateScheduler,
      );
    this.events = options.eventHistoryLimit === undefined
      ? new ICEIndustrialEventStore()
      : new ICEIndustrialEventStore({
        historyLimit: options.eventHistoryLimit,
      });
    this.operations = new ICEIndustrialOperationRegistry(
      this.entities,
      this.types,
    );
    this.#query = new ICEIndustrialQuery(
      this.entities,
      this.relations,
      (entityId, propertyId) => this.state.get(entityId, propertyId),
    );
    this.#stateUnsubscribe = this.state.subscribe((changes) => {
      this.#emit('STATE_CHANGE', changes);
    });
    this.#eventUnsubscribe = this.events.subscribe((event) => {
      this.#emit('EVENT', event);
    });
  }

  get context(): ICEIndustrialWorkspaceContext {
    return this.#context;
  }

  queryEntities(
    query?: ICEIndustrialEntityQuery,
  ): ReturnType<ICEIndustrialQuery['queryEntities']> {
    this.#assertActive();
    return this.#query.queryEntities(query);
  }

  getEntity(entityId: string) {
    this.#assertActive();
    return this.entities.get(entityId);
  }

  getType(typeId: string) {
    this.#assertActive();
    return this.types.get(typeId);
  }

  getRelations(
    entityId: string,
    query?: Parameters<ICEIndustrialRelationGraph['related']>[1],
  ) {
    this.#assertActive();
    return this.relations.related(entityId, query);
  }

  getProperty(
    entityId: string,
    propertyId: string,
  ): ICEIndustrialPropertyValue | undefined {
    this.#assertActive();
    return this.state.get(entityId, propertyId);
  }

  updateProperties(patches: readonly ICEIndustrialStatePatch[]): void {
    this.#assertActive();
    this.state.update(patches);
  }

  insertEvent(input: ICEIndustrialEventInput): ICEIndustrialEvent {
    this.#assertActive();
    return this.events.insert(input);
  }

  setSelection(
    ids: readonly string[],
    options: { readonly source?: string } = {},
  ): void {
    this.#assertActive();
    if (
      options.source !== undefined
      && (
        typeof options.source !== 'string'
        || options.source.trim().length === 0
      )
    ) {
      invalid('selection source must be a non-empty string');
    }
    const selection = this.#normalizeEntityIds(ids, 'selection');
    this.#setContext(Object.freeze({
      ...this.#context,
      selection,
    }));
  }

  setHidden(ids: readonly string[]): void {
    this.#assertActive();
    this.#setContext(Object.freeze({
      ...this.#context,
      hiddenEntityIds: this.#normalizeEntityIds(ids, 'hiddenEntityIds'),
    }));
  }

  setIsolated(ids: readonly string[]): void {
    this.#assertActive();
    this.#setContext(Object.freeze({
      ...this.#context,
      isolatedEntityIds: this.#normalizeEntityIds(ids, 'isolatedEntityIds'),
    }));
  }

  setHighlighted(ids: readonly string[]): void {
    this.#assertActive();
    this.#setContext(Object.freeze({
      ...this.#context,
      highlightedEntityIds: this.#normalizeEntityIds(
        ids,
        'highlightedEntityIds',
      ),
    }));
  }

  setFilters(filters: readonly ICEIndustrialFilter[]): void {
    this.#assertActive();
    if (!Array.isArray(filters)) {
      invalid('filters must be an array');
    }
    const ids = new Set<string>();
    const normalized = filters.map((filter, index) => {
      if (filter === null || typeof filter !== 'object') {
        invalid(`filters[${index}] must be an object`);
      }
      if (typeof filter.id !== 'string' || filter.id.trim().length === 0) {
        invalid(`filters[${index}].id must be a non-empty string`);
      }
      if (ids.has(filter.id)) {
        invalid(`filters contains duplicate id "${filter.id}"`);
      }
      ids.add(filter.id);
      const entityIds = filter.entityIds === undefined
        ? undefined
        : this.#normalizeEntityIds(
          filter.entityIds,
          `filters[${index}].entityIds`,
        );
      const typeIds = filter.typeIds === undefined
        ? undefined
        : normalizeStrings(filter.typeIds, `filters[${index}].typeIds`);
      for (const typeId of typeIds ?? []) {
        if (this.types.get(typeId) === undefined) {
          invalid(`filters[${index}] references unknown type "${typeId}"`);
        }
      }
      const externalIds = filter.externalIds === undefined
        ? undefined
        : this.#normalizeExternalIds(
          filter.externalIds,
          `filters[${index}].externalIds`,
        );
      return Object.freeze({
        id: filter.id,
        ...(entityIds === undefined ? {} : { entityIds }),
        ...(typeIds === undefined ? {} : { typeIds }),
        ...(externalIds === undefined ? {} : { externalIds }),
      });
    });
    this.#setContext(Object.freeze({
      ...this.#context,
      filters: Object.freeze(
        normalized.sort((left, right) => compareIds(left.id, right.id)),
      ),
    }));
  }

  setTimeRange(range?: ICEIndustrialTimeRange): void {
    this.#assertActive();
    if (range === undefined) {
      const { timeRange: _ignored, ...context } = this.#context;
      this.#setContext(Object.freeze(context));
      return;
    }
    if (range === null || typeof range !== 'object') {
      invalid('timeRange must be an object');
    }
    for (const [name, value] of Object.entries(range)) {
      if (name !== 'start' && name !== 'end') {
        invalid(`timeRange.${name} is not supported`);
      }
      if (
        value !== undefined
        && (typeof value !== 'number' || !Number.isFinite(value))
      ) {
        invalid(`timeRange.${name} must be finite`);
      }
    }
    if (
      range.start !== undefined
      && range.end !== undefined
      && range.start > range.end
    ) {
      invalid('timeRange.start must not exceed end');
    }
    this.#setContext(Object.freeze({
      ...this.#context,
      timeRange: Object.freeze({
        ...(range.start === undefined ? {} : { start: range.start }),
        ...(range.end === undefined ? {} : { end: range.end }),
      }),
    }));
  }

  resetContext(): void {
    this.#assertActive();
    this.#setContext(emptyWorkspaceContext());
  }

  on(type: string, listener: Listener): () => void {
    this.#assertActive();
    if (typeof type !== 'string' || type.trim().length === 0) {
      invalid('event type must be a non-empty string');
    }
    if (typeof listener !== 'function') {
      invalid('listener must be a function');
    }
    let listeners = this.#listeners.get(type);
    if (listeners === undefined) {
      listeners = new Set();
      this.#listeners.set(type, listeners);
    }
    listeners.add(listener);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      listeners!.delete(listener);
      if (listeners!.size === 0) {
        this.#listeners.delete(type);
      }
    };
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#stateUnsubscribe();
    this.#eventUnsubscribe();
    this.state.dispose();
    this.events.dispose();
    this.operations.dispose();
    this.#listeners.clear();
  }

  #normalizeEntityIds(
    ids: readonly string[],
    path: string,
  ): readonly string[] {
    const normalized = normalizeStrings(ids, path);
    for (const id of normalized) {
      if (this.entities.get(id) === undefined) {
        invalid(`${path} references unknown entity "${id}"`);
      }
    }
    return normalized;
  }

  #normalizeExternalIds(
    identities: readonly ICEIndustrialExternalId[],
    path: string,
  ): readonly ICEIndustrialExternalId[] {
    if (!Array.isArray(identities)) {
      invalid(`${path} must be an array`);
    }
    const unique = new Map<string, ICEIndustrialExternalId>();
    identities.forEach((identity, index) => {
      if (identity === null || typeof identity !== 'object') {
        invalid(`${path}[${index}] must be an object`);
      }
      if (
        typeof identity.scheme !== 'string'
        || identity.scheme.trim().length === 0
        || typeof identity.value !== 'string'
        || identity.value.trim().length === 0
        || (
          identity.scope !== undefined
          && (
            typeof identity.scope !== 'string'
            || identity.scope.trim().length === 0
          )
        )
      ) {
        invalid(`${path}[${index}] has an invalid identity`);
      }
      unique.set(identityKey(identity), Object.freeze({
        scheme: identity.scheme,
        value: identity.value,
        ...(identity.scope === undefined ? {} : {
          scope: identity.scope,
        }),
      }));
    });
    return Object.freeze(
      [...unique.entries()]
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0)
        .map(([, identity]) => identity),
    );
  }

  #setContext(next: ICEIndustrialWorkspaceContext): void {
    if (JSON.stringify(next) === JSON.stringify(this.#context)) {
      return;
    }
    this.#context = Object.freeze({
      selection: next.selection,
      hiddenEntityIds: next.hiddenEntityIds,
      isolatedEntityIds: next.isolatedEntityIds,
      highlightedEntityIds: next.highlightedEntityIds,
      filters: next.filters,
      ...(next.timeRange === undefined ? {} : {
        timeRange: next.timeRange,
      }),
    });
    this.#emit('CONTEXT_CHANGE', this.#context);
  }

  #emit(type: string, value: unknown): void {
    const listeners = this.#listeners.get(type);
    if (listeners === undefined) {
      return;
    }
    for (const listener of [...listeners]) {
      if (listeners.has(listener)) {
        listener(value);
      }
    }
  }

  #assertActive(): void {
    if (this.#disposed) {
      invalid('workspace is disposed');
    }
  }
}

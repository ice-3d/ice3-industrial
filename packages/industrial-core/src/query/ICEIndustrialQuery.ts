import type {
  ICEIndustrialEntity,
  ICEIndustrialExternalId,
  ICEIndustrialValue,
} from '../manifest/ICEIndustrialManifest.js';
import type {
  ICEIndustrialEntityRegistry,
} from '../registry/ICEIndustrialEntityRegistry.js';
import type {
  ICEIndustrialRelationGraph,
} from '../relation/ICEIndustrialRelationGraph.js';
import type {
  ICEIndustrialPropertyValue,
  ICEIndustrialQuality,
} from '../state/ICEIndustrialState.js';

export interface ICEIndustrialEntityQuery {
  readonly ids?: readonly string[];
  readonly typeIds?: readonly string[];
  readonly parentIds?: readonly string[];
  readonly externalIds?: readonly ICEIndustrialExternalId[];
  readonly propertyFilters?: readonly {
    readonly propertyId: string;
    readonly equals?: ICEIndustrialValue;
    readonly quality?: ICEIndustrialQuality;
  }[];
}

function equalValue(
  left: ICEIndustrialValue,
  right: ICEIndustrialValue,
): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (
    left === null
    || right === null
    || typeof left !== 'object'
    || typeof right !== 'object'
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (
      !Array.isArray(left)
      || !Array.isArray(right)
      || left.length !== right.length
    ) {
      return false;
    }
    return left.every((value, index) => equalValue(value, right[index]!));
  }
  const leftObject = left as Readonly<Record<string, ICEIndustrialValue>>;
  const rightObject = right as Readonly<Record<string, ICEIndustrialValue>>;
  const leftKeys = Object.keys(leftObject).sort();
  const rightKeys = Object.keys(rightObject).sort();
  return (
    leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index]
      && equalValue(leftObject[key]!, rightObject[key]!))
  );
}

function hasIdentity(
  entity: ICEIndustrialEntity,
  identity: ICEIndustrialExternalId,
): boolean {
  return entity.externalIds.some((candidate) =>
    candidate.scheme === identity.scheme
    && candidate.value === identity.value
    && candidate.scope === identity.scope);
}

export class ICEIndustrialQuery {
  readonly #entities: ICEIndustrialEntityRegistry;
  readonly #relations: ICEIndustrialRelationGraph;
  readonly #getState: (
    entityId: string,
    propertyId: string,
  ) => ICEIndustrialPropertyValue | undefined;
  readonly #propertyIdsByType: ReadonlyMap<string, ReadonlySet<string>>;
  readonly #knownPropertyIds: ReadonlySet<string>;

  constructor(
    entities: ICEIndustrialEntityRegistry,
    relations: ICEIndustrialRelationGraph,
    getState: (
      entityId: string,
      propertyId: string,
    ) => ICEIndustrialPropertyValue | undefined,
  ) {
    this.#entities = entities;
    this.#relations = relations;
    this.#getState = getState;
    const propertyIdsByType = new Map<string, ReadonlySet<string>>();
    const knownPropertyIds = new Set<string>();
    for (const type of entities.types.list()) {
      const propertyIds = new Set(
        type.propertyDefinitions.map((definition) => definition.id),
      );
      propertyIdsByType.set(type.id, propertyIds);
      for (const propertyId of propertyIds) {
        knownPropertyIds.add(propertyId);
      }
    }
    this.#propertyIdsByType = propertyIdsByType;
    this.#knownPropertyIds = knownPropertyIds;
  }

  queryEntities(
    query: ICEIndustrialEntityQuery = {},
  ): readonly ICEIndustrialEntity[] {
    const filters = query.propertyFilters ?? [];
    for (const filter of filters) {
      if (!this.#knownPropertyIds.has(filter.propertyId)) {
        throw new Error(
          'ICE3_INDUSTRIAL_UNKNOWN_PROPERTY: '
          + filter.propertyId,
        );
      }
    }

    const ids = query.ids === undefined ? undefined : new Set(query.ids);
    const typeIds = query.typeIds === undefined
      ? undefined
      : new Set(query.typeIds);
    const parentIds = query.parentIds === undefined
      ? undefined
      : new Set(query.parentIds);
    const externalIds = query.externalIds;

    const matches = this.#entities.list().filter((entity) => {
      if (ids !== undefined && !ids.has(entity.id)) {
        return false;
      }
      if (typeIds !== undefined && !typeIds.has(entity.typeId)) {
        return false;
      }
      if (
        parentIds !== undefined
        && (
          entity.parentId === undefined
          || !parentIds.has(entity.parentId)
        )
      ) {
        return false;
      }
      if (
        externalIds !== undefined
        && !externalIds.some((identity) => hasIdentity(entity, identity))
      ) {
        return false;
      }
      const propertyIds = this.#propertyIdsByType.get(entity.typeId)
        ?? new Set<string>();
      return filters.every((filter) => {
        if (!propertyIds.has(filter.propertyId)) {
          return false;
        }
        const state = this.#getState(entity.id, filter.propertyId);
        if (state === undefined) {
          return false;
        }
        if (
          filter.quality !== undefined
          && state.quality !== filter.quality
        ) {
          return false;
        }
        return (
          !Object.hasOwn(filter, 'equals')
          || equalValue(state.value, filter.equals!)
        );
      });
    });
    return Object.freeze(matches);
  }
}

import type {
  ICEIndustrialEntity,
  ICEIndustrialExternalId,
} from '../manifest/ICEIndustrialManifest.js';
import { ICEIndustrialTypeRegistry } from './ICEIndustrialTypeRegistry.js';

function compareById(
  left: { readonly id: string },
  right: { readonly id: string },
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function identityKey(identity: ICEIndustrialExternalId): string {
  return JSON.stringify([
    identity.scheme,
    identity.scope ?? null,
    identity.value,
  ]);
}

function appendIndex<T>(
  index: Map<string, T[]>,
  key: string,
  value: T,
): void {
  const values = index.get(key);
  if (values === undefined) {
    index.set(key, [value]);
  } else {
    values.push(value);
  }
}

function freezeIndex<T extends { readonly id: string }>(
  index: Map<string, T[]>,
): ReadonlyMap<string, readonly T[]> {
  const frozen = new Map<string, readonly T[]>();
  for (const [key, values] of index) {
    frozen.set(key, Object.freeze([...values].sort(compareById)));
  }
  return frozen;
}

const EMPTY_ENTITIES = Object.freeze(
  [] as readonly ICEIndustrialEntity[],
);

export class ICEIndustrialEntityRegistry {
  readonly #entitiesById: ReadonlyMap<string, ICEIndustrialEntity>;
  readonly #identities: ReadonlyMap<string, ICEIndustrialEntity>;
  readonly #byType: ReadonlyMap<string, readonly ICEIndustrialEntity[]>;
  readonly #byParent: ReadonlyMap<string, readonly ICEIndustrialEntity[]>;
  readonly #entities: readonly ICEIndustrialEntity[];

  constructor(
    entities: readonly ICEIndustrialEntity[],
    types: ICEIndustrialTypeRegistry,
  ) {
    const entitiesById = new Map<string, ICEIndustrialEntity>();
    const identities = new Map<string, ICEIndustrialEntity>();
    const byType = new Map<string, ICEIndustrialEntity[]>();
    const byParent = new Map<string, ICEIndustrialEntity[]>();

    for (const entity of entities) {
      if (entitiesById.has(entity.id)) {
        throw new Error(
          `ICE3_INDUSTRIAL_DUPLICATE_ENTITY: ${entity.id}`,
        );
      }
      if (types.get(entity.typeId) === undefined) {
        throw new Error(
          `ICE3_INDUSTRIAL_UNKNOWN_TYPE: ${entity.typeId}`,
        );
      }
      entitiesById.set(entity.id, entity);
      appendIndex(byType, entity.typeId, entity);
      if (entity.parentId !== undefined) {
        appendIndex(byParent, entity.parentId, entity);
      }
      for (const identity of entity.externalIds) {
        const key = identityKey(identity);
        const owner = identities.get(key);
        if (owner !== undefined) {
          throw new Error(
            'ICE3_INDUSTRIAL_IDENTITY_CONFLICT: '
            + `"${owner.id}" and "${entity.id}"`,
          );
        }
        identities.set(key, entity);
      }
    }

    this.#entitiesById = entitiesById;
    this.#identities = identities;
    this.#byType = freezeIndex(byType);
    this.#byParent = freezeIndex(byParent);
    this.#entities = Object.freeze(
      [...entitiesById.values()].sort(compareById),
    );
  }

  get(id: string): ICEIndustrialEntity | undefined {
    return this.#entitiesById.get(id);
  }

  require(id: string): ICEIndustrialEntity {
    const entity = this.get(id);
    if (entity === undefined) {
      throw new Error(`ICE3_INDUSTRIAL_UNKNOWN_ENTITY: ${id}`);
    }
    return entity;
  }

  findByExternalId(
    scheme: string,
    value: string,
    scope?: string,
  ): ICEIndustrialEntity | undefined {
    return this.#identities.get(JSON.stringify([
      scheme,
      scope ?? null,
      value,
    ]));
  }

  byType(typeId: string): readonly ICEIndustrialEntity[] {
    return this.#byType.get(typeId) ?? EMPTY_ENTITIES;
  }

  children(parentId: string): readonly ICEIndustrialEntity[] {
    return this.#byParent.get(parentId) ?? EMPTY_ENTITIES;
  }

  list(): readonly ICEIndustrialEntity[] {
    return this.#entities;
  }
}

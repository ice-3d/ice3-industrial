import type {
  ICEIndustrialRelation,
} from '../manifest/ICEIndustrialManifest.js';

export interface ICEIndustrialRelationQuery {
  readonly direction?: 'outgoing' | 'incoming' | 'both';
  readonly types?: readonly string[];
  readonly maxDepth?: number;
}

function compareRelations(
  left: ICEIndustrialRelation,
  right: ICEIndustrialRelation,
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function invalid(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_INVALID_RELATION: ${detail}`);
}

function addIndex(
  index: Map<string, ICEIndustrialRelation[]>,
  entityId: string,
  relation: ICEIndustrialRelation,
): void {
  const values = index.get(entityId);
  if (values === undefined) {
    index.set(entityId, [relation]);
  } else {
    values.push(relation);
  }
}

function freezeIndex(
  index: Map<string, ICEIndustrialRelation[]>,
): ReadonlyMap<string, readonly ICEIndustrialRelation[]> {
  const frozen = new Map<string, readonly ICEIndustrialRelation[]>();
  for (const [entityId, relations] of index) {
    frozen.set(
      entityId,
      Object.freeze([...relations].sort(compareRelations)),
    );
  }
  return frozen;
}

const EMPTY_RELATIONS = Object.freeze(
  [] as readonly ICEIndustrialRelation[],
);

export class ICEIndustrialRelationGraph {
  readonly #outgoing: ReadonlyMap<
    string,
    readonly ICEIndustrialRelation[]
  >;
  readonly #incoming: ReadonlyMap<
    string,
    readonly ICEIndustrialRelation[]
  >;

  constructor(relations: readonly ICEIndustrialRelation[]) {
    const outgoing = new Map<string, ICEIndustrialRelation[]>();
    const incoming = new Map<string, ICEIndustrialRelation[]>();
    const ids = new Set<string>();

    for (const relation of relations) {
      if (ids.has(relation.id)) {
        invalid(`duplicate relation id "${relation.id}"`);
      }
      ids.add(relation.id);
      if (
        relation.id.trim().length === 0
        || relation.type.trim().length === 0
        || relation.fromEntityId.trim().length === 0
        || relation.toEntityId.trim().length === 0
      ) {
        invalid('relation identifiers and endpoints must not be empty');
      }
      if (typeof relation.directed !== 'boolean') {
        invalid('relation.directed must be a boolean');
      }
      addIndex(outgoing, relation.fromEntityId, relation);
      addIndex(incoming, relation.toEntityId, relation);
      if (!relation.directed) {
        addIndex(outgoing, relation.toEntityId, relation);
        addIndex(incoming, relation.fromEntityId, relation);
      }
    }

    this.#outgoing = freezeIndex(outgoing);
    this.#incoming = freezeIndex(incoming);
  }

  related(
    entityId: string,
    query: ICEIndustrialRelationQuery = {},
  ): readonly ICEIndustrialRelation[] {
    if (entityId.trim().length === 0) {
      invalid('entityId must not be empty');
    }
    const direction = query.direction ?? 'outgoing';
    if (!['outgoing', 'incoming', 'both'].includes(direction)) {
      invalid(`unsupported direction "${String(direction)}"`);
    }
    const types = query.types === undefined
      ? undefined
      : new Set(query.types);
    const candidates: ICEIndustrialRelation[] = [];
    if (direction === 'outgoing' || direction === 'both') {
      candidates.push(...(this.#outgoing.get(entityId) ?? EMPTY_RELATIONS));
    }
    if (direction === 'incoming' || direction === 'both') {
      candidates.push(...(this.#incoming.get(entityId) ?? EMPTY_RELATIONS));
    }

    const unique = new Map<string, ICEIndustrialRelation>();
    for (const relation of candidates) {
      if (types === undefined || types.has(relation.type)) {
        unique.set(relation.id, relation);
      }
    }
    return Object.freeze(
      [...unique.values()].sort(compareRelations),
    );
  }

  reachable(
    entityId: string,
    query: ICEIndustrialRelationQuery = {},
  ): readonly string[] {
    const maxDepth = query.maxDepth ?? 1;
    if (!Number.isInteger(maxDepth) || maxDepth < 0) {
      invalid('maxDepth must be a non-negative integer');
    }
    const visited = new Set<string>([entityId]);
    let frontier = [entityId];

    for (let depth = 0; depth < maxDepth; depth += 1) {
      const next = new Set<string>();
      for (const current of frontier) {
        for (const relation of this.related(current, query)) {
          const other = relation.fromEntityId === current
            ? relation.toEntityId
            : relation.fromEntityId;
          if (!visited.has(other)) {
            visited.add(other);
            next.add(other);
          }
        }
      }
      frontier = [...next].sort();
      if (frontier.length === 0) {
        break;
      }
    }
    return Object.freeze([...visited].sort());
  }
}

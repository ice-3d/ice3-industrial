import type {
  ICEIndustrialEntityType,
} from '../manifest/ICEIndustrialManifest.js';

function compareById(
  left: { readonly id: string },
  right: { readonly id: string },
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class ICEIndustrialTypeRegistry {
  readonly #typesById: ReadonlyMap<string, ICEIndustrialEntityType>;
  readonly #types: readonly ICEIndustrialEntityType[];

  constructor(types: readonly ICEIndustrialEntityType[]) {
    const typesById = new Map<string, ICEIndustrialEntityType>();
    for (const type of types) {
      if (typesById.has(type.id)) {
        throw new Error(
          `ICE3_INDUSTRIAL_DUPLICATE_TYPE: ${type.id}`,
        );
      }
      typesById.set(type.id, type);
    }
    this.#typesById = typesById;
    this.#types = Object.freeze([...typesById.values()].sort(compareById));
  }

  get(id: string): ICEIndustrialEntityType | undefined {
    return this.#typesById.get(id);
  }

  require(id: string): ICEIndustrialEntityType {
    const type = this.get(id);
    if (type === undefined) {
      throw new Error(`ICE3_INDUSTRIAL_UNKNOWN_TYPE: ${id}`);
    }
    return type;
  }

  list(): readonly ICEIndustrialEntityType[] {
    return this.#types;
  }
}

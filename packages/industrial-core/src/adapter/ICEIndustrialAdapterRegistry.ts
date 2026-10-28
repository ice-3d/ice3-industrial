import type {
  ICEIndustrialAssetAdapter,
} from './ICEIndustrialAssetAdapter.js';

function failed(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_ADAPTER_FAILED: ${detail}`);
}

export class ICEIndustrialAdapterRegistry {
  readonly #adapters = new Map<string, ICEIndustrialAssetAdapter>();

  register(adapter: ICEIndustrialAssetAdapter): void {
    if (
      adapter === null
      || typeof adapter !== 'object'
      || typeof adapter.id !== 'string'
      || adapter.id.trim().length === 0
      || typeof adapter.import !== 'function'
      || typeof adapter.export !== 'function'
    ) {
      failed('adapter must define an id, import, and export');
    }
    if (this.#adapters.has(adapter.id)) {
      failed(`adapter "${adapter.id}" is already registered`);
    }
    this.#adapters.set(adapter.id, adapter);
  }

  unregister(id: string): void {
    this.#adapters.delete(id);
  }

  get(id: string): ICEIndustrialAssetAdapter | undefined {
    return this.#adapters.get(id);
  }

  require(id: string): ICEIndustrialAssetAdapter {
    const adapter = this.get(id);
    if (adapter === undefined) {
      failed(`unknown adapter "${id}"`);
    }
    return adapter;
  }
}

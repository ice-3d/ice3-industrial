import type {
  ICEIndustrialWorkspaceManifest,
} from '../manifest/ICEIndustrialManifest.js';

export interface ICEIndustrialAssetAdapter {
  readonly id: string;
  import(
    source: Uint8Array | string,
    options?: Readonly<Record<string, unknown>>,
  ): Promise<ICEIndustrialWorkspaceManifest>;
  export(
    manifest: ICEIndustrialWorkspaceManifest,
    options?: Readonly<Record<string, unknown>>,
  ): Promise<Uint8Array | string>;
}

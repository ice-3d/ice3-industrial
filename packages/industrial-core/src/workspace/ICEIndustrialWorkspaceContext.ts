import type {
  ICEIndustrialExternalId,
} from '../manifest/ICEIndustrialManifest.js';

export interface ICEIndustrialFilter {
  readonly id: string;
  readonly entityIds?: readonly string[];
  readonly typeIds?: readonly string[];
  readonly externalIds?: readonly ICEIndustrialExternalId[];
}

export interface ICEIndustrialTimeRange {
  readonly start?: number;
  readonly end?: number;
}

export interface ICEIndustrialWorkspaceContext {
  readonly selection: readonly string[];
  readonly hiddenEntityIds: readonly string[];
  readonly isolatedEntityIds: readonly string[];
  readonly highlightedEntityIds: readonly string[];
  readonly filters: readonly ICEIndustrialFilter[];
  readonly timeRange?: ICEIndustrialTimeRange;
}

export function emptyWorkspaceContext(): ICEIndustrialWorkspaceContext {
  return Object.freeze({
    selection: Object.freeze([]),
    hiddenEntityIds: Object.freeze([]),
    isolatedEntityIds: Object.freeze([]),
    highlightedEntityIds: Object.freeze([]),
    filters: Object.freeze([]),
  });
}

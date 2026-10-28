import type {
  ICEIndustrialValue,
} from '../manifest/ICEIndustrialManifest.js';

export type ICEIndustrialQuality = 'good' | 'uncertain' | 'bad';

export interface ICEIndustrialPropertyValue {
  readonly entityId: string;
  readonly propertyId: string;
  readonly value: ICEIndustrialValue;
  readonly quality: ICEIndustrialQuality;
  readonly sourceTimestamp?: number;
  readonly serverTimestamp?: number;
  readonly source?: string;
}

export interface ICEIndustrialStatePatch {
  readonly entityId: string;
  readonly propertyId: string;
  readonly value: ICEIndustrialValue;
  readonly quality: ICEIndustrialQuality;
  readonly sourceTimestamp?: number;
  readonly serverTimestamp?: number;
  readonly source?: string;
}

export interface ICEIndustrialStateChange {
  readonly current: ICEIndustrialPropertyValue;
  readonly previous?: ICEIndustrialPropertyValue;
}

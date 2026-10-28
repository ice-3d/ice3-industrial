import type {
  ICEIndustrialWorkspaceManifest,
} from '../manifest/ICEIndustrialManifest.js';
import {
  parseIndustrialManifest,
} from '../manifest/parseIndustrialManifest.js';
import {
  serializeIndustrialWorkspace,
} from '../workspace/serializeIndustrialWorkspace.js';
import type {
  ICEIndustrialAssetAdapter,
} from './ICEIndustrialAssetAdapter.js';

function failed(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_ADAPTER_FAILED: ${detail}`);
}

function continuation(byte: number): boolean {
  return (byte & 0xc0) === 0x80;
}

function decodeUtf8(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index]!;
    if (first <= 0x7f) {
      output += String.fromCodePoint(first);
      index += 1;
      continue;
    }
    if (first >= 0xc2 && first <= 0xdf) {
      const second = bytes[index + 1];
      if (second === undefined || !continuation(second)) {
        failed('source is not valid UTF-8');
      }
      output += String.fromCodePoint(
        ((first & 0x1f) << 6) | (second & 0x3f),
      );
      index += 2;
      continue;
    }
    if (first >= 0xe0 && first <= 0xef) {
      const second = bytes[index + 1];
      const third = bytes[index + 2];
      if (
        second === undefined
        || third === undefined
        || !continuation(second)
        || !continuation(third)
        || (first === 0xe0 && second < 0xa0)
        || (first === 0xed && second > 0x9f)
      ) {
        failed('source is not valid UTF-8');
      }
      output += String.fromCodePoint(
        ((first & 0x0f) << 12)
        | ((second & 0x3f) << 6)
        | (third & 0x3f),
      );
      index += 3;
      continue;
    }
    if (first >= 0xf0 && first <= 0xf4) {
      const second = bytes[index + 1];
      const third = bytes[index + 2];
      const fourth = bytes[index + 3];
      if (
        second === undefined
        || third === undefined
        || fourth === undefined
        || !continuation(second)
        || !continuation(third)
        || !continuation(fourth)
        || (first === 0xf0 && second < 0x90)
        || (first === 0xf4 && second > 0x8f)
      ) {
        failed('source is not valid UTF-8');
      }
      output += String.fromCodePoint(
        ((first & 0x07) << 18)
        | ((second & 0x3f) << 12)
        | ((third & 0x3f) << 6)
        | (fourth & 0x3f),
      );
      index += 4;
      continue;
    }
    failed('source is not valid UTF-8');
  }
  return output;
}

export const iceJsonAdapter: ICEIndustrialAssetAdapter = Object.freeze({
  id: 'ice-json',

  async import(
    source: Uint8Array | string,
  ): Promise<ICEIndustrialWorkspaceManifest> {
    try {
      const text = typeof source === 'string'
        ? source
        : source instanceof Uint8Array
          ? decodeUtf8(source)
          : failed('source must be a string or Uint8Array');
      return parseIndustrialManifest(JSON.parse(text));
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith('ICE3_INDUSTRIAL_ADAPTER_FAILED:')
      ) {
        throw error;
      }
      failed('native JSON import failed');
    }
  },

  async export(
    manifest: ICEIndustrialWorkspaceManifest,
  ): Promise<string> {
    try {
      return serializeIndustrialWorkspace(manifest);
    } catch {
      failed('native JSON export failed');
    }
  },
});

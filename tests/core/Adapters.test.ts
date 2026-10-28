import { expect, test } from 'node-test';
import {
  ICEIndustrialAdapterRegistry,
  iceJsonAdapter,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import type {
  ICEIndustrialAssetAdapter,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

test('imports and exports native ICE JSON deterministically', async () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const imported = await iceJsonAdapter.import(JSON.stringify(manifest));
  const exported = await iceJsonAdapter.export(manifest);

  expect(imported.workspaceId).toBe(manifest.workspaceId);
  expect(typeof exported).toBe('string');
  expect(await iceJsonAdapter.import(exported)).toEqual(manifest);
  expect(await iceJsonAdapter.export(manifest)).toBe(exported);
});

test('imports UTF-8 byte sources', async () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const source = new TextEncoder().encode(JSON.stringify(manifest));

  expect((await iceJsonAdapter.import(source)).entities[0]?.id)
    .toBe('pump-01');
});

test('wraps malformed input and manifest errors as adapter failures', async () => {
  await expect(iceJsonAdapter.import('{not-json'))
    .rejects.toThrow(/ICE3_INDUSTRIAL_ADAPTER_FAILED/);
  await expect(iceJsonAdapter.import('{}'))
    .rejects.toThrow(/ICE3_INDUSTRIAL_ADAPTER_FAILED/);
  await expect(iceJsonAdapter.import(42 as never))
    .rejects.toThrow(/ICE3_INDUSTRIAL_ADAPTER_FAILED/);
});

test('manages adapter registration with stable diagnostics', () => {
  const adapter: ICEIndustrialAssetAdapter = {
    id: 'example',
    async import() {
      return parseIndustrialManifest(manifestFixture());
    },
    async export() {
      return '{}';
    },
  };
  const registry = new ICEIndustrialAdapterRegistry();

  registry.register(adapter);
  expect(registry.get('example')).toBe(adapter);
  expect(() => registry.register(adapter))
    .toThrow(/ICE3_INDUSTRIAL_ADAPTER_FAILED/);
  registry.unregister('example');
  expect(registry.get('example')).toBeUndefined();
  expect(() => registry.require('missing'))
    .toThrow(/ICE3_INDUSTRIAL_ADAPTER_FAILED/);
});

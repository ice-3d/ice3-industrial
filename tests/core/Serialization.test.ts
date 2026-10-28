import { test } from 'node:test';
import { expect } from '#test-expect';
import {
  parseIndustrialManifest,
  serializeIndustrialWorkspace,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

test('serializes a manifest deterministically and round-trips it', () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const first = serializeIndustrialWorkspace(manifest);
  const second = serializeIndustrialWorkspace(manifest);

  expect(first).toBe(second);
  expect(first.endsWith('\n')).toBe(true);
  expect(first).toContain('\n  "entities"');
  expect(parseIndustrialManifest(JSON.parse(first))).toEqual(manifest);
});

test('is independent of object-key insertion order', () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const reordered = parseIndustrialManifest(JSON.parse(
    JSON.stringify(manifest, (_key, value) => {
      if (
        value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
      ) {
        return Object.fromEntries(Object.entries(value).reverse());
      }
      return value;
    }),
  ));

  expect(serializeIndustrialWorkspace(reordered))
    .toBe(serializeIndustrialWorkspace(manifest));
});

test('contains only the static workspace contract', () => {
  const serialized = serializeIndustrialWorkspace(
    parseIndustrialManifest(manifestFixture()),
  );
  const value = JSON.parse(serialized);

  expect(Object.keys(value)).toEqual([
    'assetIds',
    'entities',
    'entityTypes',
    'relations',
    'version',
    'workspaceId',
  ]);
  expect(serialized).not.toContain('"state"');
  expect(serialized).not.toContain('"context"');
});

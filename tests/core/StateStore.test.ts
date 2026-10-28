import { expect, test } from 'node-test';
import {
  ICEIndustrialEntityRegistry,
  ICEIndustrialQuery,
  ICEIndustrialRelationGraph,
  ICEIndustrialStateStore,
  ICEIndustrialTypeRegistry,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import type {
  ICEIndustrialStateChange,
  ICEIndustrialStatePatch,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

function stateFixture() {
  const manifest = parseIndustrialManifest(manifestFixture());
  const types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    manifest.entities,
    types,
  );
  const scheduled: Array<() => void> = [];
  const store = new ICEIndustrialStateStore(
    entities,
    types,
    (callback) => scheduled.push(callback),
  );
  return { entities, types, store, scheduled, manifest };
}

function patch(
  value: Partial<ICEIndustrialStatePatch> = {},
): ICEIndustrialStatePatch {
  return {
    entityId: 'pump-01',
    propertyId: 'running',
    value: true,
    quality: 'good',
    ...value,
  };
}

test('coalesces high-frequency updates and notifies the latest value once', () => {
  const { store, scheduled } = stateFixture();
  const notifications: ICEIndustrialStateChange[][] = [];
  store.subscribe((next) => notifications.push([...next]));

  store.update([patch({
    value: true,
    sourceTimestamp: 10,
    source: 'edge',
  })]);
  store.update([patch({
    value: false,
    sourceTimestamp: 20,
    source: 'edge',
  })]);

  expect(store.get('pump-01', 'running')?.value).toBe(false);
  expect(scheduled).toHaveLength(1);
  expect(notifications).toHaveLength(0);
  scheduled.shift()!();
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toHaveLength(1);
  expect(notifications[0]![0]!.current.value).toBe(false);
});

test('keeps the newest timestamp and counts stale patches', () => {
  const { store, scheduled } = stateFixture();
  store.update([patch({
    value: true,
    sourceTimestamp: 20,
    source: 'edge-a',
  })]);
  scheduled.shift()!();

  store.update([patch({
    value: false,
    sourceTimestamp: 10,
    source: 'edge-b',
  })]);
  store.update([patch({
    value: false,
    sourceTimestamp: 20,
    source: 'edge-b',
  })]);
  store.update([patch({
    value: false,
    sourceTimestamp: 20,
    source: 'edge-a',
  })]);

  expect(store.get('pump-01', 'running')?.value).toBe(false);
  expect(store.diagnostics.ignoredStalePatches).toBe(2);
  scheduled.shift()!();
});

test('rejects an invalid batch without applying any patch', () => {
  const { store } = stateFixture();

  expect(() => store.update([
    patch({ propertyId: 'mode', value: 'auto' }),
    patch({ value: 'not-a-boolean' }),
  ])).toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);

  expect(store.get('pump-01', 'mode')).toBeUndefined();
  expect(store.get('pump-01', 'running')).toBeUndefined();
});

test('rejects unknown entities, unknown properties, and invalid metadata', () => {
  const { store } = stateFixture();

  expect(() => store.update([patch({ entityId: 'missing' })]))
    .toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);
  expect(() => store.update([patch({ propertyId: 'missing' })]))
    .toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);
  expect(() => store.update([patch({ quality: 'unknown' as never })]))
    .toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);
  expect(() => store.update([patch({ sourceTimestamp: Number.NaN })]))
    .toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);
});

test('keeps bad-quality values queryable and returns a detached snapshot', () => {
  const { store, types, entities, manifest, scheduled } = stateFixture();
  store.update([
    patch({ value: true, quality: 'bad' }),
    patch({ propertyId: 'mode', value: 'auto' }),
  ]);
  scheduled.shift()!();

  const query = new ICEIndustrialQuery(
    entities,
    new ICEIndustrialRelationGraph(manifest.relations),
    (entityId, propertyId) => store.get(entityId, propertyId),
  );
  expect(query.queryEntities({
    propertyFilters: [{
      propertyId: 'running',
      equals: true,
      quality: 'bad',
    }],
  }).map((entity) => entity.id)).toEqual(['pump-01']);

  const snapshot = store.snapshot();
  expect(snapshot).toHaveLength(2);
  expect(Object.isFrozen(store.get('pump-01', 'mode'))).toBe(true);
  expect(types.require('pump').propertyDefinitions).toHaveLength(2);
});

test('unsubscribes cleanly and rejects updates after disposal', () => {
  const { store, scheduled } = stateFixture();
  let calls = 0;
  const unsubscribe = store.subscribe(() => {
    calls += 1;
  });
  store.update([patch()]);
  unsubscribe();
  scheduled.shift()!();
  expect(calls).toBe(0);

  store.dispose();
  expect(() => store.update([patch()]))
    .toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);
  expect(() => store.subscribe(() => undefined))
    .toThrow(/ICE3_INDUSTRIAL_STATE_INVALID/);
});

import { test } from 'node:test';
import { expect } from '#test-expect';
import {
  ICEIndustrialEntityRegistry,
  ICEIndustrialQuery,
  ICEIndustrialRelationGraph,
  ICEIndustrialTypeRegistry,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import type {
  ICEIndustrialPropertyValue,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

function queryFixture() {
  const manifest = parseIndustrialManifest(manifestFixture());
  const types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    manifest.entities,
    types,
  );
  const relations = new ICEIndustrialRelationGraph(manifest.relations);
  const state = new Map<string, ICEIndustrialPropertyValue>([
    ['pump-01/running', {
      entityId: 'pump-01',
      propertyId: 'running',
      value: true,
      quality: 'good',
      sourceTimestamp: 10,
    }],
    ['pump-01/mode', {
      entityId: 'pump-01',
      propertyId: 'mode',
      value: 'manual',
      quality: 'uncertain',
      sourceTimestamp: 10,
    }],
  ]);
  const query = new ICEIndustrialQuery(
    entities,
    relations,
    (entityId, propertyId) => state.get(`${entityId}/${propertyId}`),
  );
  return { entities, query };
}

test('returns all entities in stable ID order without a query', () => {
  const { query } = queryFixture();

  expect(query.queryEntities().map((entity) => entity.id))
    .toEqual(['pump-01', 'valve-01']);
  expect(Object.isFrozen(query.queryEntities())).toBe(true);
});

test('filters by ids, types, parents, and external identities', () => {
  const manifest = manifestFixture();
  manifest.entities[0]!.parentId = 'valve-01';
  const parsed = parseIndustrialManifest(manifest);
  const types = new ICEIndustrialTypeRegistry(parsed.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    parsed.entities,
    types,
  );
  const query = new ICEIndustrialQuery(
    entities,
    new ICEIndustrialRelationGraph(parsed.relations),
    () => undefined,
  );

  expect(query.queryEntities({
    ids: ['pump-01', 'pump-01'],
    typeIds: ['pump'],
    parentIds: ['valve-01'],
    externalIds: [{
      scheme: 'aas',
      value: 'urn:asset:pump-01',
    }],
  }).map((entity) => entity.id)).toEqual(['pump-01']);
  expect(query.queryEntities({ ids: ['missing'] })).toEqual([]);
  expect(query.queryEntities({
    externalIds: [{ scheme: 'aas', value: 'urn:asset:missing' }],
  })).toEqual([]);
});

test('filters values and quality through the supplied state lookup', () => {
  const { query } = queryFixture();

  expect(query.queryEntities({
    typeIds: ['pump'],
    propertyFilters: [{
      propertyId: 'running',
      equals: true,
      quality: 'good',
    }],
  }).map((entity) => entity.id)).toEqual(['pump-01']);
  expect(query.queryEntities({
    propertyFilters: [{
      propertyId: 'running',
      equals: false,
    }],
  })).toEqual([]);
  expect(query.queryEntities({
    propertyFilters: [{
      propertyId: 'mode',
      equals: 'manual',
      quality: 'uncertain',
    }],
  }).map((entity) => entity.id)).toEqual(['pump-01']);
});

test('rejects unknown properties and remains deterministic', () => {
  const { query } = queryFixture();

  expect(() => query.queryEntities({
    propertyFilters: [{ propertyId: 'missing', equals: 1 }],
  })).toThrow(/ICE3_INDUSTRIAL_UNKNOWN_PROPERTY/);

  const first = query.queryEntities({
    ids: ['valve-01', 'pump-01'],
  });
  const second = query.queryEntities({
    ids: ['pump-01', 'valve-01'],
  });
  expect(first).toEqual(second);
});

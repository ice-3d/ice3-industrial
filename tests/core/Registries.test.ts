import { test } from 'node:test';
import { expect } from '#test-expect';
import {
  ICEIndustrialEntityRegistry,
  ICEIndustrialTypeRegistry,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

function hierarchicalManifest() {
  const manifest = manifestFixture();
  manifest.entityTypes.push({
    id: 'plant',
    label: 'Plant',
    propertyDefinitions: [],
    operationDefinitions: [],
  });
  manifest.entities.unshift({
    id: 'plant-01',
    typeId: 'plant',
    displayName: 'Plant 01',
    externalIds: [],
  });
  manifest.entities[1]!.parentId = 'plant-01';
  manifest.entities[2]!.parentId = 'plant-01';
  return parseIndustrialManifest(manifest);
}

test('indexes entities, types, parents, and external identities', () => {
  const manifest = hierarchicalManifest();
  const types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    manifest.entities,
    types,
  );

  expect(types.require('pump').label).toBe('Pump');
  expect(entities.require('pump-01').displayName).toBe('Pump 01');
  expect(entities.findByExternalId('aas', 'urn:asset:pump-01')?.id)
    .toBe('pump-01');
  expect(entities.byType('pump').map((entity) => entity.id))
    .toEqual(['pump-01']);
  expect(entities.children('plant-01').map((entity) => entity.id))
    .toEqual(['pump-01', 'valve-01']);
});

test('reports unknown registry members with stable diagnostics', () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    manifest.entities,
    types,
  );

  expect(() => types.require('missing'))
    .toThrow(/ICE3_INDUSTRIAL_UNKNOWN_TYPE/);
  expect(() => entities.require('missing'))
    .toThrow(/ICE3_INDUSTRIAL_UNKNOWN_ENTITY/);
  expect(entities.get('missing')).toBeUndefined();
  expect(entities.findByExternalId('aas', 'missing')).toBeUndefined();
});

test('returns frozen snapshots sorted independently of insertion order', () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const types = new ICEIndustrialTypeRegistry(
    [...manifest.entityTypes].reverse(),
  );
  const entities = new ICEIndustrialEntityRegistry(
    [...manifest.entities].reverse(),
    types,
  );

  expect(types.list().map((type) => type.id)).toEqual(['pump', 'valve']);
  expect(entities.list().map((entity) => entity.id))
    .toEqual(['pump-01', 'valve-01']);
  expect(Object.isFrozen(types.list())).toBe(true);
  expect(Object.isFrozen(entities.list())).toBe(true);
  expect(Object.isFrozen(entities.byType('pump'))).toBe(true);
  expect(Object.isFrozen(entities.children('missing'))).toBe(true);
});

test('rejects duplicate ids and external identities at construction', () => {
  const manifest = parseIndustrialManifest(manifestFixture());

  expect(() => new ICEIndustrialTypeRegistry([
    manifest.entityTypes[0]!,
    manifest.entityTypes[0]!,
  ])).toThrow(/ICE3_INDUSTRIAL_DUPLICATE_TYPE/);

  const types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
  expect(() => new ICEIndustrialEntityRegistry([
    manifest.entities[0]!,
    manifest.entities[0]!,
  ], types)).toThrow(/ICE3_INDUSTRIAL_DUPLICATE_ENTITY/);

  const conflictingEntity = {
    ...manifest.entities[1]!,
    externalIds: [...manifest.entities[0]!.externalIds],
  };
  expect(() => new ICEIndustrialEntityRegistry([
    manifest.entities[0]!,
    conflictingEntity,
  ], types)).toThrow(/ICE3_INDUSTRIAL_IDENTITY_CONFLICT/);
});

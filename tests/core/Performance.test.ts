import { expect, test } from 'node-test';
import {
  ICEIndustrialEntityRegistry,
  ICEIndustrialQuery,
  ICEIndustrialRelationGraph,
  ICEIndustrialStateStore,
  ICEIndustrialTypeRegistry,
  ICEIndustrialWorkspace,
  parseIndustrialManifest,
  serializeIndustrialWorkspace,
} from '../../packages/industrial-core/src/index.js';
import type {
  ICEIndustrialEntity,
  ICEIndustrialEntityType,
  ICEIndustrialRelation,
  ICEIndustrialStatePatch,
} from '../../packages/industrial-core/src/index.js';

const TYPE_COUNT = 20;
const ENTITY_COUNT = 10_000;
const PROPERTY_COUNT_PER_TYPE = 2_500;
const PATCH_COUNT = 100_000;

function padded(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function performanceFixture() {
  const propertyDefinitions = Array.from(
    { length: PROPERTY_COUNT_PER_TYPE },
    (_, index) => ({
      id: `property-${padded(index, 4)}`,
      label: `Property ${index}`,
      dataType: 'number' as const,
      readable: true,
      writable: false,
    }),
  );
  const entityTypes: ICEIndustrialEntityType[] = Array.from(
    { length: TYPE_COUNT },
    (_, index) => ({
      id: `type-${padded(index, 2)}`,
      label: `Type ${index}`,
      propertyDefinitions,
      operationDefinitions: [],
    }),
  );
  const entities: ICEIndustrialEntity[] = Array.from(
    { length: ENTITY_COUNT },
    (_, index) => ({
      id: `entity-${padded(index, 5)}`,
      typeId: `type-${padded(index % TYPE_COUNT, 2)}`,
      displayName: `Entity ${index}`,
      externalIds: [{
        scheme: 'perf',
        value: `identity-${index}`,
      }],
    }),
  );
  const relations: ICEIndustrialRelation[] = Array.from(
    { length: ENTITY_COUNT - 1 },
    (_, index) => ({
      id: `relation-${padded(index, 5)}`,
      type: 'ice:connectedTo',
      fromEntityId: entities[index]!.id,
      toEntityId: entities[index + 1]!.id,
      directed: true,
    }),
  );
  const patches: ICEIndustrialStatePatch[] = [];
  for (let entityIndex = 0; entityIndex < ENTITY_COUNT; entityIndex += 1) {
    for (let update = 0; update < 10; update += 1) {
      patches.push({
        entityId: `entity-${padded(entityIndex, 5)}`,
        propertyId: `property-${padded(entityIndex % 100, 4)}`,
        value: entityIndex + update / 100,
        quality: 'good',
        sourceTimestamp: update,
        source: 'perf',
      });
    }
  }
  return {
    manifest: {
      version: '1.0' as const,
      workspaceId: 'performance-workspace',
      assetIds: ['performance-asset'],
      entityTypes,
      entities,
      relations,
    },
    patches,
  };
}

test('handles the production-scale synthetic core fixture', {
  timeout: 60_000,
}, () => {
  const fixture = performanceFixture();
  expect(fixture.manifest.entities).toHaveLength(ENTITY_COUNT);
  expect(fixture.manifest.entityTypes).toHaveLength(TYPE_COUNT);
  expect(fixture.manifest.entityTypes.flatMap(
    (type) => type.propertyDefinitions,
  )).toHaveLength(TYPE_COUNT * PROPERTY_COUNT_PER_TYPE);
  expect(fixture.patches).toHaveLength(PATCH_COUNT);

  const manifest = parseIndustrialManifest(fixture.manifest);
  const types = new ICEIndustrialTypeRegistry(manifest.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    manifest.entities,
    types,
  );
  const relations = new ICEIndustrialRelationGraph(manifest.relations);
  const scheduled: Array<() => void> = [];
  const state = new ICEIndustrialStateStore(
    entities,
    types,
    (callback) => scheduled.push(callback),
  );
  const query = new ICEIndustrialQuery(
    entities,
    relations,
    (entityId, propertyId) => state.get(entityId, propertyId),
  );

  expect(entities.require('entity-09999').displayName)
    .toBe('Entity 9999');
  expect(entities.findByExternalId('perf', 'identity-5000')?.id)
    .toBe('entity-05000');
  expect(query.queryEntities({ typeIds: ['type-00'] })).toHaveLength(500);
  expect(relations.reachable('entity-05000', {
    direction: 'outgoing',
    maxDepth: 3,
  })).toEqual([
    'entity-05000',
    'entity-05001',
    'entity-05002',
    'entity-05003',
  ]);

  state.update(fixture.patches);
  expect(scheduled).toHaveLength(1);
  scheduled.shift()!();
  expect(state.snapshot().size).toBe(ENTITY_COUNT);
  expect(query.queryEntities({
    propertyFilters: [{
      propertyId: 'property-0000',
      equals: 5000.09,
      quality: 'good',
    }],
  }).map((entity) => entity.id)).toEqual(['entity-05000']);

  const serialized = serializeIndustrialWorkspace(manifest);
  expect(serialized.length).toBeGreaterThan(1_000_000);
  expect(JSON.parse(serialized).entities).toHaveLength(ENTITY_COUNT);
});

test('workspace composes the same scale without eager state copies', () => {
  const fixture = performanceFixture();
  const scheduled: Array<() => void> = [];
  const workspace = new ICEIndustrialWorkspace({
    manifest: fixture.manifest,
    stateScheduler: (callback) => scheduled.push(callback),
  });

  workspace.updateProperties(fixture.patches);
  expect(scheduled).toHaveLength(1);
  scheduled.shift()!();
  expect(workspace.queryEntities().length).toBe(ENTITY_COUNT);
  workspace.dispose();
});

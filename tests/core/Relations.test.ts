import { expect, test } from 'node-test';
import {
  ICEIndustrialRelationGraph,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

function graphFixture() {
  const manifest = manifestFixture();
  manifest.entities.push(
    {
      id: 'tank-01',
      typeId: 'valve',
      displayName: 'Tank 01',
      externalIds: [],
    },
    {
      id: 'sensor-01',
      typeId: 'valve',
      displayName: 'Sensor 01',
      externalIds: [],
    },
  );
    manifest.relations.push(
    {
      id: 'rel-valve-tank',
      type: 'ext:process:downstreamOf',
      fromEntityId: 'valve-01',
      toEntityId: 'tank-01',
      directed: true,
    },
    {
      id: 'rel-tank-sensor',
      type: 'ice:connectedTo',
      fromEntityId: 'tank-01',
      toEntityId: 'sensor-01',
      directed: true,
    },
    {
      id: 'rel-sensor-pump',
      type: 'ice:connectedTo',
      fromEntityId: 'sensor-01',
      toEntityId: 'pump-01',
      directed: true,
    },
    {
      id: 'rel-undirected',
      type: 'ice:connectedTo',
      fromEntityId: 'sensor-01',
      toEntityId: 'valve-01',
      directed: false,
    },
  );
  return new ICEIndustrialRelationGraph(
    parseIndustrialManifest(manifest).relations,
  );
}

test('finds direct incoming and outgoing relations', () => {
  const graph = graphFixture();

  expect(graph.related('pump-01').map((relation) => relation.id))
    .toEqual(['rel-pump-valve']);
  expect(graph.related('valve-01', { direction: 'incoming' })
    .map((relation) => relation.id))
    .toEqual(['rel-pump-valve', 'rel-undirected']);
  expect(graph.related('sensor-01', {
    direction: 'both',
    types: ['ice:connectedTo'],
  }).map((relation) => relation.id)).toEqual([
    'rel-sensor-pump',
    'rel-tank-sensor',
    'rel-undirected',
  ]);
});

test('traverses cycles deterministically and bounds depth', () => {
  const graph = graphFixture();

  expect(graph.reachable('pump-01', {
    direction: 'both',
    maxDepth: 2,
  })).toEqual(['pump-01', 'sensor-01', 'tank-01', 'valve-01']);
  expect(graph.reachable('pump-01', {
    direction: 'both',
    maxDepth: 10,
  })).toEqual([
    'pump-01',
    'sensor-01',
    'tank-01',
    'valve-01',
  ]);
  expect(graph.reachable('pump-01', { maxDepth: 0 }))
    .toEqual(['pump-01']);
});

test('returns stable relation snapshots', () => {
  const manifest = parseIndustrialManifest(manifestFixture());
  const forward = new ICEIndustrialRelationGraph(manifest.relations);
  const reversed = new ICEIndustrialRelationGraph(
    [...manifest.relations].reverse(),
  );

  expect(forward.related('pump-01')).toEqual(reversed.related('pump-01'));
  expect(Object.isFrozen(forward.related('pump-01'))).toBe(true);
});

test('rejects duplicate relations and invalid traversal depth', () => {
  const manifest = parseIndustrialManifest(manifestFixture());

  expect(() => new ICEIndustrialRelationGraph([
    manifest.relations[0]!,
    manifest.relations[0]!,
  ])).toThrow(/ICE3_INDUSTRIAL_INVALID_RELATION/);

  const graph = new ICEIndustrialRelationGraph(manifest.relations);
  expect(() => graph.reachable('pump-01', { maxDepth: -1 }))
    .toThrow(/ICE3_INDUSTRIAL_INVALID_RELATION/);
  expect(() => graph.reachable('pump-01', { maxDepth: 1.5 }))
    .toThrow(/ICE3_INDUSTRIAL_INVALID_RELATION/);
});

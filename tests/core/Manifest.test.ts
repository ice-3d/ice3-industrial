import { it, test } from 'node:test';
import { expect } from '#test-expect';
import { parseIndustrialManifest } from
  '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

test('parses and freezes a valid workspace manifest', () => {
  const parsed = parseIndustrialManifest(manifestFixture());

  expect(parsed).toMatchObject({
    version: '1.0',
    workspaceId: 'workspace-1',
  });
  expect(parsed.entities[0]!.id).toBe('pump-01');
  expect(Object.isFrozen(parsed)).toBe(true);
  expect(Object.isFrozen(parsed.entities[0])).toBe(true);
  expect(Object.isFrozen(parsed.entityTypes[0]!.propertyDefinitions)).toBe(
    true,
  );
});

for (const [name, mutate] of [
  ['missing entity type', (m) => { m.entities[0]!.typeId = 'missing'; }],
  ['missing parent', (m) => { m.entities[0]!.parentId = 'missing'; }],
  ['dangling relation', (m) => { m.relations[0]!.toEntityId = 'missing'; }],
  ['duplicate entity', (m) => { m.entities[1]!.id = m.entities[0]!.id; }],
  ['identity conflict', (m) => {
    m.entities[1]!.externalIds = [...m.entities[0]!.externalIds];
  }],
  ['missing version', (m) => {
    Object.assign(m, { version: undefined });
  }],
  ['unsupported version', (m) => {
    Object.assign(m, { version: '2.0' });
  }],
  ['empty workspace id', (m) => { m.workspaceId = ' '; }],
  ['duplicate type', (m) => {
    Object.assign(m.entityTypes[1]!, { id: m.entityTypes[0]!.id });
  }],
  ['duplicate relation', (m) => {
    m.relations.push({ ...m.relations[0]! });
  }],
  ['duplicate property', (m) => {
    Object.assign(m.entityTypes[0]!.propertyDefinitions[1]!, {
      id: m.entityTypes[0]!.propertyDefinitions[0]!.id,
    });
  }],
  ['duplicate operation', (m) => {
    m.entityTypes[0]!.operationDefinitions.push({
      ...m.entityTypes[0]!.operationDefinitions[0]!,
    });
  }],
  ['non-finite metadata', (m) => {
    m.relations[0]!.metadata = { pressure: Number.NaN };
  }],
  ['non-serializable metadata', (m) => {
    m.relations[0]!.metadata = {
      pressure: (() => 1) as never,
    };
  }],
  ['invalid bounds', (m) => {
    m.entities[0]!.spatial!.bounds!.max = [-1, 2, 3];
  }],
  ['invalid anchor', (m) => {
    m.entities[0]!.spatial!.anchor = [0, Number.POSITIVE_INFINITY, 0];
  }],
  ['invalid unit', (m) => {
    m.entityTypes[0]!.propertyDefinitions[0]!.unit = ' ';
  }],
  ['invalid enum', (m) => {
    m.entityTypes[0]!.propertyDefinitions[1]!.enumValues = [];
  }],
  ['invalid schema', (m) => {
    m.entityTypes[0]!.operationDefinitions[0]!.inputSchema = {
      enabled: null,
    };
  }],
] as const) {
  it(`rejects ${name}`, () => {
    const manifest = manifestFixture();
    mutate(manifest);
    expect(() => parseIndustrialManifest(manifest))
      .toThrow(/ICE3_INDUSTRIAL_MANIFEST_INVALID/);
  });
}

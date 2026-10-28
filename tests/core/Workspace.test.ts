import { test } from 'node:test';
import { expect } from '#test-expect';
import {
  ICEIndustrialWorkspace,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import type {
  ICEIndustrialStateChange,
  ICEIndustrialWorkspaceContext,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

test('normalizes context and emits only material changes', () => {
  const workspace = new ICEIndustrialWorkspace({
    manifest: parseIndustrialManifest(manifestFixture()),
  });
  const contexts: ICEIndustrialWorkspaceContext[] = [];
  workspace.on('CONTEXT_CHANGE', (context) => {
    contexts.push(context as ICEIndustrialWorkspaceContext);
  });

  workspace.setSelection(['valve-01', 'pump-01', 'pump-01'], {
    source: 'scene',
  });
  expect(workspace.context.selection).toEqual(['pump-01', 'valve-01']);
  expect(contexts).toHaveLength(1);
  expect(Object.isFrozen(workspace.context)).toBe(true);
  expect(Object.isFrozen(workspace.context.selection)).toBe(true);

  workspace.setSelection(['pump-01', 'valve-01'], { source: 'list' });
  expect(contexts).toHaveLength(1);
});

test('supports hidden, isolated, highlighted, filtered, and time contexts', () => {
  const workspace = new ICEIndustrialWorkspace({
    manifest: parseIndustrialManifest(manifestFixture()),
  });

  workspace.setHidden(['valve-01']);
  workspace.setIsolated(['pump-01', 'valve-01']);
  workspace.setHighlighted(['pump-01']);
  workspace.setFilters([{
    id: 'running',
    entityIds: ['pump-01'],
    typeIds: ['pump'],
    externalIds: [{
      scheme: 'aas',
      value: 'urn:asset:pump-01',
    }],
  }]);
  workspace.setTimeRange({ start: 10, end: 20 });

  expect(workspace.context).toMatchObject({
    hiddenEntityIds: ['valve-01'],
    isolatedEntityIds: ['pump-01', 'valve-01'],
    highlightedEntityIds: ['pump-01'],
    timeRange: { start: 10, end: 20 },
  });
  expect(Object.isFrozen(workspace.context.filters[0])).toBe(true);

  workspace.resetContext();
  expect(workspace.context).toMatchObject({
    selection: [],
    hiddenEntityIds: [],
    isolatedEntityIds: [],
    highlightedEntityIds: [],
    filters: [],
  });
  expect(workspace.context.timeRange).toBeUndefined();
});

test('validates context references and time ranges', () => {
  const workspace = new ICEIndustrialWorkspace({
    manifest: parseIndustrialManifest(manifestFixture()),
  });

  expect(() => workspace.setSelection(['missing']))
    .toThrow(/ICE3_INDUSTRIAL_WORKSPACE_INVALID/);
  expect(() => workspace.setFilters([{
    id: 'missing-type',
    typeIds: ['missing'],
  }])).toThrow(/ICE3_INDUSTRIAL_WORKSPACE_INVALID/);
  expect(() => workspace.setTimeRange({ start: 20, end: 10 }))
    .toThrow(/ICE3_INDUSTRIAL_WORKSPACE_INVALID/);
});

test('bridges state and event changes through workspace subscriptions', () => {
  const scheduled: Array<() => void> = [];
  const workspace = new ICEIndustrialWorkspace({
    manifest: parseIndustrialManifest(manifestFixture()),
    stateScheduler: (callback) => scheduled.push(callback),
  });
  const stateChanges: ICEIndustrialStateChange[][] = [];
  const events: string[] = [];
  workspace.on('STATE_CHANGE', (change) => {
    stateChanges.push(change as ICEIndustrialStateChange[]);
  });
  workspace.on('EVENT', (event) => {
    events.push((event as { readonly type: string }).type);
  });

  workspace.updateProperties([{
    entityId: 'pump-01',
    propertyId: 'running',
    value: true,
    quality: 'good',
  }]);
  scheduled.shift()!();
  expect(workspace.getProperty('pump-01', 'running')?.value).toBe(true);
  expect(stateChanges).toHaveLength(1);

  workspace.insertEvent({
    type: 'ice:alarmRaised',
    entityId: 'pump-01',
    severity: 'warning',
    timestamp: 1,
  });
  expect(events).toEqual(['ice:alarmRaised']);
});

test('disposes all subscriptions and rejects later mutations', () => {
  const workspace = new ICEIndustrialWorkspace({
    manifest: parseIndustrialManifest(manifestFixture()),
  });
  let changes = 0;
  workspace.on('CONTEXT_CHANGE', () => {
    changes += 1;
  });
  workspace.setSelection(['pump-01']);
  expect(changes).toBe(1);

  workspace.dispose();
  expect(changes).toBe(1);
  expect(() => workspace.setSelection([]))
    .toThrow(/ICE3_INDUSTRIAL_WORKSPACE_INVALID/);
  expect(() => workspace.on('CONTEXT_CHANGE', () => undefined))
    .toThrow(/ICE3_INDUSTRIAL_WORKSPACE_INVALID/);
});

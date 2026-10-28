import { expect, test } from 'node-test';
import { ICEIndustrialEventStore } from
  '../../packages/industrial-core/src/index.js';

test('assigns monotonic sequences and preserves insertion order', () => {
  const store = new ICEIndustrialEventStore();
  const first = store.insert({
    type: 'ice:alarmRaised',
    entityId: 'pump-01',
    severity: 'warning',
    timestamp: 100,
  });
  const second = store.insert({
    type: 'ice:alarmCleared',
    entityId: 'pump-01',
    severity: 'info',
    timestamp: 101,
  });

  expect(first.sequence).toBe(1);
  expect(second.sequence).toBe(2);
  expect(first.id).toBe('ice-event-1');
  expect(store.list().map((event) => event.type))
    .toEqual(['ice:alarmRaised', 'ice:alarmCleared']);
  expect(Object.isFrozen(store.list())).toBe(true);
  expect(Object.isFrozen(first)).toBe(true);
});

test('bounds history, notifies subscribers, and freezes payloads', () => {
  const store = new ICEIndustrialEventStore({ historyLimit: 2 });
  const received: string[] = [];
  const unsubscribe = store.subscribe((event) => received.push(event.id));

  store.insert({
    id: 'event-a',
    type: 'ice:alarmRaised',
    severity: 'warning',
    timestamp: 1,
    payload: { details: { pressure: 3 } },
  });
  store.insert({
    id: 'event-b',
    type: 'ice:alarmUpdated',
    severity: 'warning',
    timestamp: 2,
  });
  const third = store.insert({
    id: 'event-c',
    type: 'ice:alarmCleared',
    severity: 'info',
    timestamp: 3,
  });

  expect(store.list().map((event) => event.id))
    .toEqual(['event-b', 'event-c']);
  expect(received).toEqual(['event-a', 'event-b', 'event-c']);
  expect(Object.isFrozen(third)).toBe(true);
  unsubscribe();
  store.insert({
    type: 'ice:checkpoint',
    severity: 'info',
    timestamp: 4,
  });
  expect(received).toHaveLength(3);
});

test('rejects malformed events and duplicate explicit ids', () => {
  const store = new ICEIndustrialEventStore();

  expect(() => store.insert({
    type: ' ',
    severity: 'info',
    timestamp: 1,
  })).toThrow(/ICE3_INDUSTRIAL_EVENT_INVALID/);
  expect(() => store.insert({
    type: 'ice:alarmRaised',
    severity: 'info',
    timestamp: Number.NaN,
  })).toThrow(/ICE3_INDUSTRIAL_EVENT_INVALID/);
  expect(() => store.insert({
    type: 'ice:alarmRaised',
    severity: 'info',
    timestamp: 1,
    payload: { value: Number.POSITIVE_INFINITY },
  })).toThrow(/ICE3_INDUSTRIAL_EVENT_INVALID/);

  store.insert({
    id: 'duplicate',
    type: 'ice:alarmRaised',
    severity: 'info',
    timestamp: 1,
  });
  expect(() => store.insert({
    id: 'duplicate',
    type: 'ice:alarmCleared',
    severity: 'info',
    timestamp: 2,
  })).toThrow(/ICE3_INDUSTRIAL_EVENT_INVALID/);
});

test('clears history and rejects inserts after disposal', () => {
  const store = new ICEIndustrialEventStore();
  store.insert({
    type: 'ice:alarmRaised',
    severity: 'info',
    timestamp: 1,
  });
  store.clear();
  expect(store.list()).toEqual([]);

  store.dispose();
  expect(() => store.insert({
    type: 'ice:alarmRaised',
    severity: 'info',
    timestamp: 2,
  })).toThrow(/ICE3_INDUSTRIAL_EVENT_INVALID/);
});

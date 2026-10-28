import { test } from 'node:test';
import { expect } from '#test-expect';
import {
  ICEIndustrialEntityRegistry,
  ICEIndustrialOperationRegistry,
  ICEIndustrialTypeRegistry,
  parseIndustrialManifest,
} from '../../packages/industrial-core/src/index.js';
import { manifestFixture } from './manifestFixture.js';

function operationFixture() {
  const manifest = manifestFixture();
  manifest.entityTypes[0]!.operationDefinitions[0]!.outputSchema = {
    type: 'object',
    properties: {
      accepted: { type: 'boolean' },
    },
    required: ['accepted'],
    additionalProperties: false,
  };
  manifest.entityTypes[0]!.operationDefinitions.push(
    {
      id: 'ice:setMode',
      label: 'Set mode',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['auto', 'manual'],
          },
        },
        required: ['mode'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          accepted: { type: 'boolean' },
        },
        required: ['accepted'],
        additionalProperties: false,
      },
      requiresConfirmation: false,
    },
    {
      id: 'ice:fail',
      label: 'Fail',
      requiresConfirmation: false,
    },
  );
  const parsed = parseIndustrialManifest(manifest);
  const types = new ICEIndustrialTypeRegistry(parsed.entityTypes);
  const entities = new ICEIndustrialEntityRegistry(
    parsed.entities,
    types,
  );
  return {
    registry: new ICEIndustrialOperationRegistry(entities, types),
  };
}

test('registers, describes, and executes declared operations', async () => {
  const { registry } = operationFixture();
  const unregister = registry.register(
    'pump-01',
    'ice:start',
    async () => ({ accepted: true }),
  );

  expect(registry.getCapability('pump-01', 'ice:start'))
    .toMatchObject({
      operationId: 'ice:start',
      requiresConfirmation: true,
    });
  await expect(registry.execute('pump-01', 'ice:start', {}, {
    entityId: 'pump-01',
    source: 'api',
  })).resolves.toEqual({ accepted: true });

  unregister();
  await expect(registry.execute('pump-01', 'ice:start'))
    .rejects.toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
});

test('validates input and output schemas', async () => {
  const { registry } = operationFixture();

  registry.register(
    'pump-01',
    'ice:setMode',
    async (input) => ({ accepted: input.mode === 'auto' }),
  );
  registry.register(
    'pump-01',
    'ice:start',
    async () => ({ accepted: 'invalid' }),
  );

  await expect(registry.execute('pump-01', 'ice:setMode', {
    mode: 'auto',
  })).resolves.toEqual({ accepted: true });
  await expect(registry.execute('pump-01', 'ice:setMode', {
    mode: 'unsupported',
  })).rejects.toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
  await expect(registry.execute('pump-01', 'ice:start', {}))
    .rejects.toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
});

test('requires declared unique handlers', async () => {
  const { registry } = operationFixture();

  expect(() => registry.register(
    'pump-01',
    'missing',
    async () => undefined,
  )).toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
  expect(() => registry.register(
    'valve-01',
    'ice:start',
    async () => undefined,
  )).toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);

  registry.register(
    'pump-01',
    'ice:start',
    async () => ({ accepted: true }),
  );
  expect(() => registry.register(
    'pump-01',
    'ice:start',
    async () => undefined,
  )).toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
  await expect(registry.execute('pump-01', 'ice:start'))
    .resolves.toEqual({ accepted: true });
});

test('wraps handler failures and preserves cancellation', async () => {
  const { registry } = operationFixture();
  registry.register('pump-01', 'ice:fail', async () => {
    throw new Error('business failure detail');
  });
  registry.register('pump-01', 'ice:start', async () => {
    const error = new Error('cancelled');
    error.name = 'AbortError';
    throw error;
  });

  await expect(registry.execute('pump-01', 'ice:fail'))
    .rejects.toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
  await expect(registry.execute('pump-01', 'ice:start'))
    .rejects.toThrow(/ICE3_INDUSTRIAL_OPERATION_CANCELLED/);
});

test('rejects mismatched context identities', async () => {
  const { registry } = operationFixture();
  registry.register('pump-01', 'ice:start', async () => undefined);

  await expect(registry.execute('pump-01', 'ice:start', {}, {
    entityId: 'valve-01',
    source: 'ui',
  })).rejects.toThrow(/ICE3_INDUSTRIAL_OPERATION_FAILED/);
});

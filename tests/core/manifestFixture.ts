import type {
  ICEIndustrialWorkspaceManifest,
} from '../../packages/industrial-core/src/index.js';

type Mutable<T> =
  T extends readonly (infer U)[]
    ? Mutable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: Mutable<T[K]> }
      : T;

export function manifestFixture(): Mutable<ICEIndustrialWorkspaceManifest> {
  return {
    version: '1.0',
    workspaceId: 'workspace-1',
    assetIds: ['asset-1'],
    entityTypes: [
      {
        id: 'pump',
        label: 'Pump',
        propertyDefinitions: [
          {
            id: 'running',
            label: 'Running',
            dataType: 'boolean',
            readable: true,
            writable: false,
          },
          {
            id: 'mode',
            label: 'Mode',
            dataType: 'enum',
            readable: true,
            writable: true,
            enumValues: ['auto', 'manual'],
          },
        ],
        operationDefinitions: [
          {
            id: 'ice:start',
            label: 'Start',
            inputSchema: {
              type: 'object',
              additionalProperties: false,
            },
            requiresConfirmation: true,
          },
        ],
      },
      {
        id: 'valve',
        label: 'Valve',
        propertyDefinitions: [],
        operationDefinitions: [],
      },
    ],
    entities: [
      {
        id: 'pump-01',
        typeId: 'pump',
        displayName: 'Pump 01',
        externalIds: [
          { scheme: 'aas', value: 'urn:asset:pump-01' },
        ],
        spatial: {
          selectionIds: ['selection-pump-01'],
          modelAssetId: 'asset-1',
          bounds: {
            min: [0, 0, 0],
            max: [1, 2, 3],
          },
          anchor: [0.5, 0, 1.5],
          tileIds: ['tile-0'],
        },
      },
      {
        id: 'valve-01',
        typeId: 'valve',
        displayName: 'Valve 01',
        externalIds: [
          { scheme: 'aas', value: 'urn:asset:valve-01' },
        ],
      },
    ],
    relations: [
      {
        id: 'rel-pump-valve',
        type: 'ice:connectedTo',
        fromEntityId: 'pump-01',
        toEntityId: 'valve-01',
        directed: true,
      },
    ],
  };
}

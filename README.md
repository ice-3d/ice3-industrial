# ICE3 Industrial Semantic Core

> Document ID: ICE3-IND-RM-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

`@ice3/industrial-core` maps rendered geometry to stable industrial entities. It
provides types, entities, relations, live properties, queries, workspace context,
events, operations, and a deterministic native JSON representation.

The package is browser-independent and has no runtime dependencies. It does not
own rendering, network transports, customer workflows, domain rules, approvals,
or Agent behavior.

## Capabilities

| Area | Capability |
|---|---|
| Manifest | Strict versioned industrial manifest validation |
| Types | Property and operation definitions with parent types |
| Entities | Stable internal, external, and scene-selection identities |
| Relations | Directed or undirected typed links and bounded traversal |
| State | Transactional latest-wins updates with quality and timestamps |
| Query | Typed filters over identity, hierarchy, state, and values |
| Context | Selection, visibility, isolation, highlight, filter, and time range |
| Events | Bounded ordered history and subscription |
| Operations | Declared capabilities with validated input and output |
| Adapters | Deterministic native ICE JSON import and export |

## Quick Start

Requirements:

- Node.js 24.22.1 LTS
- npm 11 or newer

```bash
git clone https://github.com/ice-3d/ice3-industrial.git
cd ice3-industrial
nvm use
npm install
npm run build
```

```ts
import {
  ICEIndustrialWorkspace,
  parseIndustrialManifest,
} from '@ice3/industrial-core';

const manifest = parseIndustrialManifest({
  version: '1.0',
  workspaceId: 'plant-01',
  assetIds: ['plant-model'],
  entityTypes: [{
    id: 'pump',
    label: 'Pump',
    propertyDefinitions: [{
      id: 'running',
      label: 'Running',
      dataType: 'boolean',
      readable: true,
      writable: false,
    }],
    operationDefinitions: [],
  }],
  entities: [{
    id: 'pump-01',
    typeId: 'pump',
    displayName: 'Pump 01',
    externalIds: [],
    spatial: {
      selectionIds: ['equipment/pump-01'],
      modelAssetId: 'plant-model',
    },
  }],
  relations: [],
});

const workspace = new ICEIndustrialWorkspace({ manifest });
workspace.updateProperties([{
  entityId: 'pump-01',
  propertyId: 'running',
  value: true,
  quality: 'good',
  sourceTimestamp: Date.now(),
  source: 'historian',
}]);

const runningPumps = workspace.queryEntities({
  types: ['pump'],
  properties: [{ propertyId: 'running', value: true }],
});
```

## Design Boundaries

- Static manifest data and live state are separate.
- Entity identity is independent from display names and mesh identifiers.
- Updates are validated and committed as one batch.
- Query results and snapshots are immutable and deterministic.
- Shared workspace context is display and interaction state, not persisted
  business data.
- Agent clients use the same public operations as other callers.

## Verification

```bash
npm run docs:check
npm run test:architecture
npm run typecheck
npm test
npm run verify
```

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Getting started and workflows](docs/guides/getting-started.md)
- [Public API reference](docs/reference/api.md)
- [Architecture decisions](docs/decisions/README.md)

## AI-assisted development

This project makes substantial use of AI-assisted development. 本项目在设计和实现过程中大量使用了 AI 辅助开发。

## License

This project is licensed under the [MIT License](LICENSE).

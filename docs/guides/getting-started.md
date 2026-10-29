# ICE3 Industrial Getting Started

> Document ID: ICE3-IND-GUIDE-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Intended Outcome

Create a validated industrial workspace, update live state, query entities,
traverse relations, change context, and serialize the static manifest.

## Prerequisites

- Node.js 24 LTS or 26+
- npm 11 or newer

```bash
nvm use
npm install
npm run build
```

## Create A Workspace

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
    externalIds: [{ scheme: 'plant', value: 'P-101' }],
    spatial: {
      selectionIds: ['equipment/pump-01'],
      modelAssetId: 'plant-model',
    },
  }],
  relations: [],
});

const workspace = new ICEIndustrialWorkspace({ manifest });
```

## Update State

```ts
workspace.updateProperties([{
  entityId: 'pump-01',
  propertyId: 'running',
  value: true,
  quality: 'good',
  sourceTimestamp: Date.now(),
  source: 'historian',
}]);
```

A malformed patch rejects the complete batch.

## Query

```ts
const pumps = workspace.queryEntities({
  types: ['pump'],
  properties: [{ propertyId: 'running', value: true }],
});
```

Results are detached, read-only, and deterministically ordered.

## Change Context

```ts
workspace.setSelection(['pump-01'], { source: 'operator' });
workspace.setHighlighted(['pump-01']);
workspace.setFilters([{
  id: 'running-only',
  propertyIds: ['running'],
}]);
```

Selection and view state are not written into the static manifest.

## Subscribe

```ts
const unsubscribe = workspace.on('STATE_CHANGE', (changes) => {
  console.log(changes);
});

unsubscribe();
workspace.dispose();
```

## Expected Result

- Invalid manifests produce no workspace.
- State changes are observed once per committed batch.
- Queries use canonical entity IDs.
- Serialized manifests preserve deterministic key and collection order.

## Related Documents

- `ICE3-IND-API-001` — [Public API](../reference/api.md)
- `ICE3-IND-ARC-001` — [Architecture](../architecture.md)
- `ICE3-IND-ADR-002` — [Manifest and state separation](../decisions/0002-manifest-state-separation.md)

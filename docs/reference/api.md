# ICE3 Industrial Public API

> Document ID: ICE3-IND-API-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Package Entry

Import all public symbols from `@ice3/industrial-core`.

## Manifest Types

- `ICEIndustrialWorkspaceManifest`
- `ICEIndustrialEntityType`
- `ICEIndustrialPropertyDefinition`
- `ICEIndustrialOperationDefinition`
- `ICEIndustrialEntity`
- `ICEIndustrialExternalId`
- `ICEIndustrialSpatialBinding`
- `ICEIndustrialRelation`
- `ICEIndustrialValue`

`parseIndustrialManifest(value)` validates and freezes a complete manifest.

## Workspace

`ICEIndustrialWorkspace` creates registries, state, events, operations, and
query services from a validated manifest.

Core methods:

| Method | Behavior |
|---|---|
| `queryEntities(query?)` | Return frozen matching entities |
| `getEntity(id)` | Resolve an entity or `undefined` |
| `getType(id)` | Resolve a type or `undefined` |
| `getRelations(id, query?)` | Return related entities |
| `getProperty(entityId, propertyId)` | Read one live property |
| `updateProperties(patches)` | Apply one atomic state batch |
| `insertEvent(input)` | Append one ordered event |
| `setSelection(ids)` | Replace selected entity IDs |
| `setHidden(ids)` | Replace hidden entity IDs |
| `setIsolated(ids)` | Replace isolated entity IDs |
| `setHighlighted(ids)` | Replace highlighted entity IDs |
| `setFilters(filters)` | Replace shared query filters |
| `setTimeRange(range?)` | Set or clear the context time range |
| `resetContext()` | Clear interactive context |
| `on(type, listener)` | Subscribe and return an unsubscribe function |
| `dispose()` | Release subscriptions and reject later mutations |

## Registries And Stores

- `ICEIndustrialTypeRegistry`
- `ICEIndustrialEntityRegistry`
- `ICEIndustrialRelationGraph`
- `ICEIndustrialStateStore`
- `ICEIndustrialEventStore`
- `ICEIndustrialOperationRegistry`
- `ICEIndustrialQuery`

These are public for composition and testing. Applications normally use the
workspace facade.

## State Types

- `ICEIndustrialPropertyValue`
- `ICEIndustrialStatePatch`
- `ICEIndustrialStateChange`
- `ICEIndustrialQuality`
- `ICEIndustrialStateDiagnostics`

Quality is one of `good`, `uncertain`, or `bad`.

## Context And Query Types

- `ICEIndustrialEntityQuery`
- `ICEIndustrialRelationQuery`
- `ICEIndustrialFilter`
- `ICEIndustrialTimeRange`
- `ICEIndustrialWorkspaceContext`

## Operations

- `ICEIndustrialOperationCapability`
- `ICEIndustrialOperationContext`
- `ICEIndustrialOperationHandler`
- `ICEIndustrialAbortSignal`

An operation implementation can be registered on `workspace.operations`.
Input and output schemas are validated before state is changed.

## Adapters

- `ICEIndustrialAssetAdapter`
- `ICEIndustrialAdapterRegistry`
- `iceJsonAdapter`
- `serializeIndustrialWorkspace(workspace)`

The native adapter accepts strings or UTF-8 bytes. Adapter failures use
`ICE3_INDUSTRIAL_ADAPTER_FAILED` and never expose partial workspace state.

## Related Documents

- `ICE3-IND-ARC-001` — [Architecture](../architecture.md)
- `ICE3-IND-GUIDE-001` — [Getting started](../guides/getting-started.md)
- `ICE3-IND-ADR-003` — [Stable identity model](../decisions/0003-stable-identity-model.md)

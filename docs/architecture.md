# ICE3 Industrial Semantic Architecture

> Document ID: ICE3-IND-ARC-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## System Context

The industrial core turns static scene semantics and live values into a
queryable workspace. It sits above generic engine objects and below business
applications.

```text
manifest adapter
      ↓
validated manifest
      ↓
registry + relation graph
      ↓
workspace ── state store
    ├────── query engine
    ├────── event store
    ├────── operation registry
    └────── shared context
```

## Components

| Component | Responsibility |
|---|---|
| Manifest parser | Validate versions, references, schemas, spatial bindings, and value types |
| Type registry | Resolve entity types and inheritable property and operation definitions |
| Entity registry | Index stable entities and their external identities |
| Relation graph | Validate and traverse typed relations |
| State store | Apply validated latest-wins state batches and notify subscribers |
| Query engine | Filter by identity, type, hierarchy, properties, quality, and value |
| Event store | Maintain ordered bounded event history |
| Operation registry | Describe, validate, authorize through callers, and execute capabilities |
| Workspace | Compose all stores and expose the public API |
| Adapter registry | Import and export versioned asset workspace formats |

## Data Flow

1. The caller provides a manifest.
2. The parser validates the complete manifest before any registry is created.
3. Registries build deterministic lookup structures.
4. Static entity and relation data never receives live values.
5. `updateProperties()` validates the full patch batch and applies it together.
6. Subscribers receive immutable changes after commit.
7. Queries combine static registries, relations, and current state.

## Identity

- `entity.id` is the canonical workspace identity.
- `externalIds` maps other systems into the workspace.
- `spatial.selectionIds` connects semantic entities to one or more rendered
  scene selections.
- LOD node IDs and display names never replace canonical identity.

## Failure Behavior

- Invalid manifests fail before a workspace becomes usable.
- Invalid state batches apply no partial update.
- Unknown types, entities, properties, relations, or operations throw stable
  `ICE3_INDUSTRIAL_*` errors.
- Disposed stores reject later mutations.

## Related Documents

- `ICE3-IND-IDX-001` — [Documentation index](README.md)
- `ICE3-IND-GUIDE-001` — [Getting started](guides/getting-started.md)
- `ICE3-IND-API-001` — [Public API](reference/api.md)
- `ICE3-DOC-ARC-001` — [ICE3 family architecture](https://github.com/ice-3d/ice3-doc/blob/main/docs/architecture.md)

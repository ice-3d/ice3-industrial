# Stable Identity Model

> Document ID: ICE3-IND-ADR-003
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Context

An industrial entity can appear in a semantic hierarchy, several external
systems, and one or more rendered LOD nodes. Display names and mesh IDs are not
sufficiently stable or authoritative.

## Decision

Each entity has one canonical `id`. External systems map through `externalIds`.
Scene nodes map through `spatial.selectionIds`. Queries, operations, state, and
selection use the canonical entity identity.

## Considered Alternatives

- Use mesh node IDs as entity IDs.
- Use display labels as identity.
- Use an external vendor ID as the only identity.

These alternatives collide, change unexpectedly, and prevent multiple systems
from mapping to the same domain object.

## Consequences

- One entity can map to multiple scene selections.
- LOD or render representation changes do not change semantic identity.
- External mapping is explicit and queryable.
- Adapters must maintain identity consistency.

## Verification

```bash
npm test -- tests/core
```

## Related Documents

- `ICE3-IND-API-001` — [Public API](../reference/api.md)
- `ICE3-DOC-ADR-004` — [Generic semantic interfaces](https://github.com/ice-3d/ice3-doc/blob/main/docs/decisions/0004-generic-semantic-interfaces.md)

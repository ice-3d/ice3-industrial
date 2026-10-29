# Manifest And State Separation

> Document ID: ICE3-IND-ADR-002
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Context

Industrial definitions change infrequently, while operating values, quality,
timestamps, events, and view context change continuously. Mixing them creates
large writes, unstable version control, and unclear consistency boundaries.

## Decision

The manifest stores static types, entities, relations, spatial bindings, and
declared operations. Runtime state and view context live only in mutable stores.
Serializing the static workspace excludes live values and transient context.

## Considered Alternatives

- Store the latest value on every entity definition.
- Persist selection and visibility with the manifest.
- Treat each update as a rewritten document.

These alternatives create write amplification and unstable static assets.

## Consequences

- Static data can be content-addressed and cached.
- State updates are batched and observable independently.
- Serializers have a narrow, deterministic responsibility.
- Consumers combine static and live data during queries.

## Verification

```bash
npm test -- tests/core
```

## Related Documents

- `ICE3-IND-GUIDE-001` — [Getting started](../guides/getting-started.md)
- `ICE3-IND-API-001` — [Public API](../reference/api.md)

# Zero Runtime Dependencies

> Document ID: ICE3-IND-ADR-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Context

The semantic core should run in browsers, workers, Node.js services, tests, and
future adapters without pulling rendering, network, UI, or protocol libraries
into its dependency graph.

## Decision

`@ice3/industrial-core` has zero runtime dependencies and does not import DOM,
WebGL, filesystem, network, engine, or Agent packages.

## Considered Alternatives

- Use a schema or graph library for validation and traversal.
- Depend on the engine package for spatial types.
- Put adapters and network connectors in the core.

These alternatives reduce a small amount of code but make deployment and
compatibility unnecessarily broad.

## Consequences

- The package remains portable and inexpensive to embed.
- Validation and graph behavior are explicit project code.
- Integrations live in adapters and applications.
- Architecture tests can enforce the dependency boundary.

## Verification

```bash
npm run test:architecture
```

## Related Documents

- `ICE3-IND-ARC-001` — [Architecture](../architecture.md)
- `ICE3-DOC-ADR-001` — [Universal engine and vertical applications](https://github.com/ice-3d/ice3-doc/blob/main/docs/decisions/0001-universal-engine-and-vertical-applications.md)

# ICE3 Industrial Repository Rules

> Document ID: ICE3-IND-POL-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Architecture

- `@ice3/industrial-core` remains browser-independent and has no runtime dependency.
- Industrial identity, relations, state, queries, context, events, and operations are generic platform capabilities.
- Application workflows, approvals, customer-specific rules, and Agent behavior remain outside this repository.
- Rendered scene identities map through declared interfaces; presentation LOD nodes never replace canonical entity identity.
- Behavioral changes preserve deterministic ordering, immutable snapshots, and stable diagnostics.

## Data boundary

- Tests and examples use synthetic industrial manifests and state.
- Do not commit customer manifests, historian exports, live-tag snapshots, or other customer data.
- Shared manifest, identity, or operation schemas must be documented in `ice3-doc` before multiple repositories depend on them.

## Delivery

- Use Node.js 24.22.1 LTS from `.nvmrc`.
- Develop on a feature branch and merge to `main` only after the full verification gate passes.
- Every behavioral change follows RED-GREEN-REFACTOR.
- Do not add a runtime dependency without an explicit architecture decision.

## Commit identity

- Every Git author and committer name in this repository must be `damoqiongqiu`.
- Verify the configured and recorded names before committing, merging, or pushing.

## Naming and legal boundary

- Do not use competitor, vendor, or third-party product names in documents, code, comments, identifiers, links, examples, diagnostics, or commits.
- Describe comparisons only with neutral category names.
- Do not link to external research that exposes prohibited names.

## Verification

```bash
npm run verify
```

## Related Documents

- `ICE3-IND-IDX-001` — [Documentation index](docs/README.md)
- `ICE3-IND-ARC-001` — [Industrial architecture](docs/architecture.md)

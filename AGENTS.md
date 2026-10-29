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
- Do not link to external materials that expose prohibited names. Keep any necessary research outside product repositories and subject it to legal review.
- Audit names before every commit and release.

## Customer asset protection

- Real customer model assets remain in a controlled local directory outside every repository.
- Original models and derived assets must not enter source, tests, examples, documentation, screenshots, logs, build output, packages, or Git history.
- Derived assets include converted models, simplified models, previews, thumbnails, extracted textures, and other identifiable content.
- Do not stage, commit, push, or upload customer assets or derivative data to any remote service.
- Tests, demos, and public builds use synthetic, sanitized, or explicitly redistributable assets.
- Before completing asset-related work, inspect Git status, tracked files, ignore rules, and staged content.

## Cross-repository contracts

- `ice3-doc` is the single source of truth for formats, metrics, budgets, compatibility rules, shared diagnostics, and other cross-project contracts.
- This repository documents its own implementation and links to the canonical contract instead of independently maintaining a complete copy.
- A contract change requires checking every consumer in the ICE3 family and passing the frozen contract or conformance tests.

## Verification

```bash
npm run verify
```

## Related Documents

- `ICE3-IND-IDX-001` — [Documentation index](docs/README.md)
- `ICE3-IND-ARC-001` — [Industrial architecture](docs/architecture.md)

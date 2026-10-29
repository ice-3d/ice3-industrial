# 稳定 Identity 模型

> Document ID: ICE3-IND-ADR-003
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## 背景

Industrial Entity 可以出现在 semantic hierarchy、多个 external system 和一个或多个
rendered LOD Node 中。Display name 和 Mesh ID 不够稳定，也不具有足够权威性。

## 决策

每个 Entity 有一个权威 `id`。External system 通过 `externalIds` 映射；Scene Node 通过
`spatial.selectionIds` 映射。Query、operation、state 和 Selection 使用权威 Entity
identity。

## 备选方案

- 使用 Mesh Node ID 作为 Entity ID。
- 使用 display label 作为 identity。
- 使用单一 external vendor ID 作为唯一 identity。

这些方案会产生冲突、意外变化，并阻止多个系统映射到同一领域 object。

## 影响

- 一个 Entity 可以映射到多个 Scene Selection。
- LOD 或 render representation 变化不改变 semantic identity。
- External mapping 明确且可查询。
- Adapter 必须保持 identity consistency。

## 验证

```bash
npm test -- tests/core
```

## 关联文档

- `ICE3-IND-API-001` — [公开 API](../reference/api.md)
- `ICE3-DOC-ADR-004` — [通用 semantic interface](https://github.com/ice-3d/ice3-doc/blob/main/docs/decisions/0004-generic-semantic-interfaces.md)

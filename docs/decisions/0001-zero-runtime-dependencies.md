# 零 Runtime dependency

> Document ID: ICE3-IND-ADR-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## 背景

Semantic core 应可运行在 browser、Worker、Node.js service、test 和未来 adapter 中，
而不把 rendering、network、UI 或 protocol library 引入 dependency graph。

## 决策

`@ice3/industrial-core` 没有 runtime dependency，也不导入 DOM、WebGL、filesystem、
network、Engine 或 Agent package。

## 备选方案

- 使用 schema 或 graph library 执行 validation 和 traversal。
- 为 spatial type 依赖 Engine package。
- 将 adapter 和 network connector 放入 core。

这些方案减少少量代码，却会让 deployment 和 compatibility 范围不必要地扩大。

## 影响

- Package 保持可移植且嵌入成本低。
- Validation 和 graph behavior 是明确的工程代码。
- Integration 位于 adapter 和应用中。
- Architecture test 可以强制 dependency boundary。

## 验证

```bash
npm run test:architecture
```

## 关联文档

- `ICE3-IND-ARC-001` — [架构](../architecture.md)
- `ICE3-DOC-ADR-001` — [通用 Engine 与垂直应用](https://github.com/ice-3d/ice3-doc/blob/main/docs/decisions/0001-universal-engine-and-vertical-applications.md)

# ICE3 Industrial Semantic 架构

> Document ID: ICE3-IND-ARC-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## 系统上下文

Industrial core 将静态 Scene semantic 与 live value 转换为可查询 workspace。它位于
通用 Engine object 之上、业务应用之下。

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

## 组件

| 组件 | 职责 |
|---|---|
| Manifest parser | 校验 version、reference、schema、spatial binding 和 value type |
| Type registry | 解析 Entity type 以及可继承的 property/operation definition |
| Entity registry | 索引稳定 Entity 及其 external identity |
| Relation graph | 校验并遍历 typed relation |
| State store | 应用已校验 latest-wins state batch，并通知 subscriber |
| Query engine | 按 identity、type、hierarchy、property、quality 和 value 过滤 |
| Event store | 维护有序且有界的 Event history |
| Operation registry | 描述、校验、交由 caller 授权并执行 capability |
| Workspace | 组合所有 store 并暴露公开 API |
| Adapter registry | 导入和导出版本化 Asset workspace format |

## 数据流

1. Caller 提供 manifest。
2. Parser 在创建 registry 前校验完整 manifest。
3. Registry 构建确定性 lookup structure。
4. Static Entity 和 Relation data 永不混入 live value。
5. `updateProperties()` 校验完整 patch batch 后整体应用。
6. Subscriber 在 commit 后接收不可变 change。
7. Query 组合 static registry、Relation 和当前 state。

## Identity

- `entity.id` 是权威 workspace identity。
- `externalIds` 将其他系统映射到 workspace。
- `spatial.selectionIds` 将 semantic Entity 连接到一个或多个 rendered Scene Selection。
- LOD Node ID 和 display name 永不替代权威 identity。

## 失败行为

- 无效 manifest 在 workspace 可用前失败。
- 无效 state batch 不应用部分 update。
- 未知 type、Entity、property、Relation 或 operation 抛出稳定
  `ICE3_INDUSTRIAL_*` error。
- Disposed store 拒绝后续 mutation。

## 关联文档

- `ICE3-IND-IDX-001` — [文档索引](README.md)
- `ICE3-IND-GUIDE-001` — [快速开始](guides/getting-started.md)
- `ICE3-IND-API-001` — [公开 API](reference/api.md)
- `ICE3-DOC-ARC-001` — [ICE3 家族架构](https://github.com/ice-3d/ice3-doc/blob/main/docs/architecture.md)

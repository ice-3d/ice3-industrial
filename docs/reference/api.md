# ICE3 Industrial 公开 API

> Document ID: ICE3-IND-API-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## Package 入口

从 `@ice3/industrial-core` 导入所有 public symbol。

## Manifest 类型

- `ICEIndustrialWorkspaceManifest`
- `ICEIndustrialEntityType`
- `ICEIndustrialPropertyDefinition`
- `ICEIndustrialOperationDefinition`
- `ICEIndustrialEntity`
- `ICEIndustrialExternalId`
- `ICEIndustrialSpatialBinding`
- `ICEIndustrialRelation`
- `ICEIndustrialValue`

`parseIndustrialManifest(value)` 校验并冻结完整 manifest。

## Workspace

`ICEIndustrialWorkspace` 根据已校验 manifest 创建 registry、state、event、operation
和 query service。

主要方法：

| Method | 行为 |
|---|---|
| `queryEntities(query?)` | 返回已冻结的匹配 Entity |
| `getEntity(id)` | 解析 Entity，找不到时返回 `undefined` |
| `getType(id)` | 解析 type，找不到时返回 `undefined` |
| `getRelations(id, query?)` | 返回相关 Entity |
| `getProperty(entityId, propertyId)` | 读取一个 live property |
| `updateProperties(patches)` | 原子应用一个 state batch |
| `insertEvent(input)` | 追加一个有顺序 Event |
| `setSelection(ids)` | 替换选中 Entity ID |
| `setHidden(ids)` | 替换隐藏 Entity ID |
| `setIsolated(ids)` | 替换 isolated Entity ID |
| `setHighlighted(ids)` | 替换 highlighted Entity ID |
| `setFilters(filters)` | 替换共享 query filter |
| `setTimeRange(range?)` | 设置或清除 context 时间范围 |
| `resetContext()` | 清除交互 context |
| `on(type, listener)` | 订阅并返回 unsubscribe function |
| `dispose()` | 释放 subscription 并拒绝后续 mutation |

## Registry 与 Store

- `ICEIndustrialTypeRegistry`
- `ICEIndustrialEntityRegistry`
- `ICEIndustrialRelationGraph`
- `ICEIndustrialStateStore`
- `ICEIndustrialEventStore`
- `ICEIndustrialOperationRegistry`
- `ICEIndustrialQuery`

这些类型因 composition 和 testing 需要而公开。应用通常使用 workspace facade。

## State 类型

- `ICEIndustrialPropertyValue`
- `ICEIndustrialStatePatch`
- `ICEIndustrialStateChange`
- `ICEIndustrialQuality`
- `ICEIndustrialStateDiagnostics`

Quality 为 `good`、`uncertain` 或 `bad`。

## Context 与 Query 类型

- `ICEIndustrialEntityQuery`
- `ICEIndustrialRelationQuery`
- `ICEIndustrialFilter`
- `ICEIndustrialTimeRange`
- `ICEIndustrialWorkspaceContext`

## Operation

- `ICEIndustrialOperationCapability`
- `ICEIndustrialOperationContext`
- `ICEIndustrialOperationHandler`
- `ICEIndustrialAbortSignal`

Operation implementation 可注册到 `workspace.operations`。修改 state 前校验 input 和
output schema。

## Adapter

- `ICEIndustrialAssetAdapter`
- `ICEIndustrialAdapterRegistry`
- `iceJsonAdapter`
- `serializeIndustrialWorkspace(workspace)`

Native adapter 接受 string 或 UTF-8 bytes。Adapter failure 使用
`ICE3_INDUSTRIAL_ADAPTER_FAILED`，且不暴露部分 workspace state。

## 关联文档

- `ICE3-IND-ARC-001` — [架构](../architecture.md)
- `ICE3-IND-GUIDE-001` — [快速开始](../guides/getting-started.md)
- `ICE3-IND-ADR-003` — [稳定 Identity 模型](../decisions/0003-stable-identity-model.md)

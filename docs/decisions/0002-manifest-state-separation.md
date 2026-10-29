# Manifest 与 State 分离

> Document ID: ICE3-IND-ADR-002
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## 背景

Industrial definition 很少变化，而 operating value、quality、timestamp、Event 和 view
context 持续变化。混合两者会产生大写入、不稳定的版本控制以及不清晰的 consistency
boundary。

## 决策

Manifest 保存 static type、Entity、Relation、spatial binding 和声明 operation。Runtime
state 与 view context 只存在于 mutable store。序列化 static workspace 时排除 live
value 和 transient context。

## 备选方案

- 在每个 Entity definition 上保存最新 value。
- 将 Selection 和 visibility 持久化到 manifest。
- 将每次 update 当作重写文档。

这些方案会造成 write amplification 和不稳定 static Asset。

## 影响

- Static data 可以 content-address 并缓存。
- State update 按 batch 处理，并可独立观察。
- Serializer 责任狭窄且具有确定性。
- Consumer 在 query 时组合 static data 和 live data。

## 验证

```bash
npm test -- tests/core
```

## 关联文档

- `ICE3-IND-GUIDE-001` — [快速开始](../guides/getting-started.md)
- `ICE3-IND-API-001` — [公开 API](../reference/api.md)

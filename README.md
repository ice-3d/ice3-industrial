# ICE3 Industrial Semantic Core

> Document ID: ICE3-IND-RM-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

[![npm](https://img.shields.io/npm/v/%40ice3%2Findustrial-core?label=%40ice3%2Findustrial-core)](https://www.npmjs.com/package/@ice3/industrial-core)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

`@ice3/industrial-core` 将渲染后的 Geometry 映射到稳定工业实体，提供 type、entity、
relation、live property、query、workspace context、event、operation 和确定性 native
JSON 表示。

该 package 不依赖浏览器，也没有 runtime dependency。它不负责 rendering、network
transport、客户工作流、领域规则、审批或 Agent 行为。

## 1. 能力

| 领域 | 能力 |
|---|---|
| Manifest | 严格校验带版本的 industrial manifest |
| Type | 定义 property、operation 及其父类型 |
| Entity | 稳定的内部、外部和 Scene Selection identity |
| Relation | 有向或无向的 typed link，以及有边界 traversal |
| State | 带 quality 和 timestamp 的事务型 latest-wins update |
| Query | 按 identity、层级、state 和 value 筛选的 typed filter |
| Context | Selection、visibility、isolation、highlight、filter 和时间范围 |
| Event | 有界、有序的 history 与 subscription |
| Operation | 声明式 capability，并校验输入与输出 |
| Adapter | 确定性的 native ICE JSON 导入与导出 |

## 2. 快速开始

运行要求：

- Node.js 24.22.1 LTS
- npm 11 or newer

```bash
git clone https://github.com/ice-3d/ice3-industrial.git
cd ice3-industrial
nvm use
npm install
npm run build
```

作为 npm package 安装：

```bash
npm install @ice3/industrial-core
```

```ts
import {
  ICEIndustrialWorkspace,
  parseIndustrialManifest,
} from '@ice3/industrial-core';

const manifest = parseIndustrialManifest({
  version: '1.0',
  workspaceId: 'plant-01',
  assetIds: ['plant-model'],
  entityTypes: [{
    id: 'pump',
    label: 'Pump',
    propertyDefinitions: [{
      id: 'running',
      label: 'Running',
      dataType: 'boolean',
      readable: true,
      writable: false,
    }],
    operationDefinitions: [],
  }],
  entities: [{
    id: 'pump-01',
    typeId: 'pump',
    displayName: 'Pump 01',
    externalIds: [],
    spatial: {
      selectionIds: ['equipment/pump-01'],
      modelAssetId: 'plant-model',
    },
  }],
  relations: [],
});

const workspace = new ICEIndustrialWorkspace({ manifest });
workspace.updateProperties([{
  entityId: 'pump-01',
  propertyId: 'running',
  value: true,
  quality: 'good',
  sourceTimestamp: Date.now(),
  source: 'historian',
}]);

const runningPumps = workspace.queryEntities({
  types: ['pump'],
  properties: [{ propertyId: 'running', value: true }],
});
```

## 3. 设计边界

- 静态 manifest 数据与 live state 分离。
- Entity identity 独立于 display name 和 mesh identifier。
- Update 作为一个 Batch 校验并提交。
- Query result 和 snapshot 不可变且具有确定性。
- 共享 workspace context 表示显示和交互状态，不是持久化业务数据。
- Agent client 和其他调用方使用同一套公开 operation。

## 4. 验证

```bash
npm run docs:check
npm run test:architecture
npm run typecheck
npm test
npm run verify
```

## 5. 文档

- [文档索引](docs/README.md)
- [架构](docs/architecture.md)
- [快速开始与工作流](docs/guides/getting-started.md)
- [公开 API 参考](docs/reference/api.md)
- [架构决策](docs/decisions/README.md)

## 6. 给 AI Agent 的约定

**必须遵守**

1. 这个 package **不是渲染器**。新增能力前先问：它是"工业语义"还是"画出来"？后者属于
   `ice3`，写这里就跑偏了。
2. 保持零 runtime dependency、不依赖浏览器——这是它能在服务端、CLI、测试里复用的前提。
3. 公开导出走 `src/index.ts`，类型即契约；改签名等于破坏性变更，要同步
   [Asset Preparation Contract](https://github.com/ice-3d/ice3-doc/blob/main/docs/contracts/asset-preparation-contract-v1.md)
   里相关的部分。
4. 版本号只有一个来源：`packages/industrial-core/package.json`。
5. 声称完成前跑 `npm run verify`（docs / 架构 / 类型 / 单测 / release 打包全在内）。

**找东西的最短路径**

| 想知道 | 去哪 |
|---|---|
| manifest 结构与校验规则 | `packages/industrial-core/src/manifest*` |
| 实体与 Selection identity | `packages/industrial-core/src/entity*` |
| 跨仓库契约 | [ice3-doc](https://github.com/ice-3d/ice3-doc/blob/main/README.md) |

## 7. 许可证

本项目采用 [MIT License](LICENSE) 许可。

# ICE3 Industrial Semantic Core

> Document ID: ICE3-IND-RM-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

`@ice3/industrial-core` 将渲染后的 Geometry 映射到稳定工业实体，提供 type、entity、
relation、live property、query、workspace context、event、operation 和确定性 native
JSON 表示。

该 package 不依赖浏览器，也没有 runtime dependency。它不负责 rendering、network
transport、客户工作流、领域规则、审批或 Agent 行为。

## 能力

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

## 快速开始

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

## 设计边界

- 静态 manifest 数据与 live state 分离。
- Entity identity 独立于 display name 和 mesh identifier。
- Update 作为一个 Batch 校验并提交。
- Query result 和 snapshot 不可变且具有确定性。
- 共享 workspace context 表示显示和交互状态，不是持久化业务数据。
- Agent client 和其他调用方使用同一套公开 operation。

## 验证

```bash
npm run docs:check
npm run test:architecture
npm run typecheck
npm test
npm run verify
```

## 文档

- [文档索引](docs/README.md)
- [架构](docs/architecture.md)
- [快速开始与工作流](docs/guides/getting-started.md)
- [公开 API 参考](docs/reference/api.md)
- [架构决策](docs/decisions/README.md)

## AI 辅助开发

本项目在设计和实现过程中大量使用了 AI 辅助开发。

## 许可证

本项目采用 [MIT License](LICENSE) 许可。

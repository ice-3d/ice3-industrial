# ICE3 工业语义核心

`@ice3/industrial-core` 是 ICE3 工业语义层的第一阶段实现。它把三维场景中的几何载体映射为稳定、可查询、可操作和可实时更新的工业实体，同时与浏览器、渲染运行时、协议栈和具体客户业务保持解耦。

当前仓库只包含纯 TypeScript 核心，不包含浏览器渲染适配器、二维视图适配器、Studio、实时通信连接器、行业规则或 AI 专用接口。

## 架构

```text
Manifest Validator
       ↓
TypeRegistry + EntityRegistry + RelationGraph
       ↓
StateStore + QueryEngine
       ↓
WorkspaceContext + OperationRegistry
       ↓
ICEIndustrialWorkspace
```

核心约束：

- 零运行时依赖。
- 不依赖 DOM、WebGL、文件系统、网络或特定协议。
- 静态清单与运行状态分离。
- 实体内部身份、外部身份和场景选择身份分别建模。
- 公开查询、状态、事件和上下文更新保持确定性。
- 高频状态更新按事务提交，并在一次通知中合并。
- 工业规则、权限、审批、告警策略和 AI 编排由上层应用负责。

## 开始使用

```bash
nvm use 24
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
  assetIds: ['asset-01'],
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
      selectionIds: ['selection-pump-01'],
      modelAssetId: 'asset-01',
    },
  }],
  relations: [],
});

const workspace = new ICEIndustrialWorkspace({ manifest });
workspace.on('STATE_CHANGE', (changes) => {
  console.log(changes);
});

workspace.updateProperties([{
  entityId: 'pump-01',
  propertyId: 'running',
  value: true,
  quality: 'good',
  sourceTimestamp: Date.now(),
  source: 'edge',
}]);

workspace.setSelection(['pump-01'], { source: 'scene' });
```

工作区对外暴露以下只读能力：

- `queryEntities()`：按身份、类型、父级、外部身份、属性和质量查询。
- `getRelations()` / `relations.reachable()`：有界关系遍历。
- `updateProperties()`：事务性、latest-wins 的批量状态更新。
- `insertEvent()`：有界历史与单调序列事件。
- `operations`：声明式操作能力与外部注册的执行器。
- `setSelection()`、`setHidden()`、`setIsolated()`、`setHighlighted()`、`setFilters()`：共享视图上下文。
- `serializeIndustrialWorkspace()`：确定性原生 ICE JSON 序列化。

## 原生数据适配

`iceJsonAdapter` 支持字符串和 UTF-8 字节输入。导出结果使用两个空格缩进、稳定对象键顺序、稳定集合顺序和末尾换行。

```ts
import {
  ICEIndustrialAdapterRegistry,
  iceJsonAdapter,
} from '@ice3/industrial-core';

const adapters = new ICEIndustrialAdapterRegistry();
adapters.register(iceJsonAdapter);

const imported = await adapters.require('ice-json').import(json);
const exported = await adapters.require('ice-json').export(imported);
```

原生适配器会完整验证清单，失败时统一抛出 `ICE3_INDUSTRIAL_ADAPTER_FAILED`，不会产生部分工作区状态。

## 数据边界

清单只保存静态语义。运行值、质量、时间、事件历史、选择、显隐、隔离、过滤和视图状态不得写回静态清单。

仓库禁止提交真实客户模型、派生资产、截图、日志、客户路径或完整业务数据。发布包只包含编译后的 JavaScript、类型声明和源映射。

## 验证

```bash
npm run verify
npm pack --workspaces --dry-run --json
```

验证包含零依赖架构检查、严格类型检查、核心单元测试，以及 10,000 个实体、50,000 个属性定义和 100,000 个状态补丁的内存合成夹具。

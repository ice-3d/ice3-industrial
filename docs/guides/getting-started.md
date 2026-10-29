# ICE3 Industrial 快速开始

> Document ID: ICE3-IND-GUIDE-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## 目标结果

创建已校验 industrial workspace，更新 live state、查询 Entity、遍历 Relation、修改
context，并序列化 static manifest。

## 前置条件

- Node.js 24.22.1 LTS
- npm 11 或更高版本

```bash
nvm use
npm install
npm run build
```

## 创建 Workspace

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
    externalIds: [{ scheme: 'plant', value: 'P-101' }],
    spatial: {
      selectionIds: ['equipment/pump-01'],
      modelAssetId: 'plant-model',
    },
  }],
  relations: [],
});

const workspace = new ICEIndustrialWorkspace({ manifest });
```

## Update State

```ts
workspace.updateProperties([{
  entityId: 'pump-01',
  propertyId: 'running',
  value: true,
  quality: 'good',
  sourceTimestamp: Date.now(),
  source: 'historian',
}]);
```

格式错误的 patch 会拒绝整个 batch。

## Query

```ts
const pumps = workspace.queryEntities({
  types: ['pump'],
  properties: [{ propertyId: 'running', value: true }],
});
```

Result 从内部 state 分离，只读且顺序确定。

## 修改 Context

```ts
workspace.setSelection(['pump-01'], { source: 'operator' });
workspace.setHighlighted(['pump-01']);
workspace.setFilters([{
  id: 'running-only',
  propertyIds: ['running'],
}]);
```

Selection 和 view state 不写入 static manifest。

## 订阅

```ts
const unsubscribe = workspace.on('STATE_CHANGE', (changes) => {
  console.log(changes);
});

unsubscribe();
workspace.dispose();
```

## 预期结果

- 无效 manifest 不产生 workspace。
- 每个 committed batch 的 state change 只观察一次。
- Query 使用权威 Entity ID。
- Serialized manifest 保持确定性 key 和 collection 顺序。

## 关联文档

- `ICE3-IND-API-001` — [公开 API](../reference/api.md)
- `ICE3-IND-ARC-001` — [架构](../architecture.md)
- `ICE3-IND-ADR-002` — [Manifest 与 State 分离](../decisions/0002-manifest-state-separation.md)

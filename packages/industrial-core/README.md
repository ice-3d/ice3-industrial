# ICE3 Industrial Core

> Document ID: ICE3-IND-RM-002
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

`@ice3/industrial-core` 提供与浏览器和 Renderer 无关的工业语义模型，包括实体、
类型、关系、状态、查询、事件和 operation。

## 安装

```bash
npm install @ice3/industrial-core
```

## 使用

```ts
import {
  ICEIndustrialWorkspace,
  parseIndustrialManifest,
} from '@ice3/industrial-core';

const manifest = parseIndustrialManifest({
  version: '1.0',
  workspaceId: 'plant-01',
  assetIds: ['plant-model'],
  entityTypes: [],
  entities: [],
  relations: [],
});

const workspace = new ICEIndustrialWorkspace({ manifest });
```

完整文档见
[Industrial 文档](https://github.com/ice-3d/ice3-industrial/blob/main/README.md)。

本项目采用 MIT License。

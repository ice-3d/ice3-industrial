# ICE3 Industrial 仓库规则

> Document ID: ICE3-IND-POL-001
>
> Status: Active
>
> Owner: ICE3 Industrial maintainers

## 架构

- `@ice3/industrial-core` 保持浏览器独立，并且没有 runtime dependency。
- Industrial identity、relation、state、query、context、event 和 operation 都是通用平台能力。
- 应用 workflow、审批、客户特定规则和 Agent 行为留在本仓库之外。
- 渲染后的 Scene identity 通过声明接口映射；展示用 LOD Node 不得替代权威 Entity identity。
- 行为变化必须保持确定性顺序、不可变 snapshot 和稳定 Diagnostic。
- npm 公开发布 package 为 `@ice3/industrial-core`，初始公开版本从 `0.1.0` 开始。

## 数据边界

- 测试和示例使用虚构 industrial manifest 与 state。
- 不得提交客户 manifest、historian export、live-tag snapshot 或其他客户数据。
- 多个仓库依赖共享 manifest、identity 或 operation schema 前，必须在 `ice3-doc` 中定义。

## 交付

- 使用 `.nvmrc` 指定的 Node.js 24.22.1 LTS。
- 在功能分支开发，完整验证门禁通过后才可合入 `main`。
- 每项行为变化遵循 RED-GREEN-REFACTOR。
- 没有明确架构决策时不得增加 runtime dependency。

## 提交身份

- 本仓库所有 Git author 和 committer 名称必须为 `damoqiongqiu`。
- 提交、合并或推送前核对配置名称与提交记录。

## 命名与法律边界

- 文档、代码、注释、标识、链接、示例、Diagnostic 或 commit 中不得出现竞品、厂商或第三方产品名称。
- 技术比较使用中性类别描述。
- 不得链接会暴露禁止名称的外部调研资料。

## 验证

```bash
npm run verify
```

## 关联文档

- `ICE3-IND-IDX-001` — [文档索引](docs/README.md)
- `ICE3-IND-ARC-001` — [Industrial 架构](docs/architecture.md)

---
title: "前端项目测试用例编写指南"
date: 2026-03-24
category: "前端工程化"
tags: [Testing, Vitest, Testing Library, Playwright]
---

## 概述

前端项目测试分为三个层级：单元测试、组件测试和 E2E 测试，遵循"测试金字塔"原则，单元测试占比最大，E2E 最少。

## 关键知识点

### 测试分层策略

| 层级 | 工具 | 覆盖内容 | 占比建议 |
|------|------|----------|----------|
| 单元测试 | Vitest / Jest | 函数、hooks、工具方法 | ~70% |
| 组件测试 | Testing Library | 组件渲染、交互、状态 | ~20% |
| E2E 测试 | Playwright / Cypress | 用户完整流程 | ~10% |

### 核心原则

1. **测试行为而非实现**：用 `getByRole`、`getByText` 查询元素，不依赖 CSS 类名
2. **每个测试独立**：不依赖执行顺序，不共享可变状态
3. **只 Mock 边界**：Mock 外部 API、浏览器 API，不 Mock 自己的模块
4. **优先测试关键路径**：登录、支付、核心业务流程优先覆盖

### 测试优先级

- 高优先：工具函数 / hooks（纯逻辑，易测试，价值高）
- 中优先：业务组件（有交互逻辑需覆盖）
- 低优先：页面组件（E2E 更适合）

### 推荐技术栈

- **Vitest**：与 Vite 生态无缝集成，速度快
- **Testing Library**：以用户视角测试组件
- **Playwright**：跨浏览器 E2E 测试

## 参考链接

- [Vitest 官方文档](https://vitest.dev/)
- [Testing Library 官方文档](https://testing-library.com/)
- [Playwright 官方文档](https://playwright.dev/)

---
title: "后端框架选型对比：NestJS vs Express vs Koa vs Fastify"
date: 2026-04-07
category: "后端"
tags: [NestJS, Express, Koa, Fastify, TypeScript, Node.js]
---

## 概述

在为 Bookmark 阅读器选择后端框架时，对比了 4 个主流 Node.js 后端框架，最终选择 NestJS。核心决策依据不是"哪个最好"，而是"在 Bookmark 这个场景下哪个最合适"。

## 对比总结

| 维度 | Express | Koa | NestJS | Fastify |
|------|---------|-----|--------|---------|
| 代码组织 | 无约束，项目大了容易乱 | 无约束 | 模块化架构，分层清晰 | 插件系统 |
| TypeScript | 需手动配置 | 需手动配置 | 原生支持，开箱即用 | 良好支持 |
| 依赖注入 | 无 | 无 | 内建 DI 容器 | 无 |
| 内置功能 | 极少，中间件自己找 | 极少 | 认证、校验、Swagger 等开箱即用 | 较少 |
| 学习曲线 | 低 | 低 | 中 | 低 |

## 关键知识点

### Express 的真正问题

不只是"需要找中间件"，更关键的是**没有统一的代码组织方式**。10 个 Express 项目可能有 10 种完全不同的目录结构和代码风格。项目一大，新人接手成本极高。

### NestJS 的核心优势

1. **模块化**：按功能拆分 Module（AuthModule、BookModule），每个模块内部 Controller + Service + DTO 三层清晰
2. **依赖注入**：Service 之间通过 DI 解耦，单元测试时可以轻松 mock
3. **装饰器**：`@Get()`, `@Post()`, `@UseGuards()` 声明式编程，代码即文档
4. **兼容 Express**：底层默认使用 Express，Express 生态的中间件都能用

### Fastify 的特点

性能最好（基准测试比 Express 快 2-3 倍），但在 Bookmark 这种单用户/少用户场景下，性能差异几乎感知不到。

### Koa 的定位

Express 原班人马打造的"下一代"框架，用 async/await 替代回调，但同样没有代码组织约束。

## 选择 NestJS 的场景依据

- Bookmark 需要用户认证、文件上传、参数校验 → NestJS 全部内置
- 前端是 React + TypeScript → NestJS 原生 TS，前后端类型可共享
- 作为学习项目 → NestJS 的模块化架构教会你正确的后端代码组织方式
- 未来可能扩展功能 → 模块化架构天然支持功能扩展

## 什么时候不该选 NestJS

- 极简 API（几个接口）→ Express/Fastify 更轻量
- 对性能极致要求 → Fastify
- 团队不熟悉装饰器/DI 概念且项目紧急 → Express 上手最快

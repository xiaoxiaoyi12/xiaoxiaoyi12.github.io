---
title: "前端项目测试用例编写指南"
date: 2026-03-24
category: "前端工程化"
tags: [Testing, Vitest, Testing Library, Playwright]
---

## 概述

"写代码不写测试，就像走钢丝不挂安全绳——大部分时候没事，但出事就是大事。"

前端测试的目标很简单：**确保你的代码按预期工作，并且改代码的时候不会不小心搞坏已有的功能。**

这篇笔记介绍前端测试的完整知识体系，从理论到实践，从工具选择到编写技巧。

---

## 测试金字塔

前端测试分三个层级，像金字塔一样，底层数量多、速度快，顶层数量少、速度慢：

```
        /  E2E 测试  \           ← 少量，测完整用户流程
       / 组件测试      \          ← 适量，测组件交互
      / 单元测试          \       ← 大量，测函数逻辑
     /____________________\
```

| 层级 | 测什么 | 用什么工具 | 占比建议 | 运行速度 |
|------|--------|------------|----------|----------|
| 单元测试 | 函数、hooks、工具方法 | Vitest / Jest | ~70% | 毫秒级 |
| 组件测试 | 组件渲染、用户交互、状态变化 | Testing Library | ~20% | 秒级 |
| E2E 测试 | 用户完整操作流程 | Playwright / Cypress | ~10% | 十秒级 |

### 为什么是金字塔形？

- **单元测试**：运行飞快（几毫秒一个），写起来简单，但只能测局部逻辑
- **组件测试**：需要模拟 DOM 环境，稍慢，但能测用户交互
- **E2E 测试**：需要启动真实浏览器，最慢，但最接近真实用户体验

如果你只有 E2E 测试（倒金字塔），跑一次测试可能要 10 分钟，开发效率极低。如果你只有单元测试，函数都没问题但页面可能根本打不开。所以需要**组合使用**。

---

## 核心原则

### 1. 测试行为，不测实现

这是最重要的原则。**站在用户的角度测试**，而不是站在代码的角度。

```tsx
// ❌ 错误：测试实现细节（依赖 CSS 类名和内部状态）
const button = container.querySelector('.btn-primary');
expect(component.state.isLoading).toBe(true);

// ✅ 正确：测试用户能看到和操作的东西
const button = screen.getByRole('button', { name: '提交' });
await userEvent.click(button);
expect(screen.getByText('加载中...')).toBeInTheDocument();
```

**为什么？** 如果你测实现细节（比如 CSS 类名），改了样式测试就挂。但用户根本不关心你用什么类名，他们只关心按钮能不能点、文字对不对。

### 2. 每个测试独立运行

```tsx
// ❌ 错误：测试之间有依赖
test('创建用户', () => { userId = createUser(); });
test('删除用户', () => { deleteUser(userId); }); // 依赖上一个测试的 userId

// ✅ 正确：每个测试自给自足
test('删除用户', () => {
  const userId = createUser();  // 自己创建测试数据
  deleteUser(userId);
});
```

**为什么？** 测试的运行顺序不应该影响结果。如果测试 A 必须在测试 B 之前运行，那当 A 失败时，B 也会失败，你就搞不清楚到底哪里有问题。

### 3. 只 Mock 外部边界

```tsx
// ❌ 错误：Mock 自己写的模块
vi.mock('./utils/formatDate');  // 这是你自己写的函数

// ✅ 正确：Mock 外部依赖
vi.mock('axios');                // 外部 HTTP 库
vi.mock('./api/userService');    // 调用后端 API 的服务层
```

**什么是"外部边界"？** 就是你的代码和外部世界交互的地方：
- 后端 API（网络请求）
- 浏览器 API（localStorage、navigator 等）
- 第三方服务（支付、推送等）
- 当前时间（`Date.now()`）

这些东西在测试环境中不可控（比如后端可能挂了），所以需要 Mock。但你自己写的工具函数，让它真实运行就好。

### 4. 优先测试关键路径

不是所有代码都值得测试。优先级排序：

```
高优先 ─── 工具函数 / hooks（纯逻辑，最容易测，价值最高）
   │        例：formatDate()、useAuth()、计算价格的函数
   │
中优先 ─── 业务组件（有交互逻辑的组件）
   │        例：登录表单、购物车、搜索框
   │
低优先 ─── 页面组件（主要是组合其他组件，逻辑少）
   │        例：HomePage、AboutPage
   │
最低 ──── 纯展示组件（只接收 props 渲染 UI）
            例：Avatar、Badge、Divider
```

---

## 推荐技术栈

### Vitest — 单元测试框架

**为什么选 Vitest？**
- 和 Vite 无缝集成，共享同一套配置
- 兼容 Jest 的 API（`describe`、`test`、`expect`），迁移成本低
- 速度比 Jest 快很多（利用 Vite 的按需编译）

**基本用法**：

```ts
// utils/math.ts
export function add(a: number, b: number) {
  return a + b;
}

// utils/math.test.ts
import { describe, test, expect } from 'vitest';
import { add } from './math';

describe('add 函数', () => {
  test('两个正数相加', () => {
    expect(add(1, 2)).toBe(3);
  });

  test('负数相加', () => {
    expect(add(-1, -2)).toBe(-3);
  });

  test('零的处理', () => {
    expect(add(0, 5)).toBe(5);
  });
});
```

**运行测试**：
```bash
npx vitest          # 监听模式，文件修改自动重跑
npx vitest run      # 跑一次就退出（适合 CI）
npx vitest --coverage  # 生成覆盖率报告
```

### Testing Library — 组件测试

**核心理念**：以用户的视角测试组件。不关心组件内部怎么实现，只关心用户能看到什么、能操作什么。

**查询元素的优先级**：

| 优先级 | 查询方式 | 适用场景 |
|--------|----------|----------|
| 1（首选） | `getByRole` | 按钮、输入框、链接等有语义的元素 |
| 2 | `getByText` | 通过显示文字查找 |
| 3 | `getByLabelText` | 表单元素（通过 label 关联） |
| 4 | `getByPlaceholderText` | 输入框的 placeholder |
| 5（最后手段） | `getByTestId` | 实在没有其他方式时，加 data-testid |

**示例**：

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

test('输入错误密码时显示错误提示', async () => {
  // 渲染组件
  render(<LoginForm />);

  // 模拟用户操作
  await userEvent.type(screen.getByLabelText('用户名'), 'admin');
  await userEvent.type(screen.getByLabelText('密码'), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));

  // 验证结果
  expect(screen.getByText('密码错误')).toBeInTheDocument();
});
```

### Playwright — E2E 测试

**作用**：启动真实浏览器，模拟完整的用户操作流程。

**示例**：

```ts
import { test, expect } from '@playwright/test';

test('用户可以登录并查看首页', async ({ page }) => {
  // 打开登录页
  await page.goto('http://localhost:3000/login');

  // 填写表单
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');

  // 验证跳转到首页
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(page.getByText('欢迎回来')).toBeVisible();
});
```

---

## 常见 Mock 场景

### Mock API 请求

```ts
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

test('获取用户列表', async () => {
  // 设置 Mock 返回值
  vi.mocked(axios.get).mockResolvedValue({
    data: [{ id: 1, name: '张三' }]
  });

  const users = await fetchUsers();

  expect(users).toHaveLength(1);
  expect(users[0].name).toBe('张三');
});
```

### Mock 浏览器 API

```ts
test('复制文字到剪贴板', async () => {
  // Mock navigator.clipboard
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, {
    clipboard: { writeText }
  });

  await copyToClipboard('Hello');

  expect(writeText).toHaveBeenCalledWith('Hello');
});
```

### Mock 当前时间

```ts
test('显示相对时间', () => {
  // 固定当前时间为 2026-03-24 12:00:00
  vi.setSystemTime(new Date('2026-03-24T12:00:00'));

  expect(formatRelativeTime('2026-03-24T11:00:00')).toBe('1 小时前');

  vi.useRealTimers(); // 恢复真实时间
});
```

---

## 测试文件组织

### 文件命名和存放

```
src/
├── utils/
│   ├── format.ts
│   └── format.test.ts        ← 和源文件放一起
├── components/
│   ├── LoginForm.tsx
│   └── LoginForm.test.tsx     ← 和组件放一起
└── __tests__/                  ← 或者统一放在 __tests__ 目录
    └── integration/
        └── auth.test.ts
```

推荐和源文件放一起（`xxx.test.ts`），这样：
- 一眼就能看到哪些文件有测试、哪些没有
- 文件移动时测试跟着走，不容易丢

### describe 和 test 的组织

```ts
describe('购物车', () => {
  describe('添加商品', () => {
    test('添加新商品到空购物车', () => { ... });
    test('同一商品数量加 1', () => { ... });
    test('不同商品各自独立', () => { ... });
  });

  describe('删除商品', () => {
    test('删除后购物车为空', () => { ... });
    test('只删除指定商品', () => { ... });
  });
});
```

---

## 总结

| 要点 | 说明 |
|------|------|
| 测什么 | 行为，不是实现 |
| 用什么查询 | 优先 `getByRole`、`getByText` |
| Mock 什么 | 只 Mock 外部边界（API、浏览器 API） |
| 先测什么 | 工具函数 > 业务组件 > 页面组件 |
| 文件放哪 | 和源文件放一起（`xxx.test.ts`） |
| 金字塔 | 单元测试多、E2E 少 |

## 参考

- [Vitest 官方文档](https://vitest.dev/)
- [Testing Library 官方文档](https://testing-library.com/)
- [Playwright 官方文档](https://playwright.dev/)
- [Kent C. Dodds - Testing JavaScript](https://testingjavascript.com/)

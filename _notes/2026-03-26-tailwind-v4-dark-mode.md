---
title: "Tailwind CSS v4 暗色模式配置"
date: 2026-03-26
category: "CSS"
tags: [Tailwind, CSS, Dark Mode]
---

## 概述

Tailwind CSS v4 对暗色模式的配置方式做了重大改变。如果你之前用过 v3，会发现 v4 **不再使用 `tailwind.config.js`**，而是完全在 CSS 层面声明配置。

这篇笔记记录了 v3 和 v4 的差异，以及如何在 v4 中正确配置 class-based 暗色模式。

---

## v3 的做法（旧方式）

在 v3 中，你需要在 `tailwind.config.js` 中配置：

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 基于 class 切换
  // ...
}
```

然后在 HTML 中通过添加 `dark` 类来切换：

```html
<html class="dark">
  <body class="bg-white dark:bg-gray-900">
    <!-- 内容 -->
  </body>
</html>
```

这种方式的核心是：**配置写在 JS 文件里**，Tailwind 通过 `darkMode: 'class'` 知道用 `.dark` 选择器来匹配暗色样式。

---

## v4 的做法（新方式）

v4 把所有配置都搬到了 CSS 里。暗色模式使用 `@custom-variant` 指令声明：

```css
/* app.css */
@import "tailwindcss";

/* 声明 dark 变体基于 class */
@custom-variant dark (&:where(.dark, .dark *));
```

这行 CSS 的意思是：**当元素自身或祖先元素有 `.dark` 类时，`dark:` 前缀的样式生效**。

HTML 用法和 v3 完全一样：

```html
<html class="dark">
  <body class="bg-white dark:bg-gray-900">
    <!-- 内容 -->
  </body>
</html>
```

---

## 为什么要改？

v4 的设计理念是 **CSS-first**：

| 方面 | v3 | v4 |
|------|-----|-----|
| 配置位置 | `tailwind.config.js`（JS） | CSS 文件（`@custom-variant`） |
| 配置方式 | `darkMode: 'class'` | `@custom-variant dark (...)` |
| 自定义能力 | 有限，只能选 `class` 或 `media` | 完全自定义选择器逻辑 |
| 构建工具依赖 | 需要 PostCSS + config 解析 | 纯 CSS 层声明 |

好处是：
1. **零配置文件** —— 不需要 `tailwind.config.js`
2. **更灵活** —— 你可以定义任意选择器逻辑，比如 `[data-theme="dark"]`
3. **更直观** —— 配置就在 CSS 里，和样式放在一起

---

## 常见的自定义选择器

```css
/* 基于 class（最常见） */
@custom-variant dark (&:where(.dark, .dark *));

/* 基于 data 属性 */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* 基于系统偏好（默认行为，不需要额外配置） */
/* Tailwind v4 默认用 @media (prefers-color-scheme: dark) */
```

---

## 实际使用示例

以 bookmark 项目为例，配合 Zustand 管理主题状态：

```typescript
// 主题切换逻辑
function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
```

组件中使用 `dark:` 前缀：

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 className="text-black dark:text-white">标题</h1>
</div>
```

---

## 迁移注意事项

从 v3 迁移到 v4 时：

1. **删除** `tailwind.config.js` 中的 `darkMode` 配置
2. **添加** `@custom-variant dark (&:where(.dark, .dark *));` 到主 CSS 文件
3. HTML 中的 `dark:` 前缀用法**不变**，无需修改组件代码
4. 如果之前用的是 `darkMode: 'media'`（跟随系统），v4 默认就是这个行为，不需要额外配置

---

## 总结

| 你想要的效果 | v4 怎么做 |
|-------------|----------|
| 跟随系统（默认） | 什么都不用配，直接用 `dark:` |
| 手动切换（class） | `@custom-variant dark (&:where(.dark, .dark *));` |
| 手动切换（data 属性） | `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` |

一句话总结：**v4 把配置从 JS 搬到了 CSS，更简洁也更灵活。**

# Theme Switching Design

## Overview

为 GitHub Pages 博客添加主题切换功能,支持暗色、亮色(暖色纸张风)和跟随系统三种模式。

## 技术方案

使用 CSS 变量 + `data-theme` 属性。在 `<html>` 元素上设置 `data-theme="dark|light"`,通过 CSS 变量定义颜色,JS 负责切换属性并持久化到 `localStorage`。

## CSS 变量定义

### 暗色主题 `[data-theme="dark"]`

基于当前 GitHub Dark 风格,保持不变:

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-page` | `#0d1117` | 页面背景 |
| `--bg-card` | `#161b22` | 卡片/代码块背景 |
| `--border` | `#21262d` | 主边框 |
| `--border-light` | `#30363d` | 次要边框 |
| `--text-primary` | `#c9d1d9` | 主文字 |
| `--text-secondary` | `#b0b8c1` | 次要文字 |
| `--text-muted` | `#8b949e` | 弱化文字 |
| `--text-dimmed` | `#484f58` | 最弱文字 |
| `--accent` | `#58a6ff` | 强调色/链接 |
| `--accent-hover` | `#79c0ff` | 强调色悬停 |
| `--accent-bg` | `rgba(56,130,246,0.08)` | 强调色背景 |
| `--accent-border` | `#1f3a5f` | 强调色边框 |

### 亮色主题 `[data-theme="light"]`

暖色纸张风格:

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-page` | `#fafaf8` | 页面背景 |
| `--bg-card` | `#f0efe8` | 卡片/代码块背景 |
| `--border` | `#d5d3c8` | 主边框 |
| `--border-light` | `#e0dfd6` | 次要边框 |
| `--text-primary` | `#2c2c2a` | 主文字 |
| `--text-secondary` | `#4a4a45` | 次要文字 |
| `--text-muted` | `#8a8778` | 弱化文字 |
| `--text-dimmed` | `#b0ad9e` | 最弱文字 |
| `--accent` | `#5a7a3a` | 强调色/链接 |
| `--accent-hover` | `#4a6630` | 强调色悬停 |
| `--accent-bg` | `rgba(90,122,58,0.08)` | 强调色背景 |
| `--accent-border` | `#a8c080` | 强调色边框 |

## 切换按钮

- **位置**: 导航栏搜索框右侧
- **样式**: 圆形图标按钮(28x28px),背景与导航栏融合
- **交互**: 点击循环切换 🌙(暗色) → ☀️(亮色) → 💻(系统)
- **无障碍**: `aria-label` 标注当前状态

## 主题初始化(防闪烁)

在远程主题的 `<head>` 无法直接修改,因此通过 `_includes/theme-init.html` 在 `<body>` 开头尽早执行初始化脚本:

```javascript
(function() {
  var saved = localStorage.getItem('theme') || 'system';
  var theme;
  if (saved === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    theme = saved;
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
```

由于使用远程主题,`default.html` 不在本地,初始化脚本放在各布局的最顶部执行。

## 跟随系统模式

当用户选择"系统"模式时:
1. 读取 `matchMedia('(prefers-color-scheme: dark)')` 决定当前主题
2. 添加 `change` 事件监听,系统主题变化时自动切换
3. `localStorage` 中存储 `'system'`,而非具体主题值

## 涉及文件

| 文件 | 操作 | 改动说明 |
|------|------|----------|
| `assets/css/style.scss` | 修改 | 添加 CSS 变量定义,将所有硬编码颜色替换为变量引用 |
| `_layouts/home.html` | 修改 | 内联样式改用 CSS 变量,添加切换按钮,引入初始化脚本 |
| `_layouts/post.html` | 修改 | 引入初始化脚本 |
| `_includes/theme-toggle.html` | 新建 | 主题初始化脚本 + 切换按钮 HTML + 切换逻辑 JS |

## 用户偏好持久化

- 存储: `localStorage.setItem('theme', value)`,value 为 `'dark'`/`'light'`/`'system'`
- 默认: `'system'`(首次访问时跟随系统)
- 读取时机: 页面加载最早阶段,避免闪烁

## 不涉及的范围

- `/bookmark/` 子应用有独立的暗色模式实现,不受影响
- 远程 Hacker 主题的 `default.html` 不做本地覆盖
- 不涉及字体或排版变更

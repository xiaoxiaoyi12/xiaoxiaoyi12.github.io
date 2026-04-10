# Changelog

记录博客项目的重大版本改动（每日博客内容不在此记录）。

---

## 2026-04-10 - 新增阅读笔记、生活感想模块 + 文章加密功能

### 新增模块
- 新增 `_readings/` 阅读笔记集合，URL 路径 `/readings/:name/`
- 新增 `_thoughts/` 生活感想集合，URL 路径 `/thoughts/:name/`
- 首页从 3 个 tab（文章/笔记/bookmark）扩展为 5 个 tab（文章/笔记/阅读/感想/bookmark）
- 搜索功能覆盖所有模块

### 文章加密（AES-256-CBC）
- 支持对任意文章进行 AES-256 加密，查看源码也无法读取内容
- 支持全站统一密码 + 单篇独立密码
- 新增 `scripts/encrypt.js` 加密脚本、`scripts/decrypt.js` 解密脚本
- 新增 `_layouts/protected-post.html` 加密文章布局（CryptoJS + marked.js 客户端解密渲染）
- 加密文章在首页列表显示锁图标
- 使用方式：`BLOG_PASSWORD=xxx npm run encrypt` / `npm run decrypt`

### 涉及文件
- 新增：`_readings/`、`_thoughts/`、`_layouts/protected-post.html`、`scripts/encrypt.js`、`scripts/decrypt.js`、`package.json`
- 修改：`_config.yml`、`_layouts/home.html`、`assets/css/style.scss`、`.gitignore`、`CLAUDE.md`

---

## 2026-04-07 - 博客基础搭建

- Jekyll + hacker theme 搭建 GitHub Pages 博客
- 首页 tab 切换（文章/笔记/bookmark）+ 搜索功能
- 深色/浅色/跟随系统 三种主题切换
- `_notes/` 学习笔记集合，按 category 分组展示
- 90 天全栈学习计划（`plan/` + `study/`）
- bookmark 阅读器子项目部署

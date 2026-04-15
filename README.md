# My Daily Log

每日工作与学习日志，基于 Next.js 构建，托管在 GitHub Pages。

🔗 **在线访问：** [https://xiaoxiaoyi12.github.io](https://xiaoxiaoyi12.github.io)

## 简介

个人博客，用于记录日常工作、学习笔记、阅读心得和生活感想。支持深色/浅色/跟随系统三种主题，内置管理后台（Markdown 编辑器 + GitHub API）。

## 技术栈

- **框架**：Next.js 16（App Router，静态导出 SSG）
- **语言**：TypeScript
- **样式**：Tailwind CSS 4 + CSS 变量主题
- **Markdown**：unified（remark + rehype + shiki 代码高亮）
- **部署**：GitHub Actions → GitHub Pages

## 内容分类

| 分类 | 目录 | 说明 |
|------|------|------|
| 文章 | `content/posts/` | 每日工作与学习日志 |
| 笔记 | `content/notes/` | 学习笔记，按类别分组 |
| 阅读 | `content/readings/` | 阅读笔记，按类别分组 |
| 感想 | `content/thoughts/` | 生活感想与随笔 |

文件命名格式：`YYYY-MM-DD-<slug>.md`

## 项目结构

```
src/
  app/               # Next.js App Router 页面
    page.tsx          # 首页（4 Tab + 搜索）
    posts/[slug]/     # 文章详情
    notes/[slug]/     # 笔记详情
    readings/[slug]/  # 阅读详情
    thoughts/[slug]/  # 感想详情
    admin/            # 管理后台
  components/         # React 组件
  lib/                # 内容解析、Markdown 渲染、GitHub API
  styles/             # 全局样式 + 主题变量
content/              # Markdown 文章
  posts/ notes/ readings/ thoughts/
.github/workflows/    # GitHub Actions 部署
```

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

浏览器打开 `http://localhost:3000` 预览。

## 管理后台

访问 `/admin/` 进入管理面板：

- **文章列表**：筛选、搜索、编辑、删除
- **新建文章**：Front matter 表单 + Markdown 编辑器 + 实时预览
- **设置**：配置 GitHub Token（数据通过 GitHub API 读写）

首次使用需在设置页配置 GitHub Personal Access Token。

## 部署

推送到 `master` 分支后，GitHub Actions 自动执行 `pnpm build` 并部署到 GitHub Pages。

# My Daily Log

每日工作与学习日志，基于 Jekyll 构建，托管在 GitHub Pages。

🔗 **在线访问：** [https://xiaoxiaoyi12.github.io](https://xiaoxiaoyi12.github.io)

## 简介

这是一个个人每日记录博客，用于记录日常的工作内容和学习笔记。网站使用 Jekyll 的 [Hacker 主题](https://github.com/pages-themes/hacker)，风格简洁。

## 内容分类

- **文章**（`_posts/`）：每日工作与学习日志
- **笔记**（`_notes/`）：学习笔记，按类别分组展示

## 项目结构

```
├── _config.yml          # Jekyll 全局配置
├── _layouts/
│   └── home.html        # 首页布局模板
├── _posts/              # 日志文章
├── _notes/              # 学习笔记（自定义集合）
├── assets/css/
│   └── style.scss       # 自定义样式
└── index.md             # 首页入口
```

## 本地开发

需要安装 [Ruby](https://www.ruby-lang.org/) 和 [Bundler](https://bundler.io/)。

```bash
# 安装依赖
bundle install

# 启动本地服务器
bundle exec jekyll serve
```

浏览器打开 `http://localhost:4000` 预览。

## 发布方式

推送到 `master` 分支后，GitHub Pages 会自动构建并部署。

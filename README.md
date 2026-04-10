# My Daily Log

每日工作与学习日志，基于 Jekyll 构建，托管在 GitHub Pages。

🔗 **在线访问：** [https://xiaoxiaoyi12.github.io](https://xiaoxiaoyi12.github.io)

## 简介

这是一个个人博客，用于记录日常工作、学习笔记、阅读心得和生活感想。网站使用 Jekyll 的 [Hacker 主题](https://github.com/pages-themes/hacker)，支持深色/浅色主题切换，部分文章支持 AES 加密保护。

## 内容分类

- **文章**（`_posts/`）：每日工作与学习日志
- **笔记**（`_notes/`）：学习笔记，按类别分组展示
- **阅读**（`_readings/`）：阅读笔记，按类别分组展示
- **感想**（`_thoughts/`）：生活感想与随笔

## 项目结构

```
├── _config.yml          # Jekyll 全局配置
├── _layouts/
│   ├── home.html        # 首页布局模板
│   ├── post.html        # 文章布局
│   └── protected-post.html  # 加密文章布局
├── _posts/              # 日志文章
├── _notes/              # 学习笔记（自定义集合）
├── _readings/           # 阅读笔记（自定义集合）
├── _thoughts/           # 生活感想（自定义集合）
├── scripts/
│   ├── encrypt.js       # 文章加密脚本
│   └── decrypt.js       # 文章解密脚本
├── assets/css/
│   └── style.scss       # 自定义样式
├── logs/
│   └── CHANGELOG.md     # 版本改动记录
├── bookmark/            # bookmark 阅读器（子项目）
└── index.md             # 首页入口
```

## 文章加密

支持对任意文章进行 AES-256 加密，即使查看网页源码也无法读取内容。

```bash
# 在文章 front matter 中添加 protected: true，然后运行：
BLOG_PASSWORD=你的密码 npm run encrypt

# 需要编辑时解密：
BLOG_PASSWORD=你的密码 npm run decrypt
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

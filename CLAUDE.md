# 项目说明

这是一个 GitHub Pages 博客 + 90 天全栈学习计划仓库。

- 博客地址：https://xiaoxiaoyi12.github.io
- 主题：Jekyll + hacker theme
- 分支：master

## 目录结构

```
_posts/          → 每日博客日志（格式：YYYY-MM-DD-daily-log.md）
_notes/          → 学习笔记文章（格式：YYYY-MM-DD-<topic-slug>.md）
_readings/       → 阅读笔记（格式：YYYY-MM-DD-<book-slug>.md）
_thoughts/       → 生活感想（格式：YYYY-MM-DD-<topic-slug>.md）
admin/           → 在线管理后台 SPA（index.html 单文件）
scripts/         → 工具脚本
  ├── encrypt.js → 加密标记了 protected: true 的文章
  ├── decrypt.js → 解密文章（用于编辑）
  └── admin-server.js → 本地管理服务（npm run admin）
plan/            → 90 天学习计划（只读，不要修改除非用户要求）
  ├── README.md
  ├── phase1-foundation-backend.md   (Day 1-20)
  ├── phase2-fullstack-system.md     (Day 21-45)
  ├── phase3-visualization-product.md (Day 46-65)
  └── phase4-polish-growth.md        (Day 66-90)
study/           → 每日学习笔记（记录独立思考、AI 辅助、Review）
  ├── phase1/day01.md ~ day20.md
  ├── phase2/day21.md ~ day45.md
  ├── phase3/day46.md ~ day65.md
  └── phase4/day66.md ~ day90.md
bookmark/        → bookmark 阅读器前端项目（子目录部署）
```

## 核心项目：Bookmark Reader

正在从纯前端升级为全栈应用。

- 技术栈：React + TypeScript | NestJS | PostgreSQL | Prisma
- 当前数据存储：IndexedDB（浏览器端）
- 目标：迁移到 PostgreSQL，实现多设备同步

## 学习笔记规则

1. **学习文章统一放 `_notes/` 目录**，不要放在 `study/` 或其他地方
2. `_notes/` 文件必须有 Jekyll front matter（title, date, category, tags）
3. `study/phaseN/dayNN.md` 中通过链接引用 `_notes/` 的文章，格式：`[标题](/notes/YYYY-MM-DD-slug/)`
4. `_posts/` 日志中同样用链接引用 `_notes/` 的文章
5. 笔记文件命名：`YYYY-MM-DD-<英文小写短横线>.md`

## 每日笔记模板类型

study 目录下的每日笔记有 5 种模板：

| 类型 | 适用日 | 核心结构 |
|------|--------|---------|
| practice | 周一~周四 | 独立思考 → AI辅助 → Review → 产出 → 遗留 |
| theory | 周五原理日 | 带着问题学 → 理解 → 联系bookmark → AI检查 → 博客草稿 |
| challenge | 周六挑战日 | 拆解 → 实现 → 完成情况 → AI对比 → 真实掌握度 |
| vision | 周日视野日 | 研究对象 → 分析 → 可借鉴的点 → 博客草稿 |
| wrap | 阶段总结 | 回顾 → 掌握了什么 → 模糊的地方 → 下阶段准备 |

## 每日学习协作流程

用户每天的学习过程中，AI 需要主动完成以下工作：

1. **Review 独立思考**：用户写完"独立思考记录"后，对内容进行评审，给出评分和改进建议，写入"AI 辅助记录"
2. **完成 AI 辅助任务**：读取 `plan/` 中当天计划的"AI 辅助"部分，主动完成（如生成代码、转 Mermaid 图、补充遗漏、给出意见等）
3. **生成学习笔记**：将产出的文章/教程写入 `_notes/`，在当天 study 笔记中链接引用
4. **检查其他可做的事**：查看当天计划的"Review 要点"和"产出"部分，有能帮忙的主动做

## 日志发布流程（/daily-log）

1. 检查 `_posts/YYYY-MM-DD-daily-log.md` 是否存在
2. 收集内容（用户提供 / git log 自动总结 / 询问）
3. 自动提取 tags
4. 如有学习内容，同步创建 `_notes/` 学习笔记
5. 询问发布方式（自动推送 / 手动）

## Git 规范

- 日志提交信息：`Add daily log YYYY-MM-DD`
- 推送到 master 分支
- bookmark 子项目通过 GitHub Actions 部署，使用 `keep_files: true` 避免覆盖博客内容

## 文章加密工作流

支持对任意文章（_posts/_notes/_readings/_thoughts/）进行 AES-256 加密。
采用 **主密钥 + CEK（内容加密密钥）双层架构**，支持忘记密码后通过主恢复密钥找回。

### 首次使用：初始化主恢复密钥
1. 运行 `npm run init-master-key`
2. 将生成的主恢复密钥保存到密码管理器等安全位置
3. 主密钥保存在 `.master-key` 文件（已加入 .gitignore）

### 加密步骤
1. 在文章 front matter 中添加 `protected: true`
2. 可选：添加 `password: "自定义密码"`（不设则使用全局密码）
3. 可选：添加 `password_hint: "提示信息"`
4. 运行 `npm run encrypt`（或 `BLOG_PASSWORD=xxx npm run encrypt`）
5. 脚本会：生成随机 CEK → 用 CEK 加密正文 → 用密码和主密钥分别加密 CEK
6. 提交并推送

### 编辑加密文章
1. 运行 `npm run decrypt`（或指定文件 `npm run decrypt -- _thoughts/xxx.md`）
2. 编辑明文内容
3. 重新运行 `npm run encrypt`
4. 提交并推送

### 修改密码
1. 运行 `npm run change-password`（或指定文件 `npm run change-password -- _thoughts/xxx.md`）
2. 输入旧密码和新密码（只重新加密 CEK，密文不变）
3. 也可通过环境变量：`OLD_PASSWORD=old NEW_PASSWORD=new npm run change-password`
4. 提交并推送

### 忘记密码恢复
1. 运行 `npm run recover-password`（或指定文件）
2. 输入主恢复密钥和新密码
3. 也可通过环境变量：`MASTER_KEY=xxx NEW_PASSWORD=new npm run recover-password`
4. 提交并推送

### 旧格式迁移
已有旧格式加密文章需迁移到新格式：
1. 运行 `npm run migrate`（或指定文件）
2. 输入原密码，脚本会自动转换为 CEK 架构

### 密码来源优先级
1. 文章 front matter 中的 `password` 字段（单篇独立密码）
2. 环境变量 `BLOG_PASSWORD`（全局密码）
3. 交互式输入

### 脚本清单
| 命令 | 说明 |
|------|------|
| `npm run init-master-key` | 生成主恢复密钥 |
| `npm run encrypt` | 加密文章 |
| `npm run decrypt` | 解密文章（还原为明文编辑） |
| `npm run change-password` | 修改密码（只重加密 CEK） |
| `npm run recover-password` | 忘记密码时用主密钥恢复 |
| `npm run migrate` | 旧格式迁移到新格式 |

## 在线管理后台（/admin）

浏览器端博客管理面板，支持文章 CRUD、加密/解密、Markdown 实时预览。

- **访问地址**：https://xiaoxiaoyi12.github.io/admin/
- **首次使用**：进入设置页（#settings），配置 GitHub Personal Access Token
- **存储模式**：GitHub API（在线）或本地 Node 服务（离线），支持自动检测
- **本地服务**：`npm run admin`（端口 3001，零依赖）
- **技术**：纯 HTML/CSS/JS 单文件 SPA（admin/index.html），CryptoJS + marked.js CDN
- **加密兼容**：浏览器端加密与 CLI 脚本、`protected-post.html` 完全兼容

### 管理后台功能
| 页面 | 路由 | 功能 |
|------|------|------|
| 文章列表 | #list | 四种内容类型切换、搜索、加密/解密/编辑/删除 |
| Markdown 编辑器 | #edit | Front matter 表单、实时预览、草稿自动保存、加密发布 |
| 设置 | #settings | GitHub 连接配置、本地服务配置、主题切换、文章模板 |

### 相关脚本
| 命令 | 说明 |
|------|------|
| `npm run admin` | 启动本地管理服务（端口 3001） |
| `npm run test:crypto` | 运行加密兼容性测试（14 项） |

## VS Code 锚点跳转

plan 文件和 study 文件之间通过 heading-based slug 跳转（不用 HTML `<a id>` 标签）。VS Code 使用自己的 slugify 算法生成锚点。

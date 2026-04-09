# 项目说明

这是一个 GitHub Pages 博客 + 90 天全栈学习计划仓库。

- 博客地址：https://xiaoxiaoyi12.github.io
- 主题：Jekyll + hacker theme
- 分支：master

## 目录结构

```
_posts/          → 每日博客日志（格式：YYYY-MM-DD-daily-log.md）
_notes/          → 学习笔记文章（格式：YYYY-MM-DD-<topic-slug>.md）
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

## VS Code 锚点跳转

plan 文件和 study 文件之间通过 heading-based slug 跳转（不用 HTML `<a id>` 标签）。VS Code 使用自己的 slugify 算法生成锚点。

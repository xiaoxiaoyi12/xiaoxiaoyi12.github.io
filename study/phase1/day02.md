# Day 2 — 数据库设计

> 日期：\_**\_-**-\_\_
>
> 对应计划：[phase1-foundation-backend.md](../../plan/phase1-foundation-backend.md#day-2周二-数据库设计)

## 独立思考记录

<!-- 写下你对今天问题的思考、拆解过程 -->

本地为什么要安装PostgreSQL?PostgreSQL的作用是什么？是否存在同类型产品？互相之间的差异在哪？
PostgreSQL如何安装？
PostgreSQL如何使用？

1. 需要哪些表

- 用户表
- 书单表
- 笔记表
- 高亮表
  用户Id 找到对应的书单，每个书的ID对应笔记表和高亮表
  四个表都是有关联的

2. 设计表字段
   用户表：
   - 唯一ID:Integer
   - 用户Id:Integer
   - 用户名:char
   - 密码:char
   - 头像:str
   - 邮箱:str
     书单表：
   - 用户ID：Integer
   - 书籍ID:Integer 唯一，新增时创建
   - 书籍名称:str
   - 书籍作者:str
   - 书籍格式:web/epub/pdf
   - webURl?：str
   - 书籍进度:{页码：Integer}
     笔记表
   - 书籍ID:Integer
   - 笔记ID:Integer
   - 笔记内容:json
     高亮表
   - 书籍ID:Integer
   - 高亮内容:str
     标签表
   - 书籍ID:Integer
   - 标签内容：str
3. 关系图
   用户表和书籍表 是一对多关系 一个用户可以有多本书，
   书籍表和tag 是多对多关系
4. 踩坑

- 如果用户删除一本书时，弹窗询问是否删除笔记和高亮list,同意再删除，最好也支持单本书笔记和高亮list 导出，可能用户有这个需求

- 高亮list很多条时，可以做分页处理，另外也可以首次加载后保存到本地，再次打开从本地读取

## AI 辅助记录

### 对独立思考的 Review

#### 1. 表的识别 — 基本到位，有遗漏

你列了 5 张表（用户、书单、笔记、高亮、标签），核心都覆盖了。但缺了两个：

- **阅读进度表（Progress）**：你把进度放在了书单表的字段里（`书籍进度:{页码:Integer}`）。问题是 EPUB 的进度不是页码，而是 CFI 定位字符串，且进度更新频率远高于书籍信息（每 30 秒更新一次），独立成表更合理
- **用户设置表（Setting）**：主题偏好、阅读设置等，虽然可以后面加，但架构阶段应该先预留

> 评分：7/10

#### 2. 字段设计 — 方向对，多处需要修正

**用户表问题**：
- `唯一ID` 和 `用户Id` 重复了。数据库表的 `id` 就是唯一标识，不需要再加一个 `用户Id`
- `密码:char` → 应该存 **bcrypt 哈希值**（约 60 字符），字段名应该叫 `password_hash`，绝不能存明文
- 缺少 `created_at`、`updated_at` 时间戳（几乎每个表都要有）

**书单表问题**：
- `用户ID：Integer` → 你的原始设计是 `用户ID：[]`（数组），后来改成了 Integer，这个修正是对的。一本书属于一个用户（一对多），不是数组
- `书籍进度:{页码:Integer}` → 类型应该是 JSONB 而不是简单 Integer，因为 EPUB 进度是 CFI 字符串不是页码。而且建议独立成 Progress 表
- `webUrl?：str` → 好的设计意识，Web 格式才有 URL。但更好的做法是统一为 `file_path` 字段，Web 格式存 URL，EPUB/PDF 存文件路径
- 缺少 `cover_url`（封面图）、`file_size`（文件大小，安全校验需要）

**笔记表问题**：
- `笔记内容:json` → 为什么用 JSON？纯文本内容用 TEXT 就行。如果是富文本编辑器的结构化数据，用 JSONB 可以，但要说清理由
- 缺少**定位信息**：笔记写在书的哪个位置？需要 `cfi_range`（EPUB）或 `page_number`（PDF）
- 缺少 `created_at`、`updated_at`

**高亮表问题**：
- `高亮内容:str` → 应该叫 `text`（高亮的原文）
- 缺少 `color`（高亮颜色，你的 bookmark 支持多色高亮）
- 缺少 `position: JSONB`（定位信息，这正是选 PostgreSQL 的原因之一）

**标签表问题**：
- `书籍ID:Integer` → 你自己写了"书籍和 tag 是多对多关系"，但字段设计只放了一个 `书籍ID`，这只能表达一对多。多对多需要一张**中间表** `BookTag`（book_id, tag_id）

> 评分：4/10 — 核心字段有但类型和命名需要大量修正，时间戳全部缺失

#### 3. 关系图 — 理解正确，表达需要更精确

- "用户和书籍是一对多" ✅ 正确
- "书籍和 tag 是多对多" ✅ 正确
- 但你没有画出完整关系：`User --1:N--> Book --1:N--> Note`、`Book --1:N--> Highlight`、`Book --1:1--> Progress`
- 多对多关系缺少中间表的说明

> 评分：6/10

#### 4. 踩坑思考 — 亮点！

你的两个踩坑思考质量很好：

- **删除书时弹窗确认 + 导出笔记和高亮** → 很好的用户体验思考，说明你在从产品角度想问题。技术上这对应数据库的 `onDelete` 策略：不用级联删除（CASCADE），而是先让用户确认再手动删除关联数据
- **高亮分页 + 本地缓存** → 很实际的性能优化思路。不过"首次加载后保存到本地"要注意和服务端数据同步的问题——如果在另一台设备加了新高亮，本地缓存就过期了

> 评分：8/10 — 这部分是今天的亮点

#### 总结评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 表的识别 | 7/10 | 核心表都有，缺 Progress 和 Setting |
| 字段设计 | 4/10 | 类型不准确，时间戳全部缺失，命名不规范 |
| 关系图 | 6/10 | 理解正确但不完整，多对多缺中间表 |
| 踩坑思考 | 8/10 | 产品意识好，主动想到了删除确认和性能优化 |

#### 建议补充

1. 给每个表都加上 `id`（UUID）、`created_at`、`updated_at`
2. 把阅读进度从书单表中拆出来，独立成 Progress 表
3. 标签表改为两张：Tag（id, name）+ BookTag（book_id, tag_id）中间表
4. 高亮表加上 `color` 和 `position: JSONB`

---

### AI 辅助任务：Prisma Schema

基于你的设计 + 上述修正，生成了完整的 Prisma Schema → [Bookmark Prisma Schema 设计](/notes/2026-04-09-bookmark-prisma-schema/)

---

- [PostgreSQL 完全入门指南（Mac 版）](/notes/2026-04-09-postgresql-guide/) — What/Why/How 三段式，从安装到 SQL 增删改查到 JSONB 实战

## Review 笔记

<!-- 检查清单的执行结果，发现的问题和修复 -->

## 今日产出

- [x] [PostgreSQL 完全入门指南](/notes/2026-04-09-postgresql-guide/)
- [x] [Bookmark Prisma Schema 设计](/notes/2026-04-09-bookmark-prisma-schema/)

## 遗留问题

<!-- 没搞懂的、需要后续回来补的 -->

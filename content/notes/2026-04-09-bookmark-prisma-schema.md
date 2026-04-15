---
title: "Bookmark Prisma Schema 设计"
date: 2026-04-09
category: "数据库"
tags: [Prisma, PostgreSQL, Database, Schema]
---

## 概述

基于 Day 2 的独立思考和 Review 反馈，将表设计转写为 Prisma Schema，补充了缺失的字段、关系和约束。

## 完整 Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== 用户表 ====================
model User {
  id           String   @id @default(uuid())
  email        String   @unique          // 登录邮箱，唯一
  passwordHash String   @map("password_hash")  // bcrypt 哈希，绝不存明文
  nickname     String?  @db.VarChar(50)  // 显示名，可选
  avatar       String?                    // 头像 URL，可选
  createdAt    DateTime @default(now())  @map("created_at")
  updatedAt    DateTime @updatedAt       @map("updated_at")

  // 关系
  books    Book[]
  setting  Setting?

  @@map("users")
}

// ==================== 书籍表 ====================
model Book {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String   @db.VarChar(500)
  author    String?  @db.VarChar(255)
  format    Format   @default(EPUB)       // epub / pdf / web
  filePath  String?  @map("file_path")    // 文件存储路径（EPUB/PDF）或 URL（Web）
  coverUrl  String?  @map("cover_url")    // 封面图 URL
  fileSize  BigInt?  @map("file_size")    // 文件大小（字节）
  createdAt DateTime @default(now())      @map("created_at")
  updatedAt DateTime @updatedAt           @map("updated_at")

  // 关系
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes      Note[]
  highlights Highlight[]
  progress   Progress?
  bookTags   BookTag[]

  @@index([userId])   // 高频查询：查某个用户的所有书
  @@map("books")
}

// ==================== 笔记表 ====================
model Note {
  id         String   @id @default(uuid())
  bookId     String   @map("book_id")
  content    String   @db.Text           // 笔记内容，纯文本
  cfiRange   String?  @map("cfi_range")  // EPUB 定位
  pageNumber Int?     @map("page_number") // PDF 页码
  createdAt  DateTime @default(now())     @map("created_at")
  updatedAt  DateTime @updatedAt          @map("updated_at")

  // 关系
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([bookId])
  @@map("notes")
}

// ==================== 高亮表 ====================
model Highlight {
  id        String   @id @default(uuid())
  bookId    String   @map("book_id")
  text      String   @db.Text            // 高亮原文
  color     String   @default("yellow") @db.VarChar(20)  // 高亮颜色
  position  Json                          // JSONB - 定位信息（CFI/页码+坐标）
  createdAt DateTime @default(now())      @map("created_at")

  // 关系
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([bookId])
  @@map("highlights")
}

// ==================== 阅读进度表 ====================
model Progress {
  id         String   @id @default(uuid())
  bookId     String   @unique @map("book_id")  // 一本书一条进度
  location   Json                               // JSONB - 阅读位置
  percentage Decimal  @default(0) @db.Decimal(5, 2)  // 阅读百分比
  updatedAt  DateTime @updatedAt @map("updated_at")

  // 关系
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@map("progress")
}

// ==================== 标签表 ====================
model Tag {
  id       String    @id @default(uuid())
  name     String    @unique @db.VarChar(50)  // 标签名，唯一
  bookTags BookTag[]

  @@map("tags")
}

// ==================== 书籍-标签 中间表（多对多）====================
model BookTag {
  bookId String @map("book_id")
  tagId  String @map("tag_id")

  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([bookId, tagId])   // 联合主键
  @@map("book_tags")
}

// ==================== 用户设置表 ====================
model Setting {
  id     String @id @default(uuid())
  userId String @unique @map("user_id")
  theme  String @default("light")       // 主题：light / dark
  config Json   @default("{}")           // 其他配置（JSONB）

  // 关系
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("settings")
}

// ==================== 枚举 ====================
enum Format {
  EPUB
  PDF
  WEB
}
```

## 你的设计 vs 修正后的对比

| 你的设计 | 问题 | 修正 |
|---------|------|------|
| 用户表有 `唯一ID` + `用户Id` | 重复，数据库 id 就是唯一标识 | 只保留 `id` |
| `密码:char` | 存明文是严重安全问题 | 改为 `passwordHash`，存 bcrypt 哈希 |
| 书籍进度放在书单表 | EPUB 进度是字符串不是页码，且更新频率高 | 独立成 Progress 表，用 JSONB 存位置 |
| 标签表只有 `书籍ID` | 多对多关系需要中间表 | 拆为 Tag 表 + BookTag 中间表 |
| 高亮只有 `高亮内容` | 缺少颜色和定位信息 | 加 `color`、`position: Json` |
| 所有表缺少时间戳 | 无法追踪数据变更 | 每个表加 `createdAt`、`updatedAt` |
| 笔记缺少定位 | 不知道笔记写在书的哪个位置 | 加 `cfiRange`（EPUB）、`pageNumber`（PDF） |

## 关键设计决策解释

### 为什么用 UUID 而不是自增 ID？

```
自增 ID：1, 2, 3, 4, ...
UUID：550e8400-e29b-41d4-a716-446655440000
```

- 自增 ID 可以被猜到（知道 id=5 就能试 id=6），有安全隐患
- UUID 全局唯一，未来如果要合并数据库不会冲突
- 缺点：UUID 占用空间更大（16 字节 vs 4 字节），但对 bookmark 这个量级无所谓

### 为什么所有外键都设置 `onDelete: Cascade`？

用户删除一本书 → 这本书的笔记、高亮、进度应该一起删除。这就是级联删除。

但要注意你的踩坑思考：前端应该先弹窗确认，确认后再调删除接口。**数据库的 Cascade 是最后一道保险，不是替代前端确认的**。

### 为什么 position 和 location 用 Json（JSONB）？

不同格式的定位信息结构不同：

```json
// EPUB 高亮定位
{"type": "epub", "cfi": "epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:7)"}

// PDF 高亮定位
{"type": "pdf", "page": 42, "rect": {"x": 100, "y": 200, "w": 300, "h": 20}}
```

用固定字段没法兼容这两种格式，JSONB 可以灵活存储且支持查询。

### 多对多关系为什么需要中间表？

```
错误做法：Tag 表存 bookId（只能一本书对应一个标签）
错误做法：Book 表存 tagIds 数组（查询"某标签下所有书"很慢）

正确做法：
Book --1:N--> BookTag <--N:1-- Tag

BookTag 中间表：
| book_id | tag_id |
|---------|--------|
| book-1  | tag-a  |  ← book-1 有标签 a
| book-1  | tag-b  |  ← book-1 有标签 b
| book-2  | tag-a  |  ← book-2 也有标签 a
```

## 下一步

1. 用你的 Review 要点检查这个 Schema：
   - `email` 是否 `@unique`？ ✅
   - 是否有 `createdAt` / `updatedAt`？ ✅
   - 外键是否设置了 `onDelete`？ ✅
   - 高频查询字段是否有索引？ ✅（`Book.userId`、`Note.bookId`、`Highlight.bookId`）
2. 等后端项目初始化后，放入 `prisma/schema.prisma`，运行 `prisma migrate dev`

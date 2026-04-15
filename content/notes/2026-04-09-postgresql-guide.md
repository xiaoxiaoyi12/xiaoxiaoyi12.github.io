---
title: "PostgreSQL 完全入门指南（Mac 版）"
date: 2026-04-09
category: "数据库"
tags: [PostgreSQL, SQL, Database, Mac]
---

## 概述

面向零基础的前端开发者，从安装到实战，一篇搞定。按 What → Why → How 三段式组织。

---

## 一、What — PostgreSQL 是什么？

### 1.1 一句话定义

PostgreSQL（读作 "post-gres-Q-L"，简称 PG）是一个**免费开源的关系型数据库管理系统**。

翻译成人话：它是一个**专门存数据的软件**，你把数据存进去，它帮你安全保管，你随时可以查、改、删。

### 1.2 和你已经知道的东西类比

| 你熟悉的 | PostgreSQL 对应概念 | 说明 |
|---------|-------------------|------|
| 一个 Excel 文件 | 一个数据库（Database） | 比如 `bookmark_dev` |
| Excel 里的一张工作表 | 一张表（Table） | 比如 `users` 表、`books` 表 |
| 工作表的列标题 | 字段（Column） | 比如 `name`、`email`、`age` |
| 工作表的一行 | 一条记录（Row） | 比如一个用户的所有信息 |
| Excel 的筛选排序 | SQL 查询语句 | 比如 `SELECT * FROM users WHERE age > 18` |
| Excel 文件密码 | 数据库用户权限 | 控制谁能看、谁能改 |

### 1.3 关系型数据库是什么意思？

"关系型"是指**表和表之间可以建立关联**。比如在 Bookmark 项目中：

```
users 表                    books 表
┌────┬──────────┐          ┌────┬─────────────┬─────────┐
│ id │  name    │          │ id │   title     │ user_id │
├────┼──────────┤          ├────┼─────────────┼─────────┤
│  1 │ 小易     │◄─────────│  1 │ 深入React   │    1    │
│  2 │ 小明     │          │  2 │ TypeScript  │    1    │
└────┴──────────┘    ┌─────│  3 │ 设计模式    │    2    │
                     │     └────┴─────────────┴─────────┘
                     │
                     └──── user_id = 2，说明这本书属于"小明"
```

`books` 表的 `user_id` 指向 `users` 表的 `id`，这就是"关系"。通过这种关系，一条 SQL 就能查出"小易的所有书"。

---

## 二、Why — 为什么要用 PostgreSQL？

### 2.1 为什么不继续用 IndexedDB？

你的 Bookmark 项目目前数据存在浏览器的 IndexedDB 里，有几个致命问题：

| 问题 | IndexedDB | PostgreSQL |
|------|-----------|-----------|
| 换电脑/换浏览器 | 数据全没了 | 登录就能看到所有数据 |
| 多设备同步 | 做不到 | 天然支持，数据在服务器 |
| 数据安全 | 清除浏览器缓存就没了 | 支持备份恢复，不怕丢 |
| 复杂查询 | API 很弱，做不了联表查询 | SQL 强大，任意条件组合查询 |
| 数据量 | 浏览器限制，通常 < 50MB | 几十 GB 没压力 |

### 2.2 为什么选 PostgreSQL 而不是 MySQL / MongoDB？

| 对比点 | PostgreSQL | MySQL | MongoDB |
|--------|-----------|-------|---------|
| JSONB 类型 | 支持，**可索引可查询** | 有 JSON 但不可索引 | 原生文档 |
| 全文搜索 | **内置** | 需要 FULLTEXT 索引 | 内置 |
| 数据关系 | 强（JOIN） | 强（JOIN） | 弱（无原生 JOIN） |
| 事务安全 | 完整 ACID | 完整 ACID | 多文档事务性能差 |

**对 Bookmark 项目来说**：高亮的定位信息结构灵活 → 需要 JSONB；笔记搜索 → 需要全文搜索；书和笔记有关联 → 需要 JOIN。PostgreSQL 三个都满足。

---

## 三、How — 怎么安装和使用？

### 3.1 安装 PostgreSQL

Mac 上推荐两种方式，**选一种就行**：

#### 方式一：Homebrew 安装（推荐新手）

```bash
# 第 1 步：安装 PostgreSQL 16
brew install postgresql@16

# 第 2 步：启动 PostgreSQL 服务（开机自动启动）
brew services start postgresql@16

# 第 3 步：把 pg 命令加入 PATH（否则终端找不到 psql 命令）
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 第 4 步：验证安装成功
psql --version
# 应该输出类似：psql (PostgreSQL) 16.x
```

> **Homebrew 是什么？** Mac 上的软件包管理器，类似手机上的"应用商店"。如果没装过，先执行：
> ```bash
> /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
> ```

#### 方式二：Docker 安装（更干净，推荐有 Docker 经验的）

```bash
# 拉取并启动 PostgreSQL 容器
docker run -d \
  --name bookmark-pg \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# 验证容器在运行
docker ps
# 应该能看到 bookmark-pg 容器
```

> Docker 方式的好处是不污染你的 Mac 系统，删除容器就干干净净。但需要先安装 Docker Desktop。

### 3.2 创建数据库

安装好 PostgreSQL 后，它只是一个"空的数据库服务器"，你还需要创建自己的数据库。

#### Homebrew 安装的：

```bash
# 创建一个叫 bookmark_dev 的数据库
createdb bookmark_dev

# 验证：连接进去看看
psql bookmark_dev
```

#### Docker 安装的：

```bash
# 在容器里创建数据库
docker exec -it bookmark-pg createdb -U postgres bookmark_dev

# 验证：连接进去
docker exec -it bookmark-pg psql -U postgres bookmark_dev
```

连接成功后，你会看到这样的提示符：

```
bookmark_dev=#
```

**恭喜！你已经进入了 PostgreSQL 的交互终端。** 接下来可以执行 SQL 命令了。

输入 `\q` 可以退出。

### 3.3 SQL 基础 — 增删改查（CRUD）

SQL（Structured Query Language）是操作数据库的语言。**不用死记语法**，理解逻辑就行，以后 Prisma 会帮你生成 SQL。但你需要看懂 SQL，因为调试时经常需要。

#### 3.3.1 创建表（CREATE TABLE）

```sql
-- 创建一张 users 表
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,   -- 自增主键
  email       VARCHAR(255) UNIQUE NOT NULL,  -- 邮箱，唯一且不能为空
  nickname    VARCHAR(50),          -- 昵称
  created_at  TIMESTAMP DEFAULT NOW()  -- 创建时间，默认当前时间
);
```

逐行翻译：
- `SERIAL PRIMARY KEY`：自动递增的数字，每条记录唯一标识
- `VARCHAR(255)`：最多 255 个字符的文本
- `UNIQUE`：不允许重复（两个用户不能用同一个邮箱）
- `NOT NULL`：不允许为空（注册必须填邮箱）
- `DEFAULT NOW()`：不填的话自动用当前时间

#### 3.3.2 插入数据（INSERT）

```sql
-- 插入一条用户记录
INSERT INTO users (email, nickname) VALUES ('xiaoyi@example.com', '小易');

-- 插入多条
INSERT INTO users (email, nickname) VALUES
  ('xiaoming@example.com', '小明'),
  ('xiaohong@example.com', '小红');
```

> 注意：`id` 和 `created_at` 不用写，数据库会自动填。

#### 3.3.3 查询数据（SELECT）

```sql
-- 查询所有用户
SELECT * FROM users;

-- 结果：
--  id |        email          | nickname |       created_at
-- ----+-----------------------+----------+------------------------
--   1 | xiaoyi@example.com    | 小易     | 2026-04-09 10:30:00
--   2 | xiaoming@example.com  | 小明     | 2026-04-09 10:30:05
--   3 | xiaohong@example.com  | 小红     | 2026-04-09 10:30:05

-- 只查邮箱和昵称
SELECT email, nickname FROM users;

-- 条件查询：查找小易
SELECT * FROM users WHERE nickname = '小易';

-- 模糊查询：查找昵称包含"小"的用户
SELECT * FROM users WHERE nickname LIKE '%小%';

-- 排序：按创建时间倒序
SELECT * FROM users ORDER BY created_at DESC;

-- 限制数量：只取前 10 条
SELECT * FROM users LIMIT 10;
```

**SELECT 语句结构**：

```
SELECT 要查哪些列
FROM   从哪张表
WHERE  满足什么条件
ORDER BY 按什么排序
LIMIT  取多少条
```

#### 3.3.4 更新数据（UPDATE）

```sql
-- 修改小易的昵称
UPDATE users SET nickname = '小易易' WHERE id = 1;

-- 千万别忘了 WHERE！不加 WHERE 会修改所有记录：
-- UPDATE users SET nickname = '全改了';  -- 灾难！所有人的昵称都变了
```

#### 3.3.5 删除数据（DELETE）

```sql
-- 删除 id 为 3 的用户
DELETE FROM users WHERE id = 3;

-- 同样，千万别忘了 WHERE！
-- DELETE FROM users;  -- 灾难！所有用户都删了
```

### 3.4 表与表的关联（JOIN）

这是关系型数据库最强大的地方。先创建一张 books 表：

```sql
CREATE TABLE books (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER REFERENCES users(id),  -- 外键，指向 users 表
  title     VARCHAR(500) NOT NULL,
  format    VARCHAR(10) DEFAULT 'epub'
);

-- 给小易添加两本书
INSERT INTO books (user_id, title, format) VALUES
  (1, '深入理解 TypeScript', 'epub'),
  (1, 'React 设计模式', 'pdf');

-- 给小明添加一本书
INSERT INTO books (user_id, title, format) VALUES
  (2, '数据库系统概念', 'epub');
```

#### 联表查询

```sql
-- 查询所有书以及它们的主人是谁
SELECT books.title, books.format, users.nickname
FROM books
JOIN users ON books.user_id = users.id;

-- 结果：
--        title          | format | nickname
-- ----------------------+--------+----------
--  深入理解 TypeScript   | epub   | 小易
--  React 设计模式        | pdf    | 小易
--  数据库系统概念        | epub   | 小明

-- 只查小易的书
SELECT books.title, books.format
FROM books
JOIN users ON books.user_id = users.id
WHERE users.nickname = '小易';
```

#### 为什么 JOIN 很重要？

如果用 MongoDB（非关系型），要查"小易的所有书"，你需要：
1. 先查 users 集合，拿到小易的 id
2. 再拿着 id 去 books 集合查

用 PostgreSQL，**一条 SQL 搞定**。数据量大了之后，效率差距非常明显。

### 3.5 PostgreSQL 特色功能：JSONB

这是选 PostgreSQL 的重要原因之一。在 Bookmark 中，高亮的定位信息结构不固定（EPUB 用 CFI，PDF 用页码+坐标），用 JSONB 存最合适：

```sql
-- 创建高亮表，position 用 JSONB 类型
CREATE TABLE highlights (
  id        SERIAL PRIMARY KEY,
  book_id   INTEGER REFERENCES books(id),
  text      TEXT NOT NULL,
  color     VARCHAR(20) DEFAULT 'yellow',
  position  JSONB NOT NULL  -- 灵活存储定位信息
);

-- EPUB 的高亮（用 CFI 定位）
INSERT INTO highlights (book_id, text, color, position) VALUES
  (1, '类型是值的集合', 'yellow',
   '{"type": "epub", "cfi": "epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:7)"}');

-- PDF 的高亮（用页码+坐标定位）
INSERT INTO highlights (book_id, text, color, position) VALUES
  (2, '组合优于继承', 'green',
   '{"type": "pdf", "page": 42, "x": 100, "y": 200, "width": 300, "height": 20}');

-- 查询所有 EPUB 格式的高亮（JSONB 可以直接查里面的字段！）
SELECT text, color, position->>'cfi' as cfi
FROM highlights
WHERE position->>'type' = 'epub';
```

> **JSONB vs 普通 JSON**：JSONB 是二进制存储，可以建索引、直接查询内部字段。MySQL 的 JSON 类型做不到索引。

### 3.6 常用 psql 终端命令

在 `psql` 交互终端里，除了 SQL 语句，还有一些快捷命令（以 `\` 开头）：

| 命令 | 作用 | 示例 |
|------|------|------|
| `\l` | 列出所有数据库 | `\l` |
| `\c dbname` | 切换到另一个数据库 | `\c bookmark_dev` |
| `\dt` | 列出当前数据库的所有表 | `\dt` |
| `\d tablename` | 查看表结构（字段、类型） | `\d users` |
| `\du` | 列出所有数据库用户 | `\du` |
| `\q` | 退出 psql | `\q` |
| `\?` | 查看所有 `\` 命令帮助 | `\?` |
| `\h SQL命令` | 查看某条 SQL 的语法帮助 | `\h CREATE TABLE` |

### 3.7 图形化工具（可选）

如果觉得命令行不直观，可以安装图形化工具：

| 工具 | 说明 | 安装 |
|------|------|------|
| **pgAdmin** | 官方推荐，功能最全 | `brew install --cask pgadmin4` |
| **Postico** | Mac 专属，界面最好看 | 官网下载免费版 |
| **DBeaver** | 通用数据库工具，支持所有数据库 | `brew install --cask dbeaver-community` |
| **Prisma Studio** | Prisma 自带，后面用 Prisma 时自动有 | `npx prisma studio` |

> 对于 Bookmark 项目，后面用 Prisma 后，`npx prisma studio` 就够用了，不需要额外装工具。

---

## 四、实战练习

把上面学的串起来，模拟 Bookmark 项目的数据操作：

```sql
-- 1. 连接数据库
-- psql bookmark_dev

-- 2. 创建完整的表结构
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  nickname    VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE books (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  title       VARCHAR(500) NOT NULL,
  author      VARCHAR(255),
  format      VARCHAR(10) DEFAULT 'epub',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notes (
  id          SERIAL PRIMARY KEY,
  book_id     INTEGER REFERENCES books(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE highlights (
  id          SERIAL PRIMARY KEY,
  book_id     INTEGER REFERENCES books(id),
  text        TEXT NOT NULL,
  color       VARCHAR(20) DEFAULT 'yellow',
  position    JSONB NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. 插入测试数据
INSERT INTO users (email, nickname) VALUES ('xiaoyi@test.com', '小易');

INSERT INTO books (user_id, title, author, format) VALUES
  (1, '深入理解 TypeScript', 'basarat', 'epub'),
  (1, 'React 设计模式', 'Krasimir Tsonev', 'pdf');

INSERT INTO notes (book_id, content) VALUES
  (1, '第三章的泛型讲得很清楚，需要再看一遍'),
  (1, 'extends 关键字在类型编程中有两个完全不同的含义');

INSERT INTO highlights (book_id, text, color, position) VALUES
  (1, '类型是值的集合', 'yellow',
   '{"type": "epub", "cfi": "epubcfi(/6/4!/4/2/1:0,/6/4!/4/2/1:7)"}'),
  (2, '组合优于继承', 'green',
   '{"type": "pdf", "page": 42, "rect": {"x": 100, "y": 200}}');

-- 4. 常见查询练习

-- 查询小易的所有书
SELECT b.title, b.author, b.format
FROM books b
JOIN users u ON b.user_id = u.id
WHERE u.nickname = '小易';

-- 查询某本书的所有笔记和高亮数量
SELECT
  b.title,
  (SELECT COUNT(*) FROM notes n WHERE n.book_id = b.id) as note_count,
  (SELECT COUNT(*) FROM highlights h WHERE h.book_id = b.id) as highlight_count
FROM books b
WHERE b.user_id = 1;

-- 搜索笔记内容包含"泛型"的记录
SELECT n.content, b.title
FROM notes n
JOIN books b ON n.book_id = b.id
WHERE n.content LIKE '%泛型%';

-- 查询所有 PDF 格式书籍的高亮
SELECT h.text, h.color, h.position->>'page' as page
FROM highlights h
JOIN books b ON h.book_id = b.id
WHERE b.format = 'pdf';

-- 5. 清理（练习完可以删掉这些表）
-- DROP TABLE highlights;
-- DROP TABLE notes;
-- DROP TABLE books;
-- DROP TABLE users;
```

---

## 五、PostgreSQL 和 Prisma 的关系

在 Bookmark 项目中，你**不会直接写 SQL**，而是通过 Prisma 操作数据库：

```
你写的代码（TypeScript）      Prisma 帮你翻译成        数据库执行

prisma.user.findMany()   →   SELECT * FROM users   →   返回数据
prisma.book.create(...)  →   INSERT INTO books ...  →   插入记录
prisma.note.update(...)  →   UPDATE notes SET ...   →   更新记录
```

**但你仍然需要理解 SQL**，因为：
1. 调试时 Prisma 日志会打印实际执行的 SQL，你需要看懂
2. 性能问题排查需要分析 SQL 查询计划
3. 有些复杂查询 Prisma 不支持，需要写原生 SQL

---

## 六、常见问题

### Q：PostgreSQL 服务怎么管理？

```bash
# Homebrew 安装的
brew services start postgresql@16    # 启动
brew services stop postgresql@16     # 停止
brew services restart postgresql@16  # 重启
brew services list                   # 查看所有服务状态

# Docker 安装的
docker start bookmark-pg    # 启动
docker stop bookmark-pg     # 停止
docker restart bookmark-pg  # 重启
docker ps                   # 查看运行中的容器
```

### Q：忘记数据库密码怎么办？

Homebrew 安装默认没有密码（本地信任连接）。Docker 安装的密码是你启动时 `-e POSTGRES_PASSWORD=xxx` 设置的。

### Q：数据库文件存在哪里？

```bash
# Homebrew 安装的，数据目录
/opt/homebrew/var/postgresql@16

# Docker 安装的，在容器内部
# 如果需要持久化，启动时加 -v 参数挂载到本地目录
```

### Q：怎么删除数据库？

```bash
dropdb bookmark_dev            # Homebrew
docker exec -it bookmark-pg dropdb -U postgres bookmark_dev  # Docker
```

### Q：怎么完全卸载 PostgreSQL？

```bash
# Homebrew
brew services stop postgresql@16
brew uninstall postgresql@16
rm -rf /opt/homebrew/var/postgresql@16  # 删除数据（谨慎！）

# Docker
docker stop bookmark-pg
docker rm bookmark-pg
```

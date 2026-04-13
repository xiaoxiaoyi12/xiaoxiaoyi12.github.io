# Daily Log Bot — 自动日志机器人

每晚 23:00 自动检查当日博客，如无新增则随机生成 1-3 篇文章并推送到 GitHub Pages。

## 架构

```
macOS launchd（系统调度器）
  ↓ 每晚 23:00 触发
~/.claude/scripts/daily-log-cron.sh（Shell 脚本）
  ↓ cd 到博客目录后调用
claude -p "..." --agent daily-log-bot --allowedTools "..."（Claude Code CLI）
  ↓ Agent 自动执行
检查/生成博客内容 → git push origin master
```

## 文件清单

| 文件 | 路径 | 作用 |
|------|------|------|
| Agent 定义 | `~/.claude/agents/daily-log-bot.md` | 描述 bot 的完整执行逻辑和约束 |
| 执行脚本 | `~/.claude/scripts/daily-log-cron.sh` | 封装 CLI 调用、日志记录、旧日志清理 |
| launchd 配置 | `~/Library/LaunchAgents/com.claude.daily-log-bot.plist` | macOS 定时任务，每天 23:00 触发 |
| 执行日志 | `~/.claude/logs/daily-log-YYYY-MM-DD.log` | 每次执行的详细输出（自动保留 30 天） |
| launchd 日志 | `~/.claude/logs/launchd-stdout.log` / `launchd-stderr.log` | launchd 层面的输出/错误 |

## 执行逻辑

1. **检查今日状态** — 查找 `_posts/`、`_notes/`、`_readings/`、`_thoughts/` 下是否有当日文件
2. **收集 git log** — 仅从 `xiaoxiaoyi12.github.io` 和 `bookmark` 两个仓库获取当日提交记录（只读）
3. **生成内容**（如无当日文章）— 随机 1-3 篇，类型混搭：
   - **AI 最新资讯** → `_notes/`（通过 WebSearch 获取真实信息源）
   - **文学名著片段** → `_readings/`（经典作品原文 + 赏析）
   - **有趣的 Anything** → 按内容自动归类（科学、编程历史、哲学、冷知识等）
4. **生成/更新日志** — `_posts/YYYY-MM-DD-daily-log.md`
5. **Git 推送** — `git add -A && git commit && git push origin master`
6. **已有内容时** — 检测到当日已有文章且已推送，跳过生成，输出"无变更"

## 安全约束

- **所有文件操作**限制在 `~/Desktop/xiaoxiaoyi12.github.io/` 内
- **git log 只读**仅限两个仓库：`xiaoxiaoyi12.github.io` 和 `bookmark`
- **工具白名单**：`Bash(git:*) Bash(cd:*) Bash(ls:*) Bash(mkdir:*) Read Write Edit Glob Grep WebSearch`
- 不会访问、修改或删除项目目录以外的任何文件
- Agent 全程自动执行，不弹出交互确认

## CLI 调用方式

```bash
claude -p "<prompt>" --agent daily-log-bot --allowedTools "<白名单>"
```

关键参数说明：
- `-p`：print 模式，非交互，输出结果后退出
- `--agent`：指定 agent 定义文件（按 name 匹配 `~/.claude/agents/` 下的文件）
- `--allowedTools`：工具白名单，只授权列出的工具，无需 `--dangerously-skip-permissions`

## 管理命令

```bash
# 查看任务状态（退出码 0 = 正常，126 = 脚本执行失败）
launchctl list | grep daily-log

# 手动触发一次（测试）
bash ~/.claude/scripts/daily-log-cron.sh

# 查看今日执行日志
cat ~/.claude/logs/daily-log-$(date +%Y-%m-%d).log

# 查看 launchd 层面的错误
cat ~/.claude/logs/launchd-stderr.log

# 停用定时任务
launchctl unload ~/Library/LaunchAgents/com.claude.daily-log-bot.plist

# 重新启用
launchctl load ~/Library/LaunchAgents/com.claude.daily-log-bot.plist

# 修改 plist 后重新加载
launchctl unload ~/Library/LaunchAgents/com.claude.daily-log-bot.plist
launchctl load ~/Library/LaunchAgents/com.claude.daily-log-bot.plist

# 完全卸载（删除所有相关文件）
launchctl unload ~/Library/LaunchAgents/com.claude.daily-log-bot.plist
rm ~/Library/LaunchAgents/com.claude.daily-log-bot.plist
rm ~/.claude/scripts/daily-log-cron.sh
rm ~/.claude/agents/daily-log-bot.md
```

## 休眠处理

- 23:00 电脑休眠 → 不执行
- 下次开机/唤醒 → launchd **自动补执行一次**
- 效果：日志最迟在次日开机时生成并推送

## 新分类处理

如果生成的内容不适合现有的 `_notes/`、`_readings/`、`_thoughts/` 分类，bot 会：

1. 创建新的 collection 目录 `_<新分类>/`
2. 自动更新 `_config.yml` 添加对应 collection 配置（output + permalink）
3. 在日志中记录新分类的创建

## 踩坑记录

### Volta 工作目录问题（2026-04-10 ~ 2026-04-12）

**现象**：launchd 定时任务每天执行，但退出码 126，日志报错 `Volta error: Could not determine current directory`。

**原因**：launchd 启动进程时默认工作目录是 `/`，Volta 在根目录下无法正常解析 node/claude 的路径。

**修复**：
1. 脚本最开头 `cd $BLOG_DIR`，在调用任何 Volta 管理的工具之前先切到有效目录
2. plist 添加 `<key>WorkingDirectory</key>` 指向博客目录，双重保险

### CLI 参数问题（2026-04-10）

- `--cwd` 不是有效参数 → 用脚本内 `cd` 替代
- `--prompt` 不是有效参数 → 用 `-p` 替代（`-p` 即 `--print`，prompt 作为参数值传入）

## 配置日期

- 创建时间：2026-04-10
- 修复 Volta 问题：2026-04-13
- launchd 调度：每天 23:00（本地时间）
- 执行日志保留：30 天

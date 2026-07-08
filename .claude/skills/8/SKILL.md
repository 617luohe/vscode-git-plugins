---
name: 8-版本管理
description: Full git version control — init, save, log, diff, rollback, branch, remote. Works locally by default; connect to GitHub on demand. Use for any version control needs. 触发词：版本管理、git、提交、推送、分支、回滚、保存、commit、push。
---

# 8-版本管理 — Git 版本控制全流程

覆盖 git 版本管理全部核心操作。默认本地仓库，需连接远程时按需配置。

## 操作清单

## MUST 规则

1. **危险操作必须先确认再执行。** `git reset --hard`、`git push --force`、`git branch -D` 需要用户明确同意。
2. **回滚默认用 revert，不用 reset。** 除非用户明确要求 reset。
3. **首次推送自动设置上游分支。** `git push -u origin main`。

### init — 初始化仓库

```bash
git init
```

如果已有仓库则跳过。自动创建 `.gitignore` 如果不存在（含 Python 标准规则）。

---

### save — 保存版本

```bash
git add .
git commit -m "<描述>"
```

如果未提供描述，自动根据变更生成提交信息。

新增文件时自动检测是否需更新 `.gitignore`。

---

### log — 查看历史

```bash
git log --oneline --graph
```

显示版本历史和分支图。

---

### diff — 查看变更

```bash
git diff                  # 未暂存的变更
git diff <commit>         # 与某个版本的差异
git diff <commit1>..<commit2>  # 两个版本间的差异
```

---

### rollback — 安全回滚

```bash
git revert <commit>       # 安全回滚（保留历史，推荐）
```

默认用 `git revert`。只在用户明确要求时才用 `git reset`。

---

### reset — 硬重置

```bash
git reset --hard <commit>  # 丢弃该版本之后的所有变更
```

**危险操作**。执行前必须确认你要丢弃的变更，获得你明确同意后才执行。

---

### branch — 分支管理

```bash
git branch <name>         # 创建分支
git checkout <name>       # 切换分支
git branch -d <name>      # 删除已合并的分支
```

---

### remote — 连接远程

```bash
git remote add origin <url>
git push -u origin main
```

在你要求连接 GitHub 时执行。首次推送后告知你后续可直接用 `push` 和 `pull`。

---

### guardrails — Git 安全护栏（可选）

为高风险仓库可选安装 PreToolUse 钩子，拦截危险命令（如 `git push`、`git reset --hard`、`git clean -fd`、`git branch -D`）。

执行前先问作用域：
- 仅当前项目（推荐）→ `.claude/settings.json`
- 全局所有项目 → `~/.claude/settings.json`

原则：合并现有 hooks 配置，不覆盖其他设置。

### push / pull — 同步远程

```bash
git push                  # 推送到远程
git pull                  # 拉取远程更新
```

仅在配置了远程仓库后可用。首次推送时自动设置上游分支。

---

## 什么时候用

- 完成一个功能阶段，需要保存进度
- 想查看改了什么东西
- 改坏了需要回滚到之前的版本
- 准备推送到 GitHub

## 案例

```
你：帮我保存一下进度，我改了用户模块
Claude：git add . && git commit -m "feat: 完成用户模块基础功能"
       [main abc1234] feat: 完成用户模块基础功能

你：看看改了什么
Claude：git log --oneline --graph
       * abc1234 feat: 完成用户模块基础功能
       * def5678 初始项目脚手架

你：我想推送到 GitHub
Claude：仓库 URL 是什么？
你：https://github.com/user/project.git
Claude：git remote add origin https://github.com/user/project.git
       git push -u origin main
```

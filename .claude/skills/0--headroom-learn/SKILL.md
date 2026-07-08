---
name: 0--headroom-learn
description: 会话失败学习器 — 分析过往会话中的 tool call 失败模式（错误路径、缺失模块、顽固重试、RTK 循环），用 LLM 生成纠正规则写入 CLAUDE.local.md/CLAUDE.md/AGENTS.md/MEMORY.md，防止同类错误重复发生。触发词：headroom learn、从失败学习、分析会话失败、会话复盘、失败模式、工具调用失败、重复错误、顽固重试、为什么老出错、RTK循环。
---

# 0--headroom-learn — 会话失败学习器

luohe，我来分析过往会话的失败模式，生成纠正规则。

## 核心逻辑

受 Headroom Learn v0.28 启发：扫描会话历史 → 识别 tool call 失败模式 + RTK 循环 → LLM 分析根因 → 生成纠正规则 → 写入项目上下文文件。目的是**防止同类错误重复发生**。

> 基于 headroom-ai v0.28.1，已从 v0.20.15 更新。

## v0.28 关键变化

1. **Loop 检测** — 识别 RTK re-fetch 循环（输出截断导致重复执行成功命令），测量浪费的 token，循环 guardrails 权重高于一次性规则
2. **CLAUDE.local.md** — 默认写入个人文件而非团队共享 CLAUDE.md，避免污染共享配置
3. **--target 标志** — 可覆盖输出目标
4. **OpenCode + Gemini CLI 支持** — 扩展 agent 覆盖

## 流程

### 1. 扫描会话记录

- 定位会话文件目录（Claude Code: `~/.claude/projects/<project>/`）
- 提取 tool call 失败记录（exit code ≠ 0、重试≥3次、超时、路径错误）
- **新增**: 检测 RTK 循环 — 同一命令因输出截断被重复执行，即使每次执行成功
- 按失败类型分组

### 2. 识别失败模式

常见模式：
- **路径错误**：文件/目录路径不对，反复修改才找到
- **缺失依赖**：模块/包未安装，反复尝试
- **权限问题**：命令缺少权限，反复报错
- **格式错误**：JSON/YAML 格式不对，反复修正
- **顽固重试**：同一条命令重试 ≥3 次才成功
- **★ RTK 循环**：RTK 输出截断导致 agent 重复执行更大 limit 变体的成功命令
- **超时**：命令执行超时

### 3. LLM 分析根因

对每组失败模式，用 LLM 分析：
- 根本原因是什么？
- 是否可以预防？
- 预防规则应该怎么写？
- **★ Loop 加权**: RTK 循环按浪费的 token 量加权，排在首位

### 4. 生成纠正规则

规则写入对应文件：

| 规则类型 | 默认写入位置 | 备选位置 | 示例 |
|----------|-------------|----------|------|
| 项目结构约定 | `CLAUDE.local.md` | `CLAUDE.md` (--target) | "npm 包在 packages/ 下，不是 src/" |
| CLI 命令别名 | `CLAUDE.local.md` | `CLAUDE.md` | "用 pnpm 不是 npm" |
| 环境要求 | `CLAUDE.local.md` | `CLAUDE.md` | "需要 Python 3.12+，venv 在 .venv/" |
| RTK 循环防护 | `CLAUDE.local.md` (优先) | `CLAUDE.md` | "grep 结果为空时不重试更大 limit" |
| 个人偏好 | `MEMORY.md` | — | "用户偏好用 gh CLI 而不是 curl" |
| Agent 指令 | `AGENTS.md` | — | "先读 CLAUDE.md 再动手" |

> **★ v0.28 默认**: 个人学习写入 `CLAUDE.local.md`（gitignored），不污染团队共享的 `CLAUDE.md`。

### 5. 写入并报告

- 非破坏式注入：已有规则不重复
- 用 `<!-- headroom-learn: <date> -->` 标记自动生成的规则
- **★ Loop guardrails 优先排序**，高于一次性规则
- 报告：发现了哪些模式、生成了哪些规则、写入了哪个文件、浪费了多少 token

## MUST 规则

1. **默认写入 CLAUDE.local.md。** 不污染共享 CLAUDE.md，除非用 --target 明确指定。
2. **Loop 优先。** RTK 循环检测结果排在首位，按浪费 token 量加权。
3. **非破坏式。** 只追加新规则，不修改已有内容。
4. **有据可查。** 每条规则必须关联到具体失败记录。
5. **简洁可执行。** 规则必须是 AI 能直接遵守的指令，不是描述。
6. **标记来源。** 自动生成的规则用 `<!-- headroom-learn: <date> -->` 标记。

## 纠正规则格式

```markdown
<!-- headroom-learn: 2026-06-30 -->
## 预防规则（自动生成）

### ⚠️ RTK 循环防护（浪费 12,500 tokens）
- **grep 限制**: 搜索结果为空不重试更大 limit，直接报告
- **文件读取**: 用 headroom_read 缓存，不重复读取同一文件

### 路径约定
- 项目所有 Go 代码在 `cmd/` 和 `internal/`，不要到 `src/` 找

### 包管理器
- 本项目用 `pnpm`，不是 `npm` 或 `yarn`

### Python 环境
- 虚拟环境在 `.venv/`，激活命令 `source .venv/bin/activate`
<!-- /headroom-learn -->
```

## 与 0--neat-freak 的配合

- `0--headroom-learn`：**被动** — 从失败中学习，生成新规则存入 `CLAUDE.local.md`
- `0--neat-freak`：**主动** — 审查现有规则（含 `CLAUDE.local.md`），清理过期/重复
- 建议流程：learn 先跑（收集问题）→ neat-freak 后跑（整理知识）

## 案例

```
你：/0--headroom-learn
Claude：luohe，扫描当前项目最近 10 个会话...
       发现 4 个失败模式：

       ⚠️ 1. RTK 循环 (3次): grep 结果为空后重复执行更大 limit
          浪费 12,500 tokens → 规则：grep 为空不重试
       2. 路径错误 (8次): 反复在 src/ 找文件，实际在 packages/
          → 规则：monorepo 结构，代码在 packages/*/src/
       3. 包管理器 (5次): 用了 npm install，项目用 pnpm
          → 规则：一律用 pnpm
       4. Python venv (3次): 忘了激活虚拟环境
          → 规则：任何 Python 命令前先 source .venv/bin/activate

       ✅ 4 条规则已写入 CLAUDE.local.md（标记 <!-- headroom-learn -->）
```

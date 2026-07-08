---
name: 0--neat-freak
description: End-of-session knowledge cleanup with OCD-level rigor — reconciles project docs (CLAUDE.md, README.md, docs/) and agent memory against code so nothing rots. 会话结束后对项目文档和记忆进行洁癖级审查与同步。触发词：sync up、tidy up docs、update memory、clean up docs、同步一下、整理文档、整理一下、更新记忆、梳理一下、收尾、这个阶段做完了、新人能直接上手、/sync、/neat。Bare "整理"/"tidy" with prior dev context counts — do not under-trigger。
---

# 0--neat-freak — 知识库洁癖审查

你是**知识库编辑**，不是记录员。记录员只会往后追加，编辑会审查全局、合并重复、修正过期、删除废弃。你的工作是让项目知识体系始终保持干净、准确、对新人友好。

## MUST 规则

1. **先体检再同步。** 尺寸超标必须先精简（CLAUDE.md >300行、MEMORY.md >25KB/200行）。
2. **先减法后加法。** 先删过期和重复，再补新增事实——两件事不能合并。
3. **先 ls 再判断。** 必须机械式枚举所有文件，标「评估过/要改/不用改」——漏一个不行。
4. **三层知识不重叠。** CLAUDE.md=规则手册、docs/=外部接入文档、memory=跨会话偏好+教训。
5. **记忆要「毕业」。** 稳定知识并进 docs/CLAUDE.md，原记忆删或缩成指针——治膨胀的唯一手段。
6. **真的改文件。** 用 Edit/Write/Delete，不描述"我会怎么改"。
7. **相对时间必须清零。** `grep -E "今天|昨天|刚刚|最近|上周"` → 全部转绝对日期。

## 核心概念

### 三类知识，三种受众

| 位置 | 受众 | 职责 |
|------|------|------|
| Agent 记忆 | 自己跨会话 | 偏好、教训、踩坑记录、指针 |
| CLAUDE.md | 下次 AI 会话 | 规则、红线、命令速查、路由清单 |
| docs/ + README | 人类同事、下游开发者 | 接入指南、架构、运维、API 参考 |

**CLAUDE.md 是规则手册，不是变更日志。** 判断标准：下次 AI 写代码时没看到这条，会不会犯错？不会→删/迁。

### 记忆膨胀的唯一解药：「毕业」

记忆天生只追加不删除。没有阀门，它会堆到比 docs 还大。**毕业 = 稳定知识并进 docs/CLAUDE.md，原文件删或缩成指针。** 触发条件：
- 同一主题教训出现 ≥ 3 次
- 讲的是「系统怎么工作」而非「踩了什么坑」
- 是事件记录（上线/落地/就位）→ 事实进 docs，过程进 git log

判据：**「下一个接手的人需要知道吗？」需要 → docs。不需要 → 删。**

## 五步流程速查

| 步骤 | 内容 | 核心动作 |
|------|------|----------|
| 0 | 尺寸体检 | `wc -l` 关键文件，超标先精简 |
| 1 | 盘点现状 | 机械式 `ls` + 读所有 .md，标「评估过/要改/不用改」 |
| 2 | 识别变更 | 用变更影响矩阵思考：新事实波及哪些文档层？跨项目影响？ |
| 3 | 实际修改 | 顺序：docs/ → CLAUDE.md → memory。减优于加，毕业优于内部挪腾 |
| 4 | 自检清单 | 逐项过：尺寸+反膨胀(6项) + 完整性+反漏改(11项) |
| 5 | 变更摘要 | 记忆变更 + 文档变更 + 未处理项 |

---

## 第零步：尺寸体检

任何同步动作之前，先跑尺寸检查：

| 文件 | 上限 | 超标处理 |
|------|------|----------|
| CLAUDE.md | ~300 行（软） | 扫 blockquote/历史叙事 → 删/迁 docs |
| MEMORY.md | **≤200 行且 ≤25KB（硬）** | 超出部分不加载！毕业机制：上泵到 docs |
| 单条 memory | ~100 行（软） | 拆/删/缩成 reference 指针 |
| docs/单文件 | ~1500 行（软） | 拆分+目录索引 |

额外检查：`du memory` vs `du docs/`——健康态是 docs 厚、memory 薄。

**超尺寸是最高优先级。** 执行顺序：先精简（破膨胀）→ 再增量同步（补漏）。

---

## 第一步：盘点现状

1. **记忆层**：`ls memory/` → 读 `MEMORY.md` 及所有被引用文件
2. **项目文档层**：`ls docs/` → `find *.md` → 读 README、CLAUDE.md、每个 docs/*.md
3. **全局配置**：读 `~/.claude/CLAUDE.md` 等
4. **回顾对话**：本次对话产生了什么新事实？

对每个文件标「评估过/要改/不用改」。**漏一个不行。**

Agent 记忆路径因平台而异，速查见 [references/agent-paths.md](references/agent-paths.md)。

---

## 第二步：识别变更

用变更影响矩阵思考：新事实波及哪些文档层？

常见模式：
- 新增 API/路由 → CLAUDE.md 路由清单 + docs integration-guide + architecture
- 新增环境变量 → CLAUDE.md 环境变量表 + runbook + 下游 integration-guide
- 新增数据库表 → CLAUDE.md + architecture Data Model
- 新增大特性 → 以上全部 + architecture 新章节 + handoff
- 跨项目改动 → **上下游两边都要对齐**（最易漏改）

完整映射表见 [references/sync-matrix.md](references/sync-matrix.md)。关键检查：这次对话是不是跨项目的？

---

## 第三步：实际修改

用 Edit/Write/Delete 真的改文件。

**编辑原则**：
- **减优于加**：CLAUDE.md 净涨幅 >30 行 = 红灯
- **合并优于追加**：新信息改旧条目，grep 同关键字
- **删除优于保留**：完成的计划、推翻的决策、单次事故复盘——删
- **毕业优于内部挪腾**：记忆稳定后并进 docs，原文件缩成指针或删
- **绝对时间**：永远 `2026-06-29`，不写"今天/最近"
- **受众不混**：CLAUDE.md 不抄 docs 全文，docs 不写"我记得上次"

**修改顺序**：docs/（影响外部，最优先）→ CLAUDE.md → memory。

**全局配置极度克制**：只有用户明确表达跨项目核心原则时才动 `~/.claude/CLAUDE.md`。

**新增能力标准动作**：integration-guide（怎么用）+ architecture（怎么工作）+ runbook（怎么运维）+ handoff（已完成）。

---

## 第四步：自检清单

### 尺寸/反膨胀
- [ ] CLAUDE.md 净涨幅 ≤ 30 行（超了→删/迁历史叙事）
- [ ] 无新增 blockquote 历史叙事条目
- [ ] 无 CLAUDE.md 抄 docs 已有细节
- [ ] 单条 memory ≤ 100 行
- [ ] MEMORY.md ≤ 25KB 且 ≤ 200 行（`wc -c` 实测）
- [ ] 体量没倒挂：`du memory` ≤ `du docs/`

### 完整性/反漏改
- [ ] 第一步每个文件都标了「评估过/要改/不用改」
- [ ] 记忆索引链接指向存在文件
- [ ] 记忆无互相矛盾
- [ ] CLAUDE.md 中路径/命令/工具真实存在
- [ ] README 安装/运行步骤与代码一致
- [ ] 新增 API：integration-guide 和 architecture 都有
- [ ] 新增环境变量：runbook 和 CLAUDE.md 都有
- [ ] 新增数据库表：architecture Data Model 和 CLAUDE.md 都有
- [ ] 跨项目影响：下游 docs 已同步
- [ ] 相对时间清零（grep 检查）
- [ ] **没有漏！** — 不因为"差不多了"就跳过

---

## 第五步：变更摘要

```
## 同步完成

### 记忆变更
- 更新/新增/删除：xxx（原因）

### 文档变更
- <项目>/CLAUDE.md — xxx
- <项目>/docs/xxx.md — xxx

### 未处理
- xxx（需用户确认）
```

---

## 特殊情况

- **无记忆系统的 agent**：跳过记忆层，全花在 docs + CLAUDE.md
- **项目无 README/CLAUDE.md**：有可运行代码→创建，vibe 阶段→跳过但提一句
- **无新事实**：审查过期/冲突/相对时间——审查本身有价值
- **记忆矛盾无法自动判断**：列「未处理」让用户决定（唯一需用户介入的情况）
- **跨项目改动**：每个项目各跑一次完整第一步
- **发现之前漏了**：修掉，过去的漏洞也归你管

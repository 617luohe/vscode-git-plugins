---
name: 5-检查
description: Two-axis code review（standards + spec compliance）plus interactive bug reporting with GitHub issue creation. Use before merging code, after completing a feature, or when you find a bug. 触发词：代码审查、检查、验收、review、bug报告、issue、质量检查。
---

# 5-检查 — 代码审查与验收

两个模式：**代码审查**（Review）和 **Bug 报告**（QA）。进入时问用户走哪个。

---

## MUST 规则

1. **审查基点和需求来源必须先确认再开始。** 不问清楚不审查。
2. **两个子代理必须并行运行。** Standards 和 Spec 独立，不互相污染上下文。
3. **标准审查结果和需求审查结果不合并、不排序、不重排优先级。**
4. **Bug issue 不包含文件路径和行号。** 使用项目领域术语，不描述代码。

## 模式 A — 代码审查

对代码变更进行双轴审查。两个评估用**并行子代理**独立执行，避免互相污染上下文。

### 步骤

1. **确定审查基点** — 从哪个点开始审查？main 分支、某个 commit、tag、还是当前改动？
   - 统一记录：`git diff <fixed-point>...HEAD`（三点语法，基于 merge-base）
   - 同时记录提交列表：`git log <fixed-point>..HEAD --oneline`
   - 如果你没给 fixed-point，先问清楚再继续，不能默认替你决定
2. **定位需求来源** — 按顺序查找：
   - commit 消息中的 issue 引用（`#123`、`Closes #45`）→ 取对应 issue
   - 你传入的路径参数
   - 项目中的 PRD/spec 文件
   - 如果都没找到，问你需求在哪；若确认无 spec，Spec 轴标记为"无可用 spec"
3. **定位规范来源** — 收集 CLAUDE.md、CONTRIBUTING.md、CONTEXT.md/CONTEXT-MAP.md、ADR、以及 linter/formatter/tsconfig 等工具配置

### 并行审查

启动两个并行子代理（Agent tool），各自独立报告：

**Standards 子代理** — 读规范文件 + 读 diff，逐文件报告违反规范的地方（跳过已被工具自动强约束的事项）：
- 命名规范：snake_case 函数/变量、PascalCase 类
- 类型注解是否完整
- 异常处理是否捕获过于宽泛的 Exception
- import 组织：标准库 → 三方库 → 本地模块
- 公共 API 是否缺少文档字符串
- 是否使用 Python 惯用写法（上下文管理器、列表推导）

**Spec 子代理** — 读需求文档 + 读 diff，报告：
- 需求中要求但缺失或部分实现的功能
- 代码中出现但需求没要求的（范围蔓延）
- 实现方式有问题的地方

### 汇总报告

两个结果并排展示（`## Standards` + `## Spec` 标题），**不合并、不排序、不重排优先级**；只允许轻量清理表述。

末尾一行总结：每个轴各多少发现，最严重的问题是什么。

---

## 模式 B — Bug 报告

交互式 QA。你口述遇到的问题，我澄清、探索代码、提交 issue。

### 流程

1. **倾听 + 轻量澄清** — 最多问 2-3 个简短问题
2. **后台探索代码** — 一边对话一边启动 Agent 了解领域上下文和领域术语
3. **判断范围** — 是不是应该拆成多个独立 issue？
4. **提交 issue** — 用 `gh issue create` 提交，从用户视角写，不包含文件路径

**决定是否拆分**：

| 拆成多个 | 保留一个 |
|---|---|
| 修复涉及多个独立区域 | 同一处行为错误的单点问题 |
| 不同人可并行处理 | 所有症状由同一根因导致 |
| 多个不同的失败模式 | |

**Issue 规则**：
- ❌ 不包含文件路径和行号（会过期）
- ✅ 使用项目领域术语描述
- ✅ 描述行为，不描述代码
- ✅ 复现步骤必须可执行
- ✅ 30 秒内能读完

### Issue 模板

**单 issue**：

```
## What happened
[实际行为]

## What I expected
[期望行为]

## Steps to reproduce
1. [具体步骤]
```

**拆分多 issue**（按依赖顺序提交，先建阻塞项）：

```
## Parent issue
#<父 issue 号> 或在 QA 中报告

## What's wrong
[这一片的具体问题]

## Blocked by
- #<阻塞项> 或 "无，可直接开始"

```

### 继续循环

提完所有 issue 后问：**"继续下一个，还是完成了？"** 直到你说完成。

---

## 什么时候用

- **模式 A**：提 PR 前自审、审查团队成员代码、合并前把关
- **模式 B**：发现 bug 但不想手动写 issue、做系统性 QA

## 案例

```
你：帮我检查一下 payment-service 分支
Claude：Standards 审查结果：
       ❌ payment/processor.py:45 — processPayment → 应改为 process_payment
       ❌ payment/views.py:102 — except Exception: 过宽
       ⚠️ 3 个函数缺少类型注解

       Spec 审查结果：
       ❌ 缺失需求: PRD §3.2 "退款原路返回" 未实现
       ❌ 范围蔓延: payment_logger.py 需求中没要求
```

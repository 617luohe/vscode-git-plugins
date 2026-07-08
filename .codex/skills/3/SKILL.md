---
name: 3-原型
description: Build throwaway prototypes to validate uncertain design decisions — data models, state machines, algorithm choices, API schemas — before committing to full TDD implementation. Use when planning reveals open questions, or before starting formal development. 触发词：原型、快速验证、试错、不确定、验证设计、prototype。
---

# 3-原型 — 快速原型验证

**原型是用一次性代码回答一个设计问题。** 问题决定了原型的形式。

规划完成后（1-规划）→ 仍有不确定的决策 → 先快速原型验证 → 确认后进入正式开发（4-开发）。

## MUST 规则

1. **逻辑和 TUI 严格分离。** 可移植逻辑模块不混入任何 print/终端代码。
2. **原型代码必须标记。# PROTOTYPE — answer a question, then delete** 放文件头部。
3. **一条命令能跑。** `python prototype_xxx.py`，无额外步骤。
4. **不做测试、不连真实数据库、不泛化。** 跑完就删。
5. **完成后记录答案+删除代码。** 唯一值得保留的是验证结论，不是代码。

## 第一步：确定问题

分析当前设计中最不确定的决策，决定原型要回答什么问题：

| 问题类型 | 原型形式 | 输出 |
|---|---|---|
| "这个数据模型/状态机感觉对吗？" | CLI 脚本 | 交互式终端程序，展示状态流转 |
| "这个算法/逻辑能跑通吗？" | CLI 脚本 | 输入样本，输出结果 |
| "这个 API 设计合理吗？" | CLI 脚本 | mock 客户端调用，展示请求/响应 |
| "这个 UI 交互方式对吗？" | Web 页面 | 多个 UI 变体（次要分支） |

**如果是 CLI 逻辑验证 → 走分支 A。如果是 UI/交互验证 → 走分支 B。** 如果两者都涉及且用户在线，先问用户聚焦哪个问题。

如果问题确实模糊且用户不在线：
- 优先按周边代码判断：后端/状态逻辑优先分支 A，页面/组件优先分支 B
- 在原型文件头部写明这个假设，避免后续误读

---

## 分支 A：逻辑/状态原型（CLI 脚本）

写一个可运行的 Python 小应用，推动状态机/数据模型通过难以在纸面上推理的路径。

### 第一步：陈述问题

写代码之前，用一段话写清楚：**正在验证什么状态模型？要回答什么问题？** 放在原型文件顶部的注释中。回答错误问题的原型是纯浪费。

### 第二步：隔离逻辑到可移植模块

把被验证的逻辑（状态机、reducer、纯函数集合）封装在一个**小接口后面**，使其可以从原型中直接 lift 出来放进正式代码。TUI 外壳是临时的，逻辑模块不是。

```python
# prototype_order_state.py
# 问题：订单状态机的 refunding→refunded→不可再退款 流程是否完整？

# --- 可移植逻辑模块 ---
from enum import Enum, auto

class OrderState(Enum):
    PENDING = auto()
    PAID = auto()
    REFUNDING = auto()
    REFUNDED = auto()

class OrderStateMachine:
    """可在正式代码中复用的状态机"""
    def __init__(self):
        self.state = OrderState.PENDING

    def pay(self):
        if self.state == OrderState.PENDING:
            self.state = OrderState.PAID

    def refund(self):
        if self.state == OrderState.PAID:
            self.state = OrderState.REFUNDING

    def complete_refund(self):
        if self.state == OrderState.REFUNDING:
            self.state = OrderState.REFUNDED

# --- 一次性 TUI 外壳（以下全删） ---
# ...
```

**选择最合适的形状**：
- **纯 reducer**: `(state, action) => state` — 动作为离散事件时
- **状态机**: 显式状态和转换 — "当前哪些操作合法"本身就是问题的一部分
- **纯函数集**: 没有隐含状态，只有变换
- **类**: 逻辑确实持有内部状态

保持纯：不 I/O、不终端代码、不 `print` 做控制流。

### 第三步：构建最小 TUI

将可移植逻辑挂到一个轻量终端界面上：

- 每次按键（或输入一行命令）→ 分发到 handler → 清屏重新渲染完整状态
- 上半部分：当前状态，diff 友好（一行一个字段）
- 下半部分：键盘快捷键 `[a] add  [d] delete  [q] quit`

最后加一条命令就能跑：`python prototype_xxx.py`

### 规则

1. **标记为一次性代码** — 文件头部加注释 `# PROTOTYPE — answer a question, then delete`
2. **一条命令就能跑** — `python prototype_xxx.py`，不需要额外步骤
3. **无持久化** — 状态在内存中。持久化正是原型要验证的东西，不要依赖它
4. **跳过打磨** — 不写测试、不做错误处理（只要能跑）、不抽象
5. **暴露状态** — 每次操作后打印完整状态，让用户看到变化
6. **放到被测模块旁边** — 命名加 `prototype_` 前缀，让人一眼看出不是生产代码；UI 原型遵循项目既有路由约定，不新造顶层结构

### 反模式

- ❌ **不要写测试** — 需要测试的原型已经不是原型了
- ❌ **不要连真实数据库** — 内存 store 就够
- ❌ **不要泛化** — "以后还要支持 X" 的想法不要有
- ❌ **不要把逻辑和 TUI 混在一起** — reducer 里混了 `print`/终端代码就不可移植了
- ❌ **不要把 TUI 外壳合入正式代码** — 外壳是为手操优化的一次性代码

### 示例

```
设计问题：订单状态机的"已支付→退款中→已退款"流程是否完整？

→ 原型：
   class OrderStateMachine:
       def __init__(self):
           self.state = "pending"
       def pay(self): ...
       def refund(self): ...
       def cancel(self): ...

→ 交互：
   State: pending
   操作: pay
   State: paid
   操作: refund
   State: refunding
   操作: complete_refund
   State: refunded
   操作: refund  ← 应该被拒绝
   Error: Cannot refund already refunded order
```

---

## 分支 B：UI/交互原型（Web）

如果问题涉及前端交互或界面布局：

- 生成 2-3 个截然不同的视觉方案
- 可在单一路由上通过参数切换
- 浮动的底部栏标识当前是哪个变体

> 注意：你的主要技术栈是 Python，UI 原型仅在你明确要求前端验证时使用。

---

## 原型完成后

**答案**是原型唯一值得保留的东西。

1. 如果用户在线：简短讨论，确定结论
2. 把结论记录到决策文档（commit message、ADR、或者就在当前对话中）
3. 删除原型代码，或者将验证通过的决策吸收到正式设计中
4. 进入 **4-开发**，用 TDD 实现正式代码

## 和上下游技能的关系

- **上游：1-规划 / 2-分析** — 规划完成后仍有不确定的设计决策
- **下游：4-开发** — 原型验证通过后，进入 TDD 正式实现
- **替代方案：** 如果设计没有不确定性，可以直接跳过原型进入 4-开发

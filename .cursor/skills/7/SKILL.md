---
name: 7-调试
description: Disciplined diagnosis loop for bugs and performance issues — reproduce → hypothesise → instrument → fix → regression test. Use when encountering a hard-to-reproduce bug or performance regression. 触发词：调试、debug、排查、诊断、报错、崩溃、性能问题、复现。
---

# 7-调试 — 结构化调试

六阶段调试流程，适用于难复现的 bug 和性能问题。

## 流程

## MUST 规则

1. **没有反馈回路，不进入假设阶段。** 先构建可复现的 pass/fail 信号。
2. **假设阶段至少列 3 条可证伪假设。** 不能只有一条（锚定偏见）。
3. **一次只改一个变量验证。** 不并行修改。
4. **所有调试标签用唯一 ID 标记。** 格式 `[DEBUG-xxxx]`，最后 grep 清除。

### 阶段 1 — 构建反馈回路

**这是核心技能。** 其他一切只是机械步骤。一个快速、确定性的 pass/fail 信号就能找到根因。没有这个信号，盯着代码看再久也没用。**投入不成比例的努力在这里。主动、有创意、拒绝放弃。**

按顺序尝试以下方法：

| 优先级 | 方法 | Python 实现 |
|---|---|---|
| 1 | **失败测试** | 在合适的接口层面写 pytest 测试（`assert` 捕捉症状） |
| 2 | **HTTP 脚本** | `curl` / `httpx` 循环调用，diff 响应码和 body |
| 3 | **CLI 复现** | 用 fixture 输入调用脚本，diff stdout 与已知正确的快照 |
| 4 | **回放捕获** | 保存真实请求/数据到文件，隔离重放走有问题的路径 |
| 5 | **一次性 harness** | 最小子集（mock 依赖），单函数调用触及 bug 路径 |
| 6 | **模糊循环** | 1000 个随机输入找失败模式——`pytest --randomly`、`hypothesis` |
| 7 | **二分 harness** | 如果 bug 在两次 commit 间出现 → 写 `git bisect run` 脚本 |
| 8 | **差异对比** | 相同输入在旧版 vs 新版，或两种配置下的输出差异 |

**优化回路本身**：

- 更快？缓存 setup、跳过无关初始化、缩小测试范围
- 信号更准？断言在具体症状，不是"没崩溃"
- 更确定？固定时间、种子 RNG、隔离文件系统

**非确定性 bug**：目标不是完美复现，而是**提高复现率**。循环触发 100 次、并行化、增加压力、缩小时间窗口。50% 概率的 flake 可以调试，1% 不行——把复现率提升到可调试的水平。

**Python 调试工具**：

| 场景 | 工具 |
|---|---|
| 快速插入断点 | `breakpoint()` |
| 调用追踪 | `python -m trace --trace script.py` |
| 性能分析 | `python -m cProfile -o output.prof script.py` |
| 火焰图 | `py-spy record -o flame.svg --pid <pid>` |
| 内存分析 | `tracemalloc`、`memory-profiler` |

**无法构建回路时** — 停下来，列出你尝试过的方法，请求访问权限或捕获的 artifact（HAR、日志转储、core dump）。**不要在没有回路的情况下进入假设阶段。**

---

### 阶段 2 — 复现

跑回路，确认 bug 确实出现。
- [ ] 回路产生的失败模式与描述一致（避免修错 bug）
- [ ] 多次运行可复现（非确定性问题也要提升到可调试复现率）
- [ ] 记录了可观察症状（错误信息/错误输出/性能指标）

---

### 阶段 3 — 假设

先列 **3-5 条假设**再开始验证。不能只有一个（锚定偏见）。

每条必须可证伪：**"如果 X 是原因，那么改 Y 会消除 bug"**

把排行列表展示给你再验证。你可能瞬间重排优先级。

---

### 阶段 4 — 工具验证

每个探测手段对应阶段 3 的一个具体预测。**一次只改一个变量。**

优先用调试器/REPL，其次用精准日志。不要"全部打 log 然后 grep"。

给每个调试日志打唯一标签如 `[DEBUG-a4f2]`，最后 grep 清除。

---

### 阶段 5 — 修复 + 回归测试

先判断是否有**正确测试接缝**：回归测试必须能覆盖真实触发链路，而不是过浅单元。

如果有正确接缝：
1. 把最小化复现变成失败测试
2. 确认失败
3. 实施修复
4. 确认通过
5. 重新跑原始场景确认修复

如果没有正确接缝：
- 明确记录"当前架构阻止可靠回归测试"这一发现
- 修复后把架构问题移交给 **6-优化**，作为后续重构输入

```python
# test_regression_<issue_number>.py
def test_payment_retry_on_timeout():
    """回归测试: 支付超时后应自动重试一次"""
    service = PaymentService(timeout=0.01)
    result = service.charge(amount=100)
    assert result.status == "completed"
    assert service.retry_count == 1
```

---

### 阶段 6 — 清理

- [ ] 原始场景不再复现
- [ ] 回归测试通过
- [ ] 所有调试标签已清除（`grep [DEBUG-`）
- [ ] 一次性原型删除

然后问：**"什么能防止这个 bug？"** 如果答案涉及架构变更，交给 6-优化。

---

## 什么时候用

- 遇到一个难复现的 bug
- 性能突然下降需要排查根因
- 修复了一个 bug 但不确定会不会再出现

## 案例

```
你：订单支付接口偶尔返回 500，帮我调试
Claude：先构建反馈回路——用 curl 循环调用 100 次看失败率。

       回路: while true; do curl -s -o /dev/null -w "%{http_code}"
             -X POST localhost:8000/payments; sleep 0.1; done

       发现约 5% 返回 500。进入假设阶段...

       3 条假设：
       1. 数据库连接池耗尽 → 增大连接数试试
       2. 第三方支付网关超时 → mock 网关看是否消失
       3. Redis 缓存穿透 → 检查缓存命中率

       开始验证...
```

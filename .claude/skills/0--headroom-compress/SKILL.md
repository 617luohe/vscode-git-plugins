---
name: 0--headroom-compress
description: Headroom 上下文压缩 — 使用 headroom MCP 工具压缩大段输出、检索原始内容、查看节省统计。会话中进行，节省 50-90% token。阶段 0 溢出技能。触发词：压缩内容、压缩上下文、headroom、headroom_compress、headroom_retrieve、headroom_stats、token太多、上下文太大、精简输出。
---

# 0--headroom-compress — 上下文压缩工具箱

luohe，我来用 Headroom 压缩上下文。

## 核心逻辑

Headroom 提供 MCP 工具用于智能上下文管理。当一个工具输出很大（搜索、文件读取、日志）、或者上下文窗口开始膨胀时，用这些工具压缩内容而不丢失信息。

> 基于 headroom-ai v0.28.1，已从 v0.20.15 更新。

## 三个工具

### 1. headroom_compress — 压缩内容

**何时用**：
- 任何工具输出超过 ~500 tokens
- 大段搜索结果、文件内容、日志、JSON
- 上下文窗口开始紧张时
- 批量读取多个文件后需要压缩汇总

**用法**：
```
mcp__headroom__headroom_compress(content="<要压缩的内容>")
```

**返回**：
- `compressed`: 压缩后文本
- `hash`: 检索用 hash key（用于 headroom_retrieve）
- `original_tokens` / `compressed_tokens`: 压缩前后 token 数
- `tokens_saved` / `savings_percent`: 节省统计
- `transforms`: 应用的压缩变换

### 2. headroom_retrieve — 检索原始内容

**何时用**：
- 压缩后需要查看完整原始内容
- hash 来自 `headroom_compress` 结果或压缩标记 `[N items compressed... hash=abc123]`

> **v0.28 变更**: 现在是 hash-only 完整内容查找，不再支持 query 参数过滤。

**用法**：
```
mcp__headroom__headroom_retrieve(hash="<hash_key>")
```

### 3. headroom_stats — 查看统计

**何时用**：
- 会话中想了解压缩效果
- 检查省了多少 token / 成本
- 长时间会话中定期检查

> **v0.28 增强**: 支持跨进程聚合（主 session + sub-agent）、proxy 汇总、持久化 savings ledger。

**用法**：
```
mcp__headroom__headroom_stats()
```

## MUST 规则

1. **大输出先压缩。** 文件内容、搜索结果、日志等超过 ~500 tokens 的大型工具输出，先用 `headroom_compress` 压缩再分析。
2. **压缩后保留 hash。** 如果后续可能需要完整内容，记住 hash 以便用 `headroom_retrieve` 检索。
3. **不做重复工作。** 如果你要读的文件已经被 headroom 缓存（`headroom_read`），用缓存版本而不是重新读取。
4. **定期检查统计。** 在长时间会话中，偶尔调用 `headroom_stats` 了解压缩效果。
5. **retrieve 只用 hash。** v0.28 的 `headroom_retrieve` 只接受 hash 参数，不支持 query 过滤。

## 压缩策略指南

### 代码文件
压缩代码时 headroom 使用 CodeCompressor（AST 感知，支持 Python/JS/Go/Rust/Java/C++/Perl），保留关键信息：
- 保留：函数签名、类定义、关键逻辑、imports
- 压缩：实现细节、注释、冗余代码
- 使用 `headroom_compress` 后，如需完整实现再 `headroom_retrieve`

### JSON/API 响应
SmartCrusher 处理：
- 保留：错误、异常、关键字段
- 去重：重复数组元素
- 结构保持：JSON 格式不变，子集化数组

### 日志/文本
Kompress ML 模型 + TextCrusher 快速路径处理：
- 保留：错误行、异常堆栈、关键信息
- 压缩：重复模式、正常输出
- TextCrusher: O(n) 单次遍历，亚秒级处理大文本

### MCP 工具输出
v0.28 新增 `integrations/mcp/server.py` 提供专门的 MCP 工具输出压缩：
- Slack 搜索：高错误保留，与查询相关性
- 数据库查询：模式检测，异常保留
- GitHub：错误 + 高优先级 issue 保留
- 日志：保留所有错误
- 文件系统：最小压缩（路径很重要）

## 适用场景

- 大型代码库搜索 → compress 搜索结果
- 长日志文件分析 → compress 日志内容
- 批量文件读取 → 逐个 compress 或汇总后 compress
- 上下文窗口告急 → compress 历史工具输出
- 会话结束检查 → stats 查看节省情况

## 与 0--neat-freak 的配合

- `0--neat-freak` 关注知识质量（文档/记忆是否正确）
- `0--headroom-compress` 关注上下文效率（token 是否浪费）
- 两者互补：neat-freak 清理知识，headroom 压缩传输

## 案例

```
你：搜索了整个项目的所有 Python 文件，输出太大
Claude：luohe，搜索结果太大，我先压缩一下。
       → headroom_compress(content=<搜索结果>)
       → 压缩后：关键 15 个文件，省了 73% token
       需要完整列表时可以用 headroom_retrieve(hash="abc123")
```

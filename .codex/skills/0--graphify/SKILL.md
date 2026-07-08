---
name: 0--graphify
description: "将代码、文档、PDF、图片、视频等构建为可查询的知识图谱（graphify-out/）。当用户要建索引、理解大型代码库架构、查询模块关系、或 graphify-out/ 已存在时优先触发。Also use for architecture questions, file relationships, god nodes, community detection, graphify query/path/explain — even if the user says 索引、知识图谱、graphify instead of the skill name."
---

# 0--graphify — 构建项目知识图谱

基于 [graphify](https://github.com/safishamsi/graphify)。将任意文件夹转为可导航的知识图谱：社区检测、诚实审计轨迹（EXTRACTED/INFERRED/AMBIGUOUS），输出交互式 HTML、`graph.json` 和 `GRAPH_REPORT.md`。

**依赖**：需安装 `graphifyy` CLI（`uv tool install graphifyy`）。PowerShell 下用 `graphify .`，不要用 `/0--graphify .`（前导 `/` 会被当作路径）。

---

## 快速索引

| 场景 | 跳转 |
|------|------|
| 用户执行完整构建（本地路径/GitHub URL） | [主流程](#主流程) Step 0-9 |
| graphify-out/ 已存在，用户问代码相关问题 | [query 模式](#for-0--graphify-query) |
| 用户只加 `--update` 或 `--cluster-only` | [update/cluster 模式](#for---update-and---cluster-only) |
| 用户要求 `--watch` 自动重建 | [references/add-watch.md](references/add-watch.md) |
| 用户要求 `--wiki`/`--neo4j` 等导出 | [references/exports.md](references/exports.md) |
| 用户要求安装 commit hook | [references/hooks.md](references/hooks.md) |
| 需要子代理提取规范 | [references/extraction-spec.md](references/extraction-spec.md) |

## MUST 规则

1. **graphify-out/graph.json 已存在 + 用户是自然语言问题（非重建命令）→ 直接跳到 query，不重建。**
2. **子代理必须用 `subagent_type="general-purpose"`，不能用 Explore（只读无法写 chunk 文件）。**
3. **所有子代理必须在同一条消息中并行派发，不能串行逐个等待。**
4. **代码块中 `INPUT_PATH`、`IS_DIRECTED`、`DEEP_MODE` 等占位符必须替换为实际值。**
5. **永远不编造边。不确定时用 AMBIGUOUS。永远显示 token 消耗。**
6. **graph.json 为空时不覆盖已有 graph.json（#479 shrink-guard）。**

## 触发场景

- 接手陌生大型项目，需要比 grep 更结构化的「地图」
- 已有 `graphify-out/graph.json`，想用自然语言查询架构关系
- 团队希望把 `graphify-out/` 提交到 git，共享项目图谱

---

## 主流程

用户无参数或给路径/URL 时，按 Step 0-9 执行。不跳过步骤。

### Step 0 — GitHub 仓库与多路径合并（仅 URL 或多路径时触发）

仅当路径是 `https://github.com/...` URL 或多个本地子目录要合并时触发。见 [references/github-and-merge.md](references/github-and-merge.md)。完成后用解析后的本地路径继续。

### Step 1 — 确保 graphify 已安装

执行 [references/install.md](references/install.md) 中的检测与安装逻辑。成功后进入 Step 2。

### Step 2 — 检测文件

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.detect import detect
from pathlib import Path
result = detect(Path('INPUT_PATH'))
print(json.dumps(result, ensure_ascii=False))
" > graphify-out/.graphify_detect.json
```

替换 INPUT_PATH。不要 cat JSON — 静默读取后展示摘要：

```
Corpus: X files · ~Y words
  code:     N files (.py .ts .go ...)
  docs:     N files (.md .txt ...)
  papers:   N files (.pdf ...)
  images:   N files
  video:    N files (.mp4 .mp3 ...)
```

零文件类别省略。

**决策树**：
- `total_files == 0`：停止，输出"No supported files found in [path]."
- `skipped_sensitive` 非空：只提跳过数量，不提文件名。
- `total_words > 2,000,000` 或 `total_files > 500`：展示警告 + 前 5 个子目录（按文件数），询问用户要跑哪个子目录。所有文件都在根目录无子目录 → 建议 `--no-cluster` 跳过聚类。
- 否则：直接进入 Step 2.5（有视频）或 Step 3（无视频）。

### Step 2.5 — 视频和音频（仅检测到视频文件时触发）

见 [references/transcribe.md](references/transcribe.md)。转录后，将转录文本作为文档文件在 Step 3 中处理。

### Step 3 — 提取实体和关系

分两部分：**结构提取**（Part A，确定性，免费）和 **语义提取**（Part B，LLM，消耗 token）。**Part A 和 Part B 并行运行。**

**Gemini 快速路径**：检查 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`。若任一已设置 → 提示一次 `Tip: set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini for semantic extraction`，然后用 `graphify.llm.extract_corpus_parallel(files, backend="gemini")` 替代 Claude 子代理派发。默认模型 `gemini-3-flash-preview`；设 `GRAPHIFY_GEMINI_MODEL` 覆盖。没有其他 API key 会被读取。

若两个 key 都未设置 → 走 Part B 子代理派发。

#### Part A — 代码文件结构提取

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.extract import collect_files, extract
from pathlib import Path
import json

code_files = []
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
for f in detect.get('files', {}).get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

if code_files:
    result = extract(code_files, cache_root=Path('.'))
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding=\"utf-8\")
    print(f'AST: {len(result[\"nodes\"])} nodes, {len(result[\"edges\"])} edges')
else:
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps({'nodes':[],'edges':[],'input_tokens':0,'output_tokens':0}, ensure_ascii=False), encoding=\"utf-8\")
    print('No code files - skipping AST extraction')
"
```

#### Part B — 语义提取（并行子代理）

**纯代码语料库（零 doc/paper/image 文件）→ 跳过 Part B，先写空语义文件**：

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps({'nodes':[],'edges':[],'hyperedges':[],'input_tokens':0,'output_tokens':0}), encoding='utf-8')
"
```

然后直接跳到 Part C。

**Step B0 — 检查提取缓存**

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.cache import check_semantic_cache
from pathlib import Path

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
all_files = [f for cat in ('document', 'paper', 'image') for f in detect['files'].get(cat, [])]

cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(all_files)

if cached_nodes or cached_edges or cached_hyperedges:
    Path('graphify-out/.graphify_cached.json').write_text(json.dumps({'nodes': cached_nodes, 'edges': cached_edges, 'hyperedges': cached_hyperedges}, ensure_ascii=False), encoding=\"utf-8\")
else:
    Path('graphify-out/.graphify_cached.json').unlink(missing_ok=True)
Path('graphify-out/.graphify_uncached.txt').write_text('\n'.join(uncached), encoding=\"utf-8\")
print(f'Cache: {len(all_files)-len(uncached)} files hit, {len(uncached)} files need extraction')
"
```

只对 `graphify-out/.graphify_uncached.txt` 中的文件派发子代理。全部缓存 → 直接跳到 Part C。

**Step B1-B2 — 分块并并行派发子代理**

加载 `graphify-out/.graphify_uncached.txt` 中的文件。按 20-25 个文件一块分割（图片单独成块）。同目录文件分组到同一块。

**同一消息中派发所有子代理**（一条消息中多个 Agent 工具调用，不串行）。

估算时间：`~45s × ceil(agents/parallel_limit)`。先打印："Semantic extraction: ~N files → X agents, estimated ~Ys"

每个子代理提示词见 [references/extraction-spec.md](references/extraction-spec.md)（含 JSON schema、node-ID 规则、置信度标准、frontmatter、超边、视觉规则）。替换 FILE_LIST、CHUNK_NUM、TOTAL_CHUNKS、DEEP_MODE、CHUNK_PATH。

CHUNK_PATH 必须为绝对路径：
```powershell
$PROJECT_ROOT = (Get-Location).Path
# chunk N: $CHUNK_PATH = Join-Path $PROJECT_ROOT "graphify-out\.graphify_chunk_0N.json"
```

**Step B3 — 收集、缓存、合并**

等待所有子代理。每个结果：
- 检查 `graphify-out/.graphify_chunk_NN.json` 是否存在（成功信号）
- 文件存在且含有效 JSON（有 `nodes` 和 `edges`）→ 纳入并保存到缓存
- 文件缺失 → 警告"chunk N missing — subagent may have been read-only. Re-run with general-purpose agent."
- 子代理失败或返回无效 JSON → 警告并跳过该 chunk

超过半数 chunk 失败或缺失 → 停止并告知用户重新运行，确保使用 `subagent_type="general-purpose"`。

**每个 Agent 调用完成后，从 Agent 工具结果的 `usage` 字段读取真实 token 数，写回 chunk JSON**（chunk JSON 本身占位为零）。然后运行合并：

```bash
$(cat graphify-out/.graphify_python) -c "
import json, glob
from pathlib import Path

chunks = sorted(glob.glob('graphify-out/.graphify_chunk_*.json'))
all_nodes, all_edges, all_hyperedges = [], [], []
total_in, total_out = 0, 0
for c in chunks:
    d = json.loads(Path(c).read_text(encoding=\"utf-8\"))
    all_nodes += d.get('nodes', [])
    all_edges += d.get('edges', [])
    all_hyperedges += d.get('hyperedges', [])
    total_in += d.get('input_tokens', 0)
    total_out += d.get('output_tokens', 0)
Path('graphify-out/.graphify_semantic_new.json').write_text(json.dumps({
    'nodes': all_nodes, 'edges': all_edges, 'hyperedges': all_hyperedges,
    'input_tokens': total_in, 'output_tokens': total_out,
}, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Merged {len(chunks)} chunks: {total_in:,} in / {total_out:,} out tokens')
"
```

保存缓存 + 合并已有缓存与新结果：

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.cache import save_semantic_cache
from pathlib import Path

new = json.loads(Path('graphify-out/.graphify_semantic_new.json').read_text(encoding=\"utf-8\")) if Path('graphify-out/.graphify_semantic_new.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}
saved = save_semantic_cache(new.get('nodes', []), new.get('edges', []), new.get('hyperedges', []))
print(f'Cached {saved} files')

cached = json.loads(Path('graphify-out/.graphify_cached.json').read_text(encoding=\"utf-8\")) if Path('graphify-out/.graphify_cached.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}

all_nodes = cached['nodes'] + new.get('nodes', [])
all_edges = cached['edges'] + new.get('edges', [])
all_hyperedges = cached.get('hyperedges', []) + new.get('hyperedges', [])
seen = set()
deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        seen.add(n['id'])
        deduped.append(n)

merged = {
    'nodes': deduped,
    'edges': all_edges,
    'hyperedges': all_hyperedges,
    'input_tokens': new.get('input_tokens', 0),
    'output_tokens': new.get('output_tokens', 0),
}
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Extraction complete - {len(deduped)} nodes, {len(all_edges)} edges ({len(cached[\"nodes\"])} from cache, {len(new.get(\"nodes\",[]))} new)')
"
```

清理临时文件：`rm -f graphify-out/.graphify_cached.json graphify-out/.graphify_uncached.txt graphify-out/.graphify_semantic_new.json`

#### Part C — 合并 AST + 语义

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from pathlib import Path

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding=\"utf-8\"))
sem = json.loads(Path('graphify-out/.graphify_semantic.json').read_text(encoding=\"utf-8\"))

seen = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem['nodes']:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])

merged_edges = ast['edges'] + sem['edges']
merged_hyperedges = sem.get('hyperedges', [])
merged = {
    'nodes': merged_nodes,
    'edges': merged_edges,
    'hyperedges': merged_hyperedges,
    'input_tokens': sem.get('input_tokens', 0),
    'output_tokens': sem.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding=\"utf-8\")
total = len(merged_nodes)
edges = len(merged_edges)
print(f'Merged: {total} nodes, {edges} edges ({len(ast[\"nodes\"])} AST + {len(sem[\"nodes\"])} semantic)')
"
```

### Step 4 — 建图、聚类、分析、生成输出

将 `IS_DIRECTED` 替换为 `--directed` 标志的值（`True` 或 `False`）。

```bash
mkdir -p graphify-out
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))

G = build_from_json(extraction, root='INPUT_PATH', directed=IS_DIRECTED)
if G.number_of_nodes() == 0:
    print('ERROR: Graph is empty - extraction produced no nodes.')
    raise SystemExit(1)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}
questions = suggest_questions(G, communities, labels)

# #479 shrink-guard
wrote = to_json(G, communities, 'graphify-out/graph.json')
if not wrote:
    print('ERROR: refused to shrink graphify-out/graph.json (existing graph has more nodes; #479).')
    raise SystemExit(1)
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding=\"utf-8\")
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')
"
```

输出 `ERROR: Graph is empty` → 停止，告知用户原因。不进入后续步骤。

### Step 5 — 标注社区

读取 `graphify-out/.graphify_analysis.json`。为每个社区键取 2-5 个词的易读名称（如"Attention Mechanism"、"Training Pipeline"）。

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding=\"utf-8\"))

G = build_from_json(extraction, root='INPUT_PATH', directed=IS_DIRECTED)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

labels = LABELS_DICT  # <-- 替换为实际标注的 dict

questions = suggest_questions(G, communities, labels)
report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding=\"utf-8\")
print('Report updated with community labels')
"
```

### Step 6 — HTML + Obsidian（按需）

**HTML 始终生成**（除非 `--no-viz`）。Obsidian 仅在 `--obsidian` 时生成：

```bash
graphify export html   # auto-aggregates to community view if graph > 5000 nodes
# --obsidian 时: graphify export obsidian [--dir ~/vaults/my-project]
```

### Steps 6b-8 — 导出（仅对应 flag 出现时触发）

`--wiki`、`--neo4j`/`--neo4j-push`、`--falkordb`/`--falkordb-push`、`--svg`、`--graphml`、`--mcp`。详见 [references/exports.md](references/exports.md)。`--wiki` 在 Step 9 清理前运行。

### Step 9 — 保存清单、更新成本、清理、输出报告

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
from datetime import datetime, timezone
from graphify.detect import save_manifest

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
save_manifest(detect.get('all_files') or detect['files'])

extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)

cost_path = Path('graphify-out/cost.json')
if cost_path.exists():
    cost = json.loads(cost_path.read_text(encoding=\"utf-8\"))
else:
    cost = {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}

cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detect.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2, ensure_ascii=False), encoding=\"utf-8\")

print(f'This run: {input_tok:,} input tokens, {output_tok:,} output tokens')
print(f'All time: {cost[\"total_input_tokens\"]:,} input, {cost[\"total_output_tokens\"]:,} output ({len(cost[\"runs\"])} runs)')
"
rm -f graphify-out/.graphify_detect.json graphify-out/.graphify_extract.json graphify-out/.graphify_ast.json graphify-out/.graphify_semantic.json graphify-out/.graphify_analysis.json
find graphify-out -maxdepth 1 -name '.graphify_chunk_*.json' -delete 2>/dev/null
rm -f graphify-out/.needs_update 2>/dev/null || true
```

清理后输出：

```
Graph complete. Outputs in PATH_TO_DIR/graphify-out/

  graph.html            - interactive graph, open in browser
  GRAPH_REPORT.md       - audit report
  graph.json            - raw graph data
  obsidian/             - Obsidian vault (only if --obsidian was given)
```

然后从 GRAPH_REPORT.md 中粘贴以下三个部分到聊天中：**God Nodes**、**Surprising Connections**、**Suggested Questions**。不粘贴完整报告。

最后，选择报告中最有趣的问题（跨社区边界最多或桥接节点最令人惊讶的）询问用户：

> "The most interesting question this graph can answer: **[question]**. Want me to trace it?"

如果用户同意 → 运行 `graphify query "[question]"`，引导用户探索图谱。

---

## Interpreter guard for subcommands

运行子命令（`--update`、`--cluster-only`、`query`、`path`、`explain`、`add`）前，若 `.graphify_python` 缺失，重新解析解释器：

```bash
if [ ! -f graphify-out/.graphify_python ]; then
    GRAPHIFY_BIN=$(which graphify 2>/dev/null)
    if [ -n "$GRAPHIFY_BIN" ]; then
        PYTHON=$(head -1 "$GRAPHIFY_BIN" | tr -d '#!')
        case "$PYTHON" in *[!a-zA-Z0-9/_.-]*) PYTHON="python3" ;; esac
    else
        PYTHON="python3"
    fi
    mkdir -p graphify-out
    "$PYTHON" -c "import sys; open('graphify-out/.graphify_python', 'w', encoding='utf-8').write(sys.executable)"
fi
```

---

## For --update and --cluster-only

见 [references/update.md](references/update.md)。

## For /0--graphify query

`graphify-out/graph.json` 已存在且用户询问语料库相关问题 → 从图谱回答，不重建：

```bash
graphify query "<question>"
```

查询前先用图谱自身词汇扩展问题。详见 [references/query.md](references/query.md)（含 BFS/DFS 遍历模式、`--budget` 上限、NetworkX 回退、`save-result` 反馈、`/0--graphify path` 和 `/0--graphify explain` 流程）。

## For /0--graphify add and --watch

见 [references/add-watch.md](references/add-watch.md)。

## For commit hook and CLAUDE.md integration

见 [references/hooks.md](references/hooks.md)。

---

## Troubleshooting

### PowerShell 5.1: Vertical scrolling stops working

由 `graspologic` 库的 ANSI 转义序列导致。Graphify v0.3.10+ 已抑制此输出。仍出现时：

1. **升级 graphify**: `pip install --upgrade graphifyy`
2. **使用 Windows Terminal** 替代旧版 PowerShell 控制台
3. **重置终端**: 关闭并重新打开 PowerShell
4. **跳过 graspologic**: 卸载（`pip uninstall graspologic`），graphify 将回退到 NetworkX 内置 Louvain 算法

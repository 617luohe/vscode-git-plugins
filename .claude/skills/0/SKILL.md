---
name: 0-启动
description: One-shot new project bootstrap — creates scaffold, uv environment, pre-commit (Ruff + mypy + pytest), git init, and task tracking config. Use when starting a new Python project. 触发词：新项目、初始化、搭建、脚手架、创建项目、启动项目、uv、pre-commit。
---

# 0-启动 — 新项目初始化

新建 Python 项目一条龙：从目录结构到 pre-commit 到首次提交。

## MUST 规则

1. **依次确认关键选项，不跳过。** Python版本 → mypy strict? → Ruff 行长度/引号风格。
2. **uv 不可用时自动安装。** 不询问用户。
3. **所有生成文件均展示预览，确认后再写盘。**
4. **最终必须通过验证清单：** `uv run pytest` + `pre-commit run --all-files` 均通过。

## 流程

### 1. 确认项目信息

- **项目名称** — 用于目录名和包名
- **Python 版本** — 默认 >=3.12，跟随用户指定的版本
- **mypy 严格模式？** — 询问是否开启 strict（默认不开启）
- **Ruff 风格偏好** — 询问行长度（88/120）和引号风格（双/单），默认 88 + 双引号

### 2. 检测并安装 uv

如果 `uv` 未安装，自动安装：

```bash
# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# WSL / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 3. 创建目录结构

```
project-name/
├── src/
│   └── project_name/
│       ├── __init__.py
│       └── main.py
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── .gitignore
├── .pre-commit-config.yaml
├── pyproject.toml
└── README.md
```

```bash
mkdir -p src/project_name tests
```

### 4. 生成入口文件和测试

`src/project_name/main.py` — 带 `def main()` 入口 + `if __name__ == "__main__"` 块。

`tests/test_main.py` — 一个空占位测试。

### 5. 生成 `.gitignore`

```
__pycache__/
*.py[cod]
*.egg-info/
.venv/
.env
dist/
build/
.ruff_cache/
.mypy_cache/
.pytest_cache/
```

### 6. 创建 uv 虚拟环境 + 安装依赖

```bash
uv venv
uv add --dev pre-commit ruff mypy pytest
```

### 7. 创建 `pyproject.toml`

```toml
[project]
name = "project-name"
version = "0.1.0"
description = ""
requires-python = ">=3.12"
dependencies = []

[tool.ruff]
line-length = 88           # 或用户选择
target-version = "py312"

[tool.ruff.format]
quote-style = "double"     # 或用户选择

[tool.mypy]
python_version = "3.12"
strict = false             # 或 true，基于用户选择
ignore_missing_imports = true

[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]
```

### 8. 创建 `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.11.0
    hooks:
      - id: ruff format
      - id: ruff check
        args: ["--fix", "--exit-non-zero-on-fix"]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.15.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        types: [python]
        pass_filenames: false
        always_run: true
```

**行为说明**：
- Ruff format — 自动格式化，失败则阻塞
- Ruff check — 自动修复（`--fix`），残留则阻塞
- mypy — 类型错误阻塞提交
- pytest — 全部测试，失败则阻塞

如果用户选择跳过 mypy，则省略对应 hook。如果尚无测试，省略 pytest hook 并告知用户。

### 9. 安装 pre-commit 钩子

```bash
pre-commit install
```

### 10. 初始化 git 仓库

```bash
git init
git add .
git commit -m "Initial project scaffold"
```

### 11. 配置任务管理方式

询问用户：

> **任务管理方式**：
> - **本地模式**（默认） — 创建 `.scratch/todo.md` 管理任务清单
> - **GitHub 模式** — 如果在 GitHub 上，配置 GitHub Issues + triage 标签

### 12. 验证清单

- [ ] `src/` 和 `tests/` 目录结构正确
- [ ] `uv run pytest` 通过
- [ ] `pre-commit run --all-files` 通过
- [ ] git 仓库已初始化并有首次提交
- [ ] 任务管理方式已配置

## 什么时候用

- 开始一个全新的 Python 项目
- 需要快速搭建可运行的项目骨架，带完整工具链
- 想确保每个新项目都用统一的标准配置

## 案例

```
你：新建一个项目叫 data-pipeline，帮我启动
Claude：Python 版本？用 uv？
你：>=3.12，用 uv
Claude：mypy 要 strict 吗？(y/N)
你：N
Claude：Ruff 行长度用 88 还是 120？
你：120
...
Claude：项目已就绪。运行 `uv run pytest` 验证，然后 `uv run pre-commit run --all-files`。
```

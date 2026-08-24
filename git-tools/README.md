# Git Tools

统一的 Git 工具插件，合并了原来的两个插件：

1. **Git Commit**（原 `quick-git-commit`）：为选中的文件生成 Commit 消息，并直接写入源代码管理（SCM）的提交输入框。
2. **Git Exclude**（原 `quick-git-exclude`）：把选中的文件/文件夹从版本管理中排除（`git rm --cached`），并可选添加到 `.gitignore`。

## 功能

### 生成 Commit 消息（AI）

在源代码管理面板中右键选中文件（可多选），运行 **Generate Commit Message**：
- 自动读取 VS Code Git 扩展拿到当前仓库；
- 对选中的已跟踪文件做 `git diff HEAD`，未跟踪文件内联其内容（超限可跳过）；
- 通过配置的 AI 服务商（OpenAI 兼容 / Anthropic 兼容）流式生成提交信息，写入提交输入框；
- 可选自动暂存选中的文件（`gitTools.autoStageSelectedFiles`）。

提供 **Switch AI Model** 命令（仅 OpenAI 兼容服务支持列出可用模型）。

### Exclude from Version Control

在资源管理器或源代码管理面板右键文件/文件夹，运行 **Exclude from Version Control**：
- 把所有选中路径的已跟踪文件从 Git 索引移除（`git rm --cached`，按 50 个一批）；
- 询问是否把路径写入 `.gitignore` 以永久忽略。

## 命令与配置（合并后统一命名空间 `git-tools` / `gitTools`）

| 命令 | 用途 |
| --- | --- |
| `git-tools.generateCommit` | 为选中文件生成 Commit 消息 |
| `git-tools.switchAIModel` | 切换 AI 模型（OpenAI 兼容） |
| `git-tools.excludeFromVC` | 从版本管理排除并可选加入 .gitignore |

配置项改由 `gitTools.*` 命名空间提供（原 `quick-git-commit.*` 的设置已迁移，需重新配置）。

## 开发

```bash
npm ci
npm run typecheck
npm test
npm run compile
npm run vscode:package
```

> 注意：本仓库位于 WSL 挂载路径，Windows 侧 npm 在 UNC 当前目录下会报错，建议在 WSL 内或把目录复制到本地路径后再执行 npm。

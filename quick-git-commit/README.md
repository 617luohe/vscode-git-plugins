# Quick Git Commit

在 VSCode 源代码管理面板选中若干文件，右键即可只针对这些文件用 AI 生成 commit 消息，并写入提交输入框。

## 功能

- **选中文件生成**：在 SCM 面板选中一个或多个文件，右键 → `Quick Commit: 生成提交信息`，仅针对选中文件生成。
- **自动暂存**：生成时自动把选中文件加入暂存区（可在设置中关闭），点提交即只提交这批文件。
- **新文件识别**：选中包含未跟踪的新文件时，自动读取其内容纳入分析。
- **双 Provider**：支持 OpenAI 兼容接口与 Anthropic，可切换模型。

## 配置

在设置中搜索 `Quick Git Commit`：

- `quick-git-commit.provider`：`OpenAI` 或 `Anthropic`
- `quick-git-commit.openai.baseUrl` / `apiKey` / `model`
- `quick-git-commit.anthropic.baseUrl` / `apiKey` / `model`
- `quick-git-commit.language`：输出语言（简体中文 / English）
- `quick-git-commit.autoStageSelectedFiles`：是否自动暂存选中文件（默认开启）

## 使用

1. 在源代码管理面板选中要提交的文件。
2. 右键 → `Quick Commit: 生成提交信息`。
3. 生成的消息自动写入提交输入框，确认后提交、推送。

# VSCode插件

本项目包含三个 VS Code 插件：

- `quick-git-commit`：根据选中的 Git 变更生成提交信息。
- `quick-git-exclude`：从版本控制中排除文件。
- `opencode-sidebar`：从 Activity Bar 一键打开已安装的 OpenCode 插件。

`opencode-sidebar` 委托调用独立安装的 OpenCode 插件（`sst-dev.opencode`），不内置或重新实现 OpenCode。

## 开发

每个插件都是独立的 Node.js 项目。进入对应目录后执行：

```bash
npm ci
npm run typecheck
npm test
npm run compile
```

项目目录名称仅用于仓库组织，不改变插件的 `name`、`publisher`、命令 ID 或配置键。

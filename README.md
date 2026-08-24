# VSCode 插件

本仓库包含 VS Code 插件。

## 合并后的统一插件（推荐）

为避免碎片化，原多个插件已合并为两个统一插件，命令/配置使用独立命名空间：

- **`opencode-tools`**：OpenCode 相关工具合集。
  1. Activity Bar 一键启动 OpenCode（原 `opencode-sidebar`，点击图标直接打开，无"点击启动"子项）；
  2. 整套配置切换（纯 DeepSeek / 纯 Max JOJO / 混合，原 `opencode-profile-switcher`）；
  3. omos / pomos 插件模式切换（原 `opencode-mode-switcher`）。
- **`git-tools`**：Git 相关工具合集。
  1. 为选中的 Git 变更生成提交信息（原 `quick-git-commit`）；
  2. 从版本控制中排除文件/文件夹（原 `quick-git-exclude`）。

`opencode-tools` 委托调用独立安装的 OpenCode 插件（`sst-dev.opencode`），不内置或重新实现 OpenCode。

## 旧插件目录

`opencode-sidebar`、`opencode-mode-switcher`、`opencode-profile-switcher`、`quick-git-commit`、`quick-git-exclude`
为保留的旧版本（历史参考），合并后无需单独安装，其功能与命令已并入上述两个统一插件。

## 开发

每个插件目录都是独立的 Node.js 项目。进入对应目录后执行：

```bash
npm ci
npm run typecheck
npm test
npm run compile
npm run vscode:package   # 打 .vsix 安装包
```

> 注意：本仓库文件位于 WSL 挂载路径，Windows 侧 npm 在 UNC 当前目录下会报错（`Maximum call stack size exceeded` / `EPERM mkdir 'C:\Windows\dist'`），建议在 WSL 内或把目录复制到本地路径后再执行 npm 命令。

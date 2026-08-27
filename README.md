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

> 历史插件 `opencode-sidebar`、`opencode-mode-switcher`、`opencode-profile-switcher`、`quick-git-commit`、`quick-git-exclude`
> 已合并进上述两个统一插件并从仓库移除；如需查看其源码可从 git 历史（`1cf500e` 及之前）获取。

## 与 omos 编排体系的关系

`opencode-tools` 的 **omos/pomos 模式开关** 对应另一仓库 **omos**（个人 OpenCode 多代理编排插件，贵模型编排 + 便宜子代理执行）：

| 组件 | 位置 | 职责 |
|------|------|------|
| omos 插件本体 | `~/.config/opencode/vendor/omos/` | 注入 orchestrator/researcher/coder/reviewer 四角色，子代理调度、Job Board、idle-wake、offpeak 峰谷门控 |
| 主配置 | `~/.config/opencode/opencode.jsonc` | `plugin` 数组决定 omos/pomos（由本插件的模式切换器改写） |
| 运行时配置 | `~/.config/opencode/omos.json` | omos 插件行为（四角色模型、编排触发词、峰谷窗口、通知） |
| 配置模板 | `~/.config/opencode/profiles/` | 整套 provider/model 配置（由配置切换器改写） |

- **pomos 模式**：`plugin` 为空数组，OpenCode 原生纯净运行，不加载任何编排插件。
- **omos 模式**：`plugin` 指向 omos 构建产物。主编排器**默认直接干活**，只有用户消息命中 `orchestration.triggers`（默认 `build` / `ulw`）才进入完整多代理编排，以节省 token。

部署/更新 omos 插件见 [`opencode-tools/README.md`](opencode-tools/README.md) 的「omos 插件部署与更新」一节。

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

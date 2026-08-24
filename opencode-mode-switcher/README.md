# OpenCode Mode Switcher

在 VS Code 中一键切换 OpenCode 的启动模式：

- **pomos**：原生纯净 OpenCode（不加载任何插件）
- **omos**：加载 `oh-my-opencode-slim` 插件

## 功能

- **状态栏**：实时显示当前模式（`pomos` / `omos`），点击即可来回切换。
- **启动命令**：`OpenCode Mode Switcher: 用当前模式启动 OpenCode`——按当前模式启动 OpenCode，在 omos 模式下通过 `OPENCODE_CONFIG_CONTENT` 注入并加载插件。
- **持久化**：模式存入扩展的 `globalState`，切换影响**下次启动**。

## 使用

- 切换模式：点击状态栏的 `pomos` / `omos` 图标，或从命令面板运行 `切换 omos / pomos`。
- 启动：运行 `用当前模式启动 OpenCode`。

> 注意：OpenCode 的 `plugin` 配置是"追加合并"而非替换，因此主配置建议保持原生（`plugin: []`），omos 模式在启动时通过环境变量追加插件。

## 开发

```bash
npm ci
npm run typecheck
npm run compile
npm run vscode:package
```

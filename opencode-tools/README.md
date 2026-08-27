# OpenCode Tools

统一的 OpenCode 工具插件，合并了原来的三个插件：

1. **活动栏快捷启动**（原 `opencode-sidebar`）：点击左侧活动栏的 OpenCode 图标即直接启动（`opencode.openNewTerminal`），侧边栏不再有"点击启动"子项。
2. **整套配置切换**（原 `opencode-profile-switcher`）：从状态栏选择并切换整套 OpenCode 配置（纯 DeepSeek / 纯 Max JOJO / 混合）。
3. **omos/pomos 模式切换**（原 `opencode-mode-switcher`）：在 omos（加载个人编排插件 `omos`）与 pomos（原生）之间切换。

## 功能

- **状态栏 · 配置切换**：`$(verified) opencode: <当前配置名>`。点击弹出模板列表，选中后整体覆盖主配置文件 `opencode.jsonc`，下次启动 opencode 生效。首次若模板目录为空会自动生成三份骨架（`pure-deepseek.jsonc` / `pure-maxjojo.jsonc` / `hybrid-maxjojo-deepseek.jsonc`）。
- **状态栏 · 模式切换**：`$(rocket) omos` / `$(circle-slash) pomos`，改写主配置文件的 `plugin` 数组（omos → 主配置同目录下的 `vendor/omos/dist/index.js` 绝对 `file://` URL，pomos → `[]`）。切换整套配置模板时会保留当前模式，避免冲掉 plugin。
- **活动栏**：点击 OpenCode 图标直接启动。
- **命令**：`选择 OpenCode 配置`、`用当前配置启动 OpenCode`、`切换 omos / pomos`。

## 命令 / 配置

| 命令 | 用途 |
| --- | --- |
| `opencode-tools.selectProfile` | 选择整套配置 |
| `opencode-tools.toggleMode` | 切换 omos / pomos |
| `opencode-tools.launch` | 用当前配置启动 OpenCode |
| `opencode-tools.installOpenCode` | 安装 OpenCode（命令面板隐藏） |

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| `opencodeTools.configFile` | `""` | OpenCode 主配置文件绝对路径，留空自动探测常见位置 |
| `opencodeTools.profileDir` | `""` | 模板目录，留空自动使用主配置所在目录下的 `profiles` 子目录 |

## omos 插件部署与更新

本插件的 omos/pomos 开关只改主配置 `opencode.jsonc` 的 `plugin` 数组，不负责部署 omos 本体。omos 插件由 omos 仓库维护，部署位置为：

```
~/.config/opencode/vendor/omos/dist/index.js
```

**首次部署 / 版本更新**（在 omos 仓库内执行，WSL 侧而非 Windows UNC 侧）：

```bash
cd ~/workplace/omos
bun install && bun run build
mkdir -p ~/.config/opencode/vendor/omos
cp -r dist omos.schema.json package.json ~/.config/opencode/vendor/omos/
```

> 切换器 `modeSwitcher.ts` 已同时识别本地 `file://` 入口与私有 scoped 包 `@617luohe/omos`；当前默认走本地 `vendor/omos/dist/index.js` 路径。

**运行时配置** `~/.config/opencode/omos.json` 与主配置互不冲突，插件加载后读取。其中新字段：

- `orchestration.triggers: ["build", "ulw"]` —— 只有用户消息命中这些词时才进入完整多代理编排，否则主编排器直接干活（节省 token）。
- `offpeakQueue.storagePath` —— offpeak 排队持久化文件（可选）。

## 使用

- 打开命令面板（`Ctrl+Shift+P`）运行 `选择 OpenCode 配置` 切换整套配置。
- 点击状态栏的 `opencode: <配置名>` 同样可以切换。
- 点击活动栏 OpenCode 图标直接启动。
- 首次启动若配置文件缺失会提示在设置中指定。
- 生成的模板需打开补填各自 provider 的 apiKey 后再切换。

## 开发

```bash
npm ci
npm run typecheck
npm run compile
npm run vscode:package
```

> 注意：本仓库位于 WSL 挂载路径，Windows 侧 npm 在 UNC 当前目录下会报错，建议在 WSL 内或把目录复制到本地路径后再执行 npm。

# OpenCode Profile Switcher

在 VS Code 中对 **OpenCode 的整套配置文件**进行一键切换（例如你的三套 omos 配置：**纯 DeepSeek / 纯 Max JOJO / Max JOJO + DeepSeek 混合**）。

它不再是简单改写 `plugin` 数组，而是把你指定的配置模板文件**整体拷贝覆盖**到 OpenCode 主配置文件。切换后**下次启动 opencode 生效**。

## 原理

- 你在某个目录里放若干份 OpenCode 配置模板（`*.jsonc` / `*.json`），每个文件代表一套配置。
- 点击右下角状态栏图标 → 弹出选择列表 → 选中的模板会被**整体写入** OpenCode 主配置文件 `opencode.jsonc`。
- 状态栏实时显示当前生效的是哪套配置（与模板内容完全比对；若主配置与任何模板都不匹配则显示"自定义"）。

> 主配置文件路径沿用本仓库既有插件的探测逻辑：优先使用设置 `opencodeProfileSwitcher.configFile`，否则自动探测
> `/mnt/c/Users/<用户>/.config/opencode/opencode.jsonc`（Remote-WSL 视角）与 Windows 侧常见路径。

## 使用步骤

**零配置（推荐）**：什么都不用设。插件会自动在 opencode 主配置所在目录下使用 `profiles` 子目录
（例如 `C:\Users\Administrator\.config\opencode\profiles`）。若该目录为空，首次启动会自动生成三份模板骨架：
`pure-deepseek.jsonc`、`pure-maxjojo.jsonc`、`hybrid-maxjojo-deepseek.jsonc`。

1. **补齐模板**：打开刚生成的骨架，把各自的 `sk-REPLACE_..._API_KEY` 替换成真实 key（DeepSeek / Max JOJO）。
   也可自行改模板内容或增删文件（每个 `.jsonc`/`.json` 就是一套配置）。

2. **（可选）自定义目录/路径**：若想改位置，在 `settings.json` 里指定：
   ```jsonc
   {
     "opencodeProfileSwitcher.profileDir": "C:\\Users\\Administrator\\.config\\opencode\\profiles",
     "opencodeProfileSwitcher.configFile": "C:\\Users\\Administrator\\.config\\opencode\\opencode.jsonc"
   }
   ```
   `profileDir` 留空则自动探测；`configFile` 留空则自动探测常见位置。

3. **切换**：点右下角状态栏图标（`opencode: <当前配置名>`），或命令面板运行 `选择 OpenCode 配置（Profile）`。

4. **启动**：命令面板运行 `用当前配置启动 OpenCode` 会在新终端启动 `opencode`。

## 开发

```bash
npm ci
npm run typecheck
npm run compile
npm run vscode:package   # 打 .vsix 安装包
```

> 注意：本项目 git 仓库文件位于 WSL 挂载路径（`\\wsl.localhost\...`），Windows 侧 npm 在 UNC 当前目录下会报错
> （`Maximum call stack size exceeded` / `EPERM mkdir 'C:\Windows\dist'`）。建议在 WSL 内或把目录复制到本地路径后再执行 npm 命令。

## 与既有 `opencode-mode-switcher` 的区别

- `opencode-mode-switcher`：在 omos（含 `oh-my-opencode-slim` 插件）与 pomos（纯原生）之间切换，只改写 `plugin` 数组。
- 本插件：切换**多套完整配置**（provider / model / agent 等全部差异），替换整个配置文件。

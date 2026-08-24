import * as vscode from "vscode"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

export type LaunchMode = "omos" | "pomos"

/** oh-my-opencode-slim 插件名（opencode 把 plugin 数组合并而非替换，故 pomos 需从配置中移除该条目） */
const OMOS_PLUGIN = "oh-my-opencode-slim@2.2.15"
const STORAGE_KEY = "opencodeModeSwitcher.launchMode"
const CONFIG_FILE_SETTING = "opencodeModeSwitcher.configFile"

const TOGGLE_COMMAND = "opencode-mode-switcher.toggle"
const LAUNCH_COMMAND = "opencode-mode-switcher.launch"

/**
 * 配置文件候选路径。
 * 注意：插件运行在 Remote-WSL 的 VSCode Server（WSL 侧），而 opencode 本体是
 * Windows 侧的 npm 安装，其配置在 C:\Users\...\.config\opencode\opencode.jsonc，
 * WSL 视角即 /mnt/c/Users/.../。同时兼容 WSL 本地配置与 Windows 侧运行。
 */
function defaultConfigCandidates(): string[] {
  const home = os.homedir()
  const winProfile = process.env.USERPROFILE || "C:\\Users\\Administrator"
  return [
    "/mnt/c/Users/Administrator/.config/opencode/opencode.jsonc",
    path.join(winProfile, ".config", "opencode", "opencode.jsonc"),
    path.join(home, ".config", "opencode", "opencode.jsonc"),
    path.join(home, ".config", "opencode", "opencode.json"),
  ]
}

function resolveConfigFile(): string | undefined {
  const configured = vscode.workspace
    .getConfiguration("opencodeModeSwitcher")
    .get<string>(CONFIG_FILE_SETTING)
  if (configured && fs.existsSync(configured)) return configured
  for (const c of defaultConfigCandidates()) {
    if (fs.existsSync(c)) return c
  }
  return undefined
}

/** 读取配置文件里的 plugin 数组，判断当前是否为 omos */
function readModeFromConfig(configFile: string): LaunchMode {
  try {
    const raw = fs.readFileSync(configFile, "utf8")
    const m = raw.match(/"plugin"\s*:\s*\[([^\]]*)\]/)
    if (!m) return "pomos"
    return m[1].includes("oh-my-opencode-slim") ? "omos" : "pomos"
  } catch {
    return "pomos"
  }
}

/** 改写配置文件的 plugin 数组（仅替换该段，保留文件其余内容与格式） */
function writeModeToConfig(configFile: string, mode: LaunchMode): boolean {
  try {
    let raw = fs.readFileSync(configFile, "utf8")
    const pluginJson = mode === "omos" ? `["${OMOS_PLUGIN}"]` : "[]"
    if (/"plugin"\s*:/.test(raw)) {
      raw = raw.replace(/"plugin"\s*:\s*\[[^\]]*\]/, `"plugin": ${pluginJson}`)
    } else {
      raw = raw.replace(/\{\s*/, `{ "plugin": ${pluginJson}, `)
    }
    fs.writeFileSync(configFile, raw, "utf8")
    return true
  } catch (e) {
    void vscode.window.showErrorMessage(`写入 opencode 配置失败：${String(e)}`)
    return false
  }
}

function readStoredMode(context: vscode.ExtensionContext): LaunchMode {
  return context.globalState.get<LaunchMode>(STORAGE_KEY, "pomos")
}

export function activate(context: vscode.ExtensionContext): void {
  const configFile = resolveConfigFile()
  if (!configFile) {
    void vscode.window.showWarningMessage(
      "未找到 opencode 配置文件，请在设置 opencodeModeSwitcher.configFile 中指定路径。",
    )
  }

  // 以配置文件中的真实状态为准（而非独立记忆），保证状态栏与实际启动行为一致
  let mode: LaunchMode = configFile ? readModeFromConfig(configFile) : readStoredMode(context)

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.command = TOGGLE_COMMAND
  const render = (): void => {
    // 用静态图标（$(sync~spin) 会持续旋转，观感像"一直在同步"）
    statusBar.text = mode === "omos" ? "$(rocket) omos" : "$(circle-slash) pomos"
    statusBar.tooltip =
      mode === "omos"
        ? "OpenCode 将加载 oh-my-opencode-slim 插件（点击切换为原生）"
        : "OpenCode 将以原生纯净模式启动（点击切换为 omos）"
    statusBar.show()
  }
  render()

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand(TOGGLE_COMMAND, async () => {
      const next: LaunchMode = mode === "omos" ? "pomos" : "omos"
      if (configFile && !writeModeToConfig(configFile, next)) return
      mode = next
      await context.globalState.update(STORAGE_KEY, mode)
      render()
      const label = next === "omos" ? "omos（加载 oh-my-opencode-slim）" : "pomos（原生纯净）"
      void vscode.window.showInformationMessage(`OpenCode 已切换到：${label}。下次启动 opencode 生效。`)
    }),
    vscode.commands.registerCommand(LAUNCH_COMMAND, () => {
      launch()
    }),
  )
}

/** 启动 opencode。配置已写入文件，任何入口（含旧插件侧边栏）都会按当前模式加载 */
function launch(): void {
  const terminal = vscode.window.createTerminal({
    name: "opencode",
    location: { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
  })
  terminal.show()
  terminal.sendText("opencode")
}

export function deactivate(): void {}

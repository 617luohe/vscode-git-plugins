import * as vscode from "vscode"
import * as fs from "fs"
import {
  getOmosPluginEntry,
  getOmosPluginFile,
  readModeFromContent,
  updateModeInContent,
  type LaunchMode,
} from "./modeConfig"

export type { LaunchMode } from "./modeConfig"

const STORAGE_KEY = "opencodeTools.launchMode"
const TOGGLE_COMMAND = "opencode-tools.toggleMode"

/** 读取配置文件里的 plugin 数组，判断当前是否为 omos */
export function readModeFromConfig(configFile: string): LaunchMode {
  try {
    const raw = fs.readFileSync(configFile, "utf8")
    return readModeFromContent(raw)
  } catch {
    return "pomos"
  }
}

/** 改写配置文件的 plugin 数组（仅替换该段，保留文件其余内容与格式） */
export function writeModeToConfig(configFile: string, mode: LaunchMode): boolean {
  try {
    const pluginFile = getOmosPluginFile(configFile)
    if (mode === "omos" && !fs.existsSync(pluginFile)) {
      throw new Error(`未找到 omos 插件：${pluginFile}`)
    }
    const raw = fs.readFileSync(configFile, "utf8")
    const updated = updateModeInContent(raw, mode, getOmosPluginEntry(configFile))
    fs.writeFileSync(configFile, updated, "utf8")
    return true
  } catch (e) {
    void vscode.window.showErrorMessage(`写入 opencode 配置失败：${String(e)}`)
    return false
  }
}

/**
 * 注册 omos/pomos 模式切换状态栏。
 * 仅当主配置文件可定位时才展示（无配置文件时 opencode 模式切换无意义）。
 */
export function registerModeSwitcher(
  context: vscode.ExtensionContext,
  configFile: string | undefined,
  prio: number,
): void {
  // 以配置文件中的真实状态为准（而非独立记忆），保证状态栏与实际启动行为一致
  let mode: LaunchMode = configFile ? readModeFromConfig(configFile) : readFromStore(context)

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, prio)
  statusBar.command = TOGGLE_COMMAND
  const render = (): void => {
    // 用静态图标（$(sync~spin) 会持续旋转，观感像"一直在同步"）
    statusBar.text = mode === "omos" ? "$(rocket) omos" : "$(circle-slash) pomos"
    statusBar.tooltip =
      mode === "omos"
        ? "OpenCode 将加载 omos 编排插件（点击切换为原生）"
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
      const label = next === "omos" ? "omos（加载 omos 编排插件）" : "pomos（原生纯净）"
      void vscode.window.showInformationMessage(`OpenCode 已切换到：${label}。下次启动 opencode 生效。`)
    }),
  )
}

function readFromStore(context: vscode.ExtensionContext): LaunchMode {
  return context.globalState.get<LaunchMode>(STORAGE_KEY, "pomos")
}

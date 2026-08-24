import * as vscode from "vscode"
import * as fs from "fs"

export type LaunchMode = "omos" | "pomos"

/** oh-my-opencode-slim 插件名（opencode 把 plugin 数组合并而非替换，故 pomos 需从配置中移除该条目） */
const OMOS_PLUGIN = "oh-my-opencode-slim@2.2.15"
const STORAGE_KEY = "opencodeTools.launchMode"
const TOGGLE_COMMAND = "opencode-tools.toggleMode"

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
  )
}

function readFromStore(context: vscode.ExtensionContext): LaunchMode {
  return context.globalState.get<LaunchMode>(STORAGE_KEY, "pomos")
}

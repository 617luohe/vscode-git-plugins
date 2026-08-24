import * as vscode from "vscode"
import { resolveConfigFile } from "./opencodeConfig"
import { registerModeSwitcher } from "./modeSwitcher"
import { registerProfileSwitcher } from "./profileSwitcher"
import { registerSidebar } from "./sidebar/launch"

const LAUNCH_COMMAND = "opencode-tools.launch"

export function activate(context: vscode.ExtensionContext): void {
  // 共享的 OpenCode 主配置文件定位（失败则后续功能各自降级提示）
  let configFile: string | undefined
  try {
    configFile = resolveConfigFile()
  } catch {
    configFile = undefined
  }

  // 1) 活动栏快捷启动：点击图标直接打开 opencode（无子项）
  registerSidebar(context)

  // 2) 整套配置切换状态栏（纯 DeepSeek / 纯 Max JOJO / 混合）
  registerProfileSwitcher(context, configFile, 100)

  // 3) omos/pomos 模式切换状态栏
  registerModeSwitcher(context, configFile, 101)

  // 共享启动命令：用当前已写入的配置启动 opencode
  context.subscriptions.push(
    vscode.commands.registerCommand(LAUNCH_COMMAND, () => {
      const terminal = vscode.window.createTerminal({
        name: "opencode",
        location: { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      })
      terminal.show()
      terminal.sendText("opencode")
    }),
  )
}

export function deactivate(): void {}

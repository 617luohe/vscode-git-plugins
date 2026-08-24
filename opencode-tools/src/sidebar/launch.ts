import * as vscode from "vscode"
import { LaunchController, type ControllerHost } from "./controller"
import { SidebarProvider } from "./provider"

/**
 * 组装活动栏快速启动：点击活动栏图标（侧边栏可见）即自动检测并启动
 * opencode 的 opencode.openNewTerminal 命令。侧边栏不再渲染任何子项。
 */
export function registerSidebar(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("opencode-tools.installOpenCode", async () => {
      await vscode.env.openExternal(vscode.Uri.parse("vscode:extension/sst-dev.opencode"))
    }),
  )

  const treeView = vscode.window.createTreeView("opencode-tools.launch", {
    treeDataProvider: new SidebarProvider(),
  })
  const host: ControllerHost = {
    treeView: {
      visible: treeView.visible,
      onDidChangeVisibility: (listener) =>
        treeView.onDidChangeVisibility((event) => listener(event.visible)),
    },
    getExtension: () => {
      const extension = vscode.extensions.getExtension("sst-dev.opencode")
      return extension === undefined
        ? undefined
        : { isActive: extension.isActive, activate: async () => { await extension.activate() } }
    },
    getCommands: async () => vscode.commands.getCommands(true),
    executeCommand: async (command) => { await vscode.commands.executeCommand(command) },
    showInformationMessage: async (message, action) => vscode.window.showInformationMessage(message, action),
    showErrorMessage: async (message) => vscode.window.showErrorMessage(message),
    localize: (message) => vscode.l10n.t(message),
  }
  const controller = new LaunchController(host)
  context.subscriptions.push(treeView, controller.visibilitySubscription)
}

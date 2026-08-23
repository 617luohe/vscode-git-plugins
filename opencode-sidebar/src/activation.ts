import * as vscode from "vscode"
import { LaunchController, type ControllerHost, type Extension } from "./controller"
import { SidebarProvider } from "./provider"

type ActivationApi = {
  readonly createTreeView: () => ControllerHost["treeView"]
  readonly getExtension: () => Extension | undefined
  readonly getCommands: () => Promise<readonly string[]>
  readonly executeCommand: (command: string) => Promise<void>
  readonly showInformationMessage: ControllerHost["showInformationMessage"]
  readonly showErrorMessage: ControllerHost["showErrorMessage"]
  readonly localize: ControllerHost["localize"]
}

export const activateExtension = (api: ActivationApi): LaunchController => new LaunchController({
  treeView: api.createTreeView(),
  getExtension: api.getExtension,
  getCommands: api.getCommands,
  executeCommand: api.executeCommand,
  showInformationMessage: api.showInformationMessage,
  showErrorMessage: api.showErrorMessage,
  localize: api.localize,
})

export const activate = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(vscode.commands.registerCommand("opencode-sidebar.installOpenCode", async () => {
    await vscode.env.openExternal(vscode.Uri.parse("vscode:extension/sst-dev.opencode"))
  }))
  const treeView = vscode.window.createTreeView("opencode-sidebar.launch", { treeDataProvider: new SidebarProvider() })
  const controller = activateExtension({
    createTreeView: () => ({
      visible: treeView.visible,
      onDidChangeVisibility: (listener) => treeView.onDidChangeVisibility((event) => listener(event.visible)),
    }),
    getExtension: () => {
      const extension = vscode.extensions.getExtension("sst-dev.opencode")
      return extension === undefined ? undefined : { isActive: extension.isActive, activate: async () => { await extension.activate() } }
    },
    getCommands: async () => vscode.commands.getCommands(true),
    executeCommand: async (command) => { await vscode.commands.executeCommand(command) },
     showInformationMessage: async (message, action) => vscode.window.showInformationMessage(message, action),
     showErrorMessage: async (message) => vscode.window.showErrorMessage(message),
     localize: (message) => vscode.l10n.t(message),
   })
  context.subscriptions.push(treeView, controller.visibilitySubscription)
}

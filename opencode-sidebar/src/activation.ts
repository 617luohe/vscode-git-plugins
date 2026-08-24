import * as vscode from "vscode"
import { LaunchController, type ControllerHost, type Extension, type LaunchMode } from "./controller"
import { SidebarProvider } from "./provider"

const STORAGE_KEY = "opencodeSidebar.launchMode"
const TOGGLE_COMMAND = "opencode-sidebar.toggleMode"

function readStoredMode(context: vscode.ExtensionContext): LaunchMode {
  const stored = context.globalState.get<string>(STORAGE_KEY, "pomos")
  return stored === "omos" ? "omos" : "pomos"
}

/**
 * 构造宿主能力。将 VSCode 侧的真正 API 注入 LaunchController，
 * 使 controller 保持纯逻辑、可单测。
 */
function buildControllerHost(
  createTreeView: ActivationApi["createTreeView"],
  getExtension: ActivationApi["getExtension"],
  getCommands: ActivationApi["getCommands"],
  executeCommand: ActivationApi["executeCommand"],
  appendPrompt: ActivationApi["appendPrompt"],
  baseEnv: ActivationApi["baseEnv"],
  createTerminal: ActivationApi["createTerminal"],
  getActiveEditorReference: ActivationApi["getActiveEditorReference"],
  waitForReady: ActivationApi["waitForReady"],
): ControllerHost {
  return {
    treeView: createTreeView(),
    getExtension,
    getCommands,
    executeCommand,
    showInformationMessage: async (message, action) => vscode.window.showInformationMessage(message, action),
    showErrorMessage: async (message) => vscode.window.showErrorMessage(message),
    localize: (message) => vscode.l10n.t(message),
    createTerminal: (options) =>
      createTerminal({
        name: options.name,
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: options.preserveFocus,
        env: { ...baseEnv, ...options.env },
      }),
    getActiveEditorReference,
    appendPrompt,
    waitForReady,
  }
}

type ActivationApi = {
  readonly createTreeView: () => ControllerHost["treeView"]
  readonly getExtension: () => Extension | undefined
  readonly getCommands: () => Promise<readonly string[]>
  readonly executeCommand: (command: string) => Promise<void>
  readonly appendPrompt: ControllerHost["appendPrompt"]
  readonly showInformationMessage: ControllerHost["showInformationMessage"]
  readonly showErrorMessage: ControllerHost["showErrorMessage"]
  readonly localize: ControllerHost["localize"]
  readonly baseEnv: Record<string, string>
  readonly createTerminal: (
    options: {
      name: string
      env: Record<string, string>
      viewColumn: vscode.ViewColumn
      preserveFocus: boolean
    },
  ) => { readonly show: () => void; readonly sendText: (text: string) => void }
  readonly getActiveEditorReference: () => string | undefined
  readonly waitForReady: (port: number, attempts: number, intervalMs: number) => Promise<boolean>
}

export const activateExtension = (api: ActivationApi, context: vscode.ExtensionContext): LaunchController => {
  const initialMode = readStoredMode(context)
  const controller = new LaunchController(
    buildControllerHost(
      api.createTreeView,
      api.getExtension,
      api.getCommands,
      api.executeCommand,
      api.appendPrompt,
      api.baseEnv,
      api.createTerminal,
      api.getActiveEditorReference,
      api.waitForReady,
    ),
    initialMode,
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(TOGGLE_COMMAND, async () => {
      const next: LaunchMode = controller.getMode() === "omos" ? "pomos" : "omos"
      const applied = controller.setMode(next)
      await context.globalState.update(STORAGE_KEY, applied)
      const label = applied === "omos" ? "omos (带着 oh-my-opencode-slim)" : "pomos (原生纯净)"
      await vscode.window.showInformationMessage(`OpenCode 已切换到：${label}。下次启动 opencode 时生效。`)
    }),
  )

  context.subscriptions.push(controller.visibilitySubscription)
  return controller
}

export const activate = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(vscode.commands.registerCommand("opencode-sidebar.installOpenCode", async () => {
    await vscode.env.openExternal(vscode.Uri.parse("vscode:extension/sst-dev.opencode"))
  }))
  const treeView = vscode.window.createTreeView("opencode-sidebar.launch", { treeDataProvider: new SidebarProvider() })
  activateExtension({
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
    appendPrompt: async (port, text) => {
      await fetch(`http://localhost:${port}/tui/append-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
    },
    showInformationMessage: async (message, action) => vscode.window.showInformationMessage(message, action),
    showErrorMessage: async (message) => vscode.window.showErrorMessage(message),
    localize: (message) => vscode.l10n.t(message),
    baseEnv: {},
    createTerminal: (options) => {
      const terminal = vscode.window.createTerminal({
        name: options.name,
        location: { viewColumn: options.viewColumn, preserveFocus: options.preserveFocus },
        env: options.env,
      })
      return { show: () => terminal.show(), sendText: (text) => terminal.sendText(text) }
    },
    getActiveEditorReference: () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return undefined
      const doc = editor.document
      const folder = vscode.workspace.getWorkspaceFolder(doc.uri)
      if (!folder) return undefined
      let ref = `@${vscode.workspace.asRelativePath(doc.uri)}`
      const selection = editor.selection
      if (!selection.isEmpty) {
        const start = selection.start.line + 1
        const end = selection.end.line + 1
        ref += start === end ? `#L${start}` : `#L${start}-${end}`
      }
      return ref
    },
    waitForReady: async (port, attempts, intervalMs) => {
      let ok = false
      for (let i = 0; i < attempts; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
        try {
          await fetch(`http://localhost:${port}/app`)
          ok = true
          break
        } catch {
          // 重试
        }
      }
      return ok
    },
  }, context)
}

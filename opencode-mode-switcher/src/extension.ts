import * as vscode from "vscode"

export type LaunchMode = "omos" | "pomos"

/** oh-my-opencode-slim 插件，opencode 把 plugin 数组合并而非替换，需在 pomos 默认时"追加"注入 */
const OMOS_PLUGIN = "oh-my-opencode-slim@2.2.15"
const OMOS_ENV = JSON.stringify({ plugin: [OMOS_PLUGIN] })

const STORAGE_KEY = "opencodeModeSwitcher.launchMode"
const TERMINAL_NAME = "opencode"
const PORT_MIN = 16384
const PORT_RANGE = 49152
const READY_ATTEMPTS = 10
const READY_INTERVAL_MS = 200

const TOGGLE_COMMAND = "opencode-mode-switcher.toggle"
const LAUNCH_COMMAND = "opencode-mode-switcher.launch"

function readStoredMode(context: vscode.ExtensionContext): LaunchMode {
  return context.globalState.get<LaunchMode>(STORAGE_KEY, "pomos")
}

export function activate(context: vscode.ExtensionContext): void {
  let mode: LaunchMode = readStoredMode(context)

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.command = TOGGLE_COMMAND
  const render = (): void => {
    statusBar.text = mode === "omos" ? "$(sync~spin) omos" : "$(circle-slash) pomos"
    statusBar.tooltip =
      mode === "omos"
        ? "OpenCode 将加载 oh-my-opencode-slim 插件"
        : "OpenCode 将以原生纯净模式启动"
    statusBar.show()
  }
  render()

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand(TOGGLE_COMMAND, async () => {
      mode = mode === "omos" ? "pomos" : "omos"
      await context.globalState.update(STORAGE_KEY, mode)
      render()
      const label = mode === "omos" ? "omos（加载 oh-my-opencode-slim）" : "pomos（原生纯净）"
      void vscode.window.showInformationMessage(`OpenCode 已切换到：${label}。下次启动生效。`)
    }),
    vscode.commands.registerCommand(LAUNCH_COMMAND, () => {
      launch(context, mode)
    }),
  )
}

function launch(context: vscode.ExtensionContext, mode: LaunchMode): void {
  const env: Record<string, string> = { OPENCODE_CALLER: "vscode" }
  if (mode === "omos") env.OPENCODE_CONFIG_CONTENT = OMOS_ENV

  const port = Math.floor(Math.random() * PORT_RANGE) + PORT_MIN
  const terminal = vscode.window.createTerminal({
    name: TERMINAL_NAME,
    location: { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
    env: { ...env, _EXTENSION_OPENCODE_PORT: port.toString() },
  })
  terminal.show()
  terminal.sendText(`opencode --port ${port}`)

  const reference = activeEditorReference()
  if (!reference) return

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  waitForReady(port, READY_ATTEMPTS, READY_INTERVAL_MS).then((ready) => {
    if (ready) {
      void appendPrompt(port, `In ${reference}`).catch(() => undefined)
      terminal.show()
    }
  })
}

function activeEditorReference(): string | undefined {
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
}

async function appendPrompt(port: number, text: string): Promise<void> {
  await fetch(`http://localhost:${port}/tui/append-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
}

async function waitForReady(port: number, attempts: number, intervalMs: number): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    try {
      await fetch(`http://localhost:${port}/app`)
      return true
    } catch {
      // 重试
    }
  }
  return false
}

export function deactivate(): void {}

export type Extension = { readonly isActive: boolean; readonly activate: () => Promise<void> }

export type LaunchMode = "omos" | "pomos"

export type TerminalEnv = Record<string, string>

export type ControllerHost = {
  readonly treeView: { readonly visible: boolean; readonly onDidChangeVisibility: (listener: (event: boolean) => void) => { dispose: () => void } }
  readonly getExtension: () => Extension | undefined
  readonly executeCommand: (command: string) => Promise<void>
  readonly showInformationMessage: (message: string, action: string) => Promise<string | undefined>
  readonly showErrorMessage: (message: string) => Promise<string | undefined>
  readonly getCommands: () => Promise<readonly string[]>
  readonly localize: (message: string) => string
  // 新增：自托管终端启动所需的宿主能力
  readonly createTerminal: (options: {
    name: string
    env: TerminalEnv
    viewColumn: unknown
    preserveFocus: boolean
  }) => { readonly show: () => void; readonly sendText: (text: string) => void }
  readonly getActiveEditorReference: () => string | undefined
  readonly appendPrompt: (port: number, text: string) => Promise<void>
  readonly waitForReady: (port: number, attempts: number, intervalMs: number) => Promise<boolean>
}

const INSTALL_URI = "vscode:extension/sst-dev.opencode"
const INSTALL_COMMAND = "opencode-sidebar.installOpenCode"

const TERMINAL_NAME = "opencode"
const PORT_MIN = 16384
const PORT_RANGE = 49152 // Math.random()*49152 + 16384 => [16384, 65535]
const READY_ATTEMPTS = 10
const READY_INTERVAL_MS = 200

/**
 * OPENCODE_CONFIG_CONTENT 只支持"追加 plugins"（opencode 把 plugin 数组合并而非替换）。
 * 因此全局配置保持原生（plugin:[]），omos 模式通过该环境变量"额外添加"插件。
 */
export const OMOS_PLUGIN = "oh-my-opencode-slim@2.2.15"

export function terminalEnvForMode(mode: LaunchMode): TerminalEnv {
  const env: TerminalEnv = { OPENCODE_CALLER: "vscode" }
  if (mode === "omos") env["OPENCODE_CONFIG_CONTENT"] = JSON.stringify({ plugin: [OMOS_PLUGIN] })
  return env
}

export class LaunchController {
  private cycleConsumed = false
  private inFlight = false
  private mode: LaunchMode
  public readonly visibilitySubscription: { dispose: () => void }
  private readonly modeListeners = new Set<(mode: LaunchMode) => void>()

  public constructor(
    private readonly host: ControllerHost,
    initialMode: LaunchMode = "pomos",
  ) {
    this.mode = initialMode
    this.visibilitySubscription = this.host.treeView.onDidChangeVisibility((visible) => {
      if (!visible) {
        this.cycleConsumed = false
        return
      }
      void this.launchIfNeeded().catch(async (error: unknown) => {
        if (error instanceof Error) await this.host.showErrorMessage(error.message)
        else await this.host.showErrorMessage(this.host.localize("OpenCode could not be launched."))
        this.cycleConsumed = false
      })
    })
    if (this.host.treeView.visible) {
      void this.launchIfNeeded().catch(async (error: unknown) => {
        if (error instanceof Error) await this.host.showErrorMessage(error.message)
        else await this.host.showErrorMessage(this.host.localize("OpenCode could not be launched."))
        this.cycleConsumed = false
      })
    }
  }

  public getMode(): LaunchMode {
    return this.mode
  }

  public setMode(mode: LaunchMode): LaunchMode {
    if (this.mode === mode) return this.mode
    this.mode = mode
    for (const listener of this.modeListeners) {
      try {
        listener(mode)
      } catch {
        // 监听器异常不阻断切换
      }
    }
    return this.mode
  }

  public onDidChangeMode(listener: (mode: LaunchMode) => void): { dispose: () => void } {
    this.modeListeners.add(listener)
    return {
      dispose: () => {
        this.modeListeners.delete(listener)
      },
    }
  }

  private async launchIfNeeded(): Promise<void> {
    if (this.cycleConsumed || this.inFlight) return
    this.cycleConsumed = true
    this.inFlight = true
    try {
      const extension = this.host.getExtension()
      if (extension === undefined) {
        await this.offerInstall()
        return
      }
      if (!extension.isActive) await extension.activate()
      const commands = await this.host.getCommands()
      if (!commands.includes("opencode.openNewTerminal")) {
        await this.offerInstall()
        return
      }
      await this.openTerminal()
    } finally {
      this.inFlight = false
    }
  }

  /** 复刻官方 sst-dev.opencode 的 openTerminal()：自托管终端以注入插件环境变量 */
  private async openTerminal(): Promise<void> {
    const port = Math.floor(Math.random() * PORT_RANGE) + PORT_MIN
    const env = terminalEnvForMode(this.mode)
    const terminal = this.host.createTerminal({
      name: TERMINAL_NAME,
      env: { ...env, _EXTENSION_OPENCODE_PORT: port.toString() },
      viewColumn: "beside",
      preserveFocus: false,
    })
    terminal.sendText(`opencode --port ${port}`)
    terminal.show()

    const reference = this.host.getActiveEditorReference()
    if (reference === undefined) return
    const ready = await this.host.waitForReady(port, READY_ATTEMPTS, READY_INTERVAL_MS)
    if (ready) {
      await this.host.appendPrompt(port, `In ${reference}`)
      terminal.show()
    }
  }

  private async offerInstall(): Promise<void> {
    const action = this.host.localize("Install OpenCode")
    const choice = await this.host.showInformationMessage(this.host.localize("OpenCode is not installed."), action)
    if (choice === action) await this.host.executeCommand(INSTALL_COMMAND)
  }
}

export { INSTALL_COMMAND, INSTALL_URI }

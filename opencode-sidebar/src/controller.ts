export type Extension = { readonly isActive: boolean; readonly activate: () => Promise<void> }

export type ControllerHost = {
  readonly treeView: { readonly visible: boolean; readonly onDidChangeVisibility: (listener: (event: boolean) => void) => { dispose: () => void } }
  readonly getExtension: () => Extension | undefined
  readonly executeCommand: (command: string) => Promise<void>
  readonly showInformationMessage: (message: string, action: string) => Promise<string | undefined>
  readonly showErrorMessage: (message: string) => Promise<string | undefined>
  readonly getCommands: () => Promise<readonly string[]>
  readonly localize: (message: string) => string
}

const OPEN_COMMAND = "opencode.openNewTerminal"
const INSTALL_URI = "vscode:extension/sst-dev.opencode"
const INSTALL_COMMAND = "opencode-sidebar.installOpenCode"

export class LaunchController {
  private cycleConsumed = false
  private inFlight = false
  public readonly visibilitySubscription: { dispose: () => void }

  public constructor(private readonly host: ControllerHost) {
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
      if (!commands.includes(OPEN_COMMAND)) {
        await this.offerInstall()
        return
      }
      await this.host.executeCommand(OPEN_COMMAND)
    } finally {
      this.inFlight = false
    }
  }

  private async offerInstall(): Promise<void> {
    const action = this.host.localize("Install OpenCode")
    const choice = await this.host.showInformationMessage(this.host.localize("OpenCode is not installed."), action)
    if (choice === action) await this.host.executeCommand(INSTALL_COMMAND)
  }
}

export { INSTALL_COMMAND, INSTALL_URI, OPEN_COMMAND }

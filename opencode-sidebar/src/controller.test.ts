import { describe, expect, it, vi } from "vitest"
import { INSTALL_COMMAND, INSTALL_URI, OPEN_COMMAND, LaunchController, type Extension } from "./controller"

type VisibilityListener = (visible: boolean) => void

const flush = async (): Promise<void> => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const createFixture = (visible = false) => {
  let listener: VisibilityListener | undefined
  let extension: Extension | undefined = { isActive: true, activate: async () => undefined }
  const executeCommand = vi.fn(async (): Promise<void> => undefined)
  const closeSidebar = vi.fn(async (): Promise<void> => undefined)
  const showInformationMessage = vi.fn(async (): Promise<string | undefined> => "Install OpenCode")
  const fixture = {
    treeView: {
      visible,
      onDidChangeVisibility: (callback: VisibilityListener) => {
        listener = callback
        return { dispose: vi.fn() }
      },
    },
    getExtension: () => extension,
    executeCommand,
    closeSidebar,
    showInformationMessage,
    showErrorMessage: vi.fn(async () => undefined),
    getCommands: vi.fn(async () => [OPEN_COMMAND]),
    localize: (message: string) => message,
  }
  return {
    fixture,
    reveal: (next: boolean) => listener?.(next),
    setExtension: (next: Extension | undefined): void => { extension = next },
  }
}

describe("LaunchController", () => {
  it("does not launch for a hidden event", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    const controller = new LaunchController(fixture)
    reveal(false)
    await flush()
    expect(fixture.executeCommand).not.toHaveBeenCalled()
  })

  it("launches once for an initially visible view", async () => {
    const { fixture } = createFixture(true)
    new LaunchController(fixture)
    await flush()
    expect(fixture.executeCommand).toHaveBeenCalledWith(OPEN_COMMAND)
    expect(fixture.closeSidebar).toHaveBeenCalledOnce()
  })

  it("suppresses concurrent duplicate launches and rearms after hidden", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    let resolveCommand: (() => void) | undefined
    fixture.executeCommand.mockImplementation(
      () => new Promise<void>((resolve) => { resolveCommand = resolve }),
    )
    const controller = new LaunchController(fixture)
    reveal(true)
    reveal(true)
    await flush()
    expect(fixture.executeCommand).toHaveBeenCalledOnce()
    resolveCommand?.()
    await flush()
    reveal(false)
    reveal(true)
    await flush()
    expect(fixture.executeCommand).toHaveBeenCalledTimes(2)
    void controller
  })

  it("offers installation when OpenCode is absent", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    setExtension(undefined)
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(fixture.showInformationMessage).toHaveBeenCalled()
    expect(fixture.executeCommand).toHaveBeenCalledWith(INSTALL_COMMAND)
    expect(fixture.closeSidebar).toHaveBeenCalledOnce()
  })

  it("offers installation when the official command is unregistered", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    setExtension({ isActive: true, activate: async () => undefined })
    fixture.getCommands.mockResolvedValue([])
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(fixture.showInformationMessage).toHaveBeenCalled()
    expect(fixture.executeCommand).toHaveBeenCalledWith(INSTALL_COMMAND)
  })

  it("does not install when the action is not selected", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    setExtension(undefined)
    fixture.showInformationMessage.mockResolvedValue(undefined)
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(fixture.executeCommand).not.toHaveBeenCalled()
  })

  it("activates an inactive official extension before launching", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    const activate = vi.fn(async () => undefined)
    setExtension({ isActive: false, activate })
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(activate).toHaveBeenCalledOnce()
    expect(fixture.executeCommand).toHaveBeenCalledWith(OPEN_COMMAND)
  })

  it("uses the fixed installation URI through the registered command contract", () => {
    expect(INSTALL_URI).toBe("vscode:extension/sst-dev.opencode")
  })
})

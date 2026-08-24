import { describe, expect, it, vi } from "vitest"
import {
  INSTALL_COMMAND,
  INSTALL_URI,
  LaunchController,
  OMOS_PLUGIN,
  terminalEnvForMode,
  type ControllerHost,
  type Extension,
  type TerminalEnv,
} from "./controller"

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
  let activeEditorReference: string | undefined
  const executeCommand = vi.fn(async (): Promise<void> => undefined)
  const showInformationMessage = vi.fn(async (): Promise<string | undefined> => "Install OpenCode")
  const createTerminal = vi.fn<ControllerHost["createTerminal"]>(() => ({ show: vi.fn(), sendText: vi.fn() }))
  const appendPrompt = vi.fn(async (): Promise<void> => undefined)
  const waitForReady = vi.fn(async (): Promise<boolean> => true)
  const getCommands = vi.fn(async (): Promise<readonly string[]> => ["opencode.openNewTerminal"])

  const host: ControllerHost = {
    treeView: {
      visible,
      onDidChangeVisibility: (callback: VisibilityListener) => {
        listener = callback
        return { dispose: vi.fn() }
      },
    },
    getExtension: () => extension,
    executeCommand,
    showInformationMessage,
    showErrorMessage: vi.fn(async () => undefined),
    getCommands,
    localize: (message: string) => message,
    createTerminal,
    getActiveEditorReference: () => activeEditorReference,
    appendPrompt,
    waitForReady,
  }
  return {
    fixture: host,
    reveal: (next: boolean) => listener?.(next),
    setExtension: (next: Extension | undefined): void => { extension = next },
    setActiveEditorReference: (next: string | undefined): void => { activeEditorReference = next },
    createTerminal,
    appendPrompt,
    waitForReady,
    showInformationMessage,
    getCommands,
  }
}

describe("terminalEnvForMode", () => {
  it("injects OPENCODE_CONFIG_CONTENT only in omos mode", () => {
    const omos: TerminalEnv = terminalEnvForMode("omos")
    expect(omos["OPENCODE_CONFIG_CONTENT"]).toBe(JSON.stringify({ plugin: [OMOS_PLUGIN] }))
  })
  it("keeps pomos free of plugin injection", () => {
    const pomos = terminalEnvForMode("pomos")
    expect(pomos["OPENCODE_CONFIG_CONTENT"]).toBeUndefined()
  })
})

describe("LaunchController", () => {
  it("does not launch for a hidden event", async () => {
    const { fixture, reveal } = createFixture()
    const controller = new LaunchController(fixture)
    reveal(false)
    await flush()
    expect(fixture.createTerminal).not.toHaveBeenCalled()
    void controller
  })

  it("launches a terminal for an initially visible view", async () => {
    const { fixture, createTerminal } = createFixture(true)
    new LaunchController(fixture)
    await flush()
    expect(createTerminal).toHaveBeenCalledOnce()
  })

  it("suppresses concurrent duplicate launches and rearms after hidden", async () => {
    const { fixture, reveal, createTerminal, waitForReady, setActiveEditorReference } = createFixture()
    let pendingReady: ((ok: boolean) => void) | undefined
    waitForReady.mockImplementation(() => new Promise<boolean>((resolve) => { pendingReady = resolve }))
    setActiveEditorReference("@file.ts")
    const controller = new LaunchController(fixture)
    reveal(true)
    reveal(true)
    await flush()
    // 第一次启动停在 waitForReady 挂起，第二次 reveal 被 inflight 抑制
    expect(createTerminal).toHaveBeenCalledOnce()
    pendingReady?.(true)
    await flush()
    reveal(false)
    reveal(true)
    await flush()
    expect(createTerminal).toHaveBeenCalledTimes(2)
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
  })

  it("offers installation when the official command is unregistered", async () => {
    const { fixture, reveal, setExtension } = createFixture()
    setExtension({ isActive: true, activate: async () => undefined })
    ;(fixture.getCommands as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([])
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(fixture.showInformationMessage).toHaveBeenCalled()
    expect(fixture.executeCommand).toHaveBeenCalledWith(INSTALL_COMMAND)
  })

  it("does not install when the action is not selected", async () => {
    const { fixture, reveal, setExtension, showInformationMessage } = createFixture()
    setExtension(undefined)
    showInformationMessage.mockResolvedValue(undefined)
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(fixture.executeCommand).not.toHaveBeenCalled()
  })

  it("activates an inactive official extension before launching", async () => {
    const { fixture, reveal, setExtension, createTerminal } = createFixture()
    const activate = vi.fn(async () => undefined)
    setExtension({ isActive: false, activate })
    new LaunchController(fixture)
    reveal(true)
    await flush()
    expect(activate).toHaveBeenCalledOnce()
    expect(createTerminal).toHaveBeenCalled()
  })

  it("uses the fixed installation URI through the registered command contract", () => {
    expect(INSTALL_URI).toBe("vscode:extension/sst-dev.opencode")
  })

  describe("mode switching with hot state notification", () => {
    it("defaults to pomos and accepts omos", () => {
      const { fixture } = createFixture()
      const controller = new LaunchController(fixture)
      expect(controller.getMode()).toBe("pomos")
      expect(controller.setMode("omos")).toBe("omos")
      expect(controller.getMode()).toBe("omos")
    })

    it("respects a provided initial mode", () => {
      const { fixture } = createFixture()
      const controller = new LaunchController(fixture, "omos")
      expect(controller.getMode()).toBe("omos")
    })

    it("notifies listeners on mode change", () => {
      const { fixture } = createFixture()
      const controller = new LaunchController(fixture)
      const seen: string[] = []
      controller.onDidChangeMode((m) => seen.push(m))
      controller.setMode("omos")
      controller.setMode("pomos")
      expect(seen).toEqual(["omos", "pomos"])
    })

    it("does not notify when setting the same mode", () => {
      const { fixture } = createFixture()
      const controller = new LaunchController(fixture, "pomos")
      const seen: string[] = []
      controller.onDidChangeMode((m) => seen.push(m))
      controller.setMode("pomos")
      expect(seen).toEqual([])
    })

    it("injects plugin env when launching in omos mode, not in pomos", async () => {
      const { fixture, reveal, createTerminal } = createFixture()
      const controller = new LaunchController(fixture, "omos")
      void controller
      reveal(true)
      await flush()
      const env = createTerminal.mock.calls[0]?.[0]["env"] as TerminalEnv
      expect(env["OPENCODE_CONFIG_CONTENT"]).toBe(JSON.stringify({ plugin: [OMOS_PLUGIN] }))
      expect(env["_EXTENSION_OPENCODE_PORT"]).toBeDefined()
    })

    it("injects only port in pomos mode", async () => {
      const { fixture, reveal, createTerminal } = createFixture()
      const controller = new LaunchController(fixture, "pomos")
      void controller
      reveal(true)
      await flush()
      const env = createTerminal.mock.calls[0]?.[0]["env"] as TerminalEnv
      expect(env["OPENCODE_CONFIG_CONTENT"]).toBeUndefined()
      expect(env["_EXTENSION_OPENCODE_PORT"]).toBeDefined()
    })
  })
})

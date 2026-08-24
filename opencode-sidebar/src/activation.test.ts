import { describe, expect, it, vi } from "vitest"
import { activateExtension } from "./activation"

const createContext = (stored?: object) => {
  const subscriptions: { dispose: unknown }[] = []
  const state = new Map<string, unknown>(stored ? Object.entries(stored) : [])
  return {
    subscriptions,
    globalState: {
      get: vi.fn((key: string, fallback?: unknown) => (state.has(key) ? state.get(key) : fallback)),
      update: vi.fn(async (key: string, value: unknown) => { state.set(key, value) }),
    },
  }
}

describe("activateExtension", () => {
  it("subscribes before processing an initially hidden view and does not launch", async () => {
    const onDidChangeVisibility = vi.fn(() => ({ dispose: vi.fn() }))
    const createTerminal = vi.fn(() => ({ show: vi.fn(), sendText: vi.fn() }))
    const executeCommand = vi.fn(async () => undefined)
    const controller = activateExtension({
      createTreeView: () => ({ visible: false, onDidChangeVisibility }),
      getExtension: () => undefined,
      getCommands: async () => [],
      executeCommand,
      appendPrompt: async () => undefined,
      showInformationMessage: async () => undefined,
      showErrorMessage: async () => undefined,
      localize: (message) => message,
      baseEnv: {},
      createTerminal,
      getActiveEditorReference: () => undefined,
      waitForReady: async () => true,
    }, createContext() as never)
    await Promise.resolve()
    expect(onDidChangeVisibility).toHaveBeenCalledOnce()
    expect(executeCommand).not.toHaveBeenCalled()
    expect(controller.getMode()).toBe("pomos")
  })
})

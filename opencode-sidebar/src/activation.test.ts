import { describe, expect, it, vi } from "vitest"
import { activateExtension } from "./activation"

describe("activateExtension", () => {
  it("subscribes before processing an initially hidden view and does not launch", async () => {
    const onDidChangeVisibility = vi.fn(() => ({ dispose: vi.fn() }))
    const executeCommand = vi.fn(async () => undefined)
    activateExtension({
      createTreeView: () => ({ visible: false, onDidChangeVisibility }),
      getExtension: () => undefined,
      getCommands: async () => [],
      executeCommand,
      closeSidebar: async () => undefined,
       showInformationMessage: async () => undefined,
       showErrorMessage: async () => undefined,
       localize: (message) => message,
    })
    await Promise.resolve()
    expect(onDidChangeVisibility).toHaveBeenCalledOnce()
    expect(executeCommand).not.toHaveBeenCalled()
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("manifest machine contracts", () => {
  it("declares the fixed extension, view, command, activation, and icon contracts", () => {
    const manifest: Manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
    expect(manifest.name).toBe("opencode-sidebar")
    expect(manifest.publisher).toBe("luohe")
    expect(manifest.activationEvents).toContain("onView:opencode-sidebar.launch")
    expect(manifest.contributes.commands.map((command) => command.command)).toEqual(["opencode-sidebar.installOpenCode"])
    expect(manifest.contributes.viewsContainers.activitybar[0]?.id).toBe("opencode-sidebar")
    const views = manifest.contributes.views["opencode-sidebar"]
    expect(views).toBeDefined()
    expect(views?.[0]?.id).toBe("opencode-sidebar.launch")
    expect(manifest.icon).toBe("assets/icon.png")
    expect(manifest.contributes.viewsContainers.activitybar[0]?.icon).toBe("assets/opencode-activity.svg")
  })
})

type Manifest = {
  readonly name: string
  readonly publisher: string
  readonly icon: string
  readonly activationEvents: readonly string[]
  readonly contributes: {
    readonly commands: readonly { readonly command: string }[]
    readonly viewsContainers: { readonly activitybar: readonly { readonly id: string; readonly icon: string }[] }
    readonly views: Record<string, readonly { readonly id: string }[]>
  }
}

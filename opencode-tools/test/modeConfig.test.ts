import { describe, expect, test } from "bun:test"
import {
  getOmosPluginEntry,
  readModeFromContent,
  updateModeInContent,
} from "../src/modeConfig"

describe("mode config", () => {
  test("does not report the unrelated bare npm package as omos mode", () => {
    expect(readModeFromContent('{ "plugin": ["omos"] }')).toBe("pomos")
  })

  test("recognizes the local omos plugin entry", () => {
    const content =
      '{ "plugin": ["file:///C:/Users/Administrator/.config/opencode/vendor/omos/dist/index.js"] }'
    expect(readModeFromContent(content)).toBe("omos")
  })

  test("builds the same Windows file URL from Windows and WSL config paths", () => {
    expect(getOmosPluginEntry("C:\\Users\\Administrator\\.config\\opencode\\opencode.jsonc")).toBe(
      "file:///C:/Users/Administrator/.config/opencode/vendor/omos/dist/index.js",
    )
    expect(getOmosPluginEntry("/mnt/c/Users/Administrator/.config/opencode/opencode.jsonc")).toBe(
      "file:///C:/Users/Administrator/.config/opencode/vendor/omos/dist/index.js",
    )
  })

  test("writes the local entry for omos and clears plugins for pomos", () => {
    const original = '{ "plugin": ["omos"], "$schema": "https://opencode.ai/config.json" }'
    const pluginEntry = getOmosPluginEntry(
      "C:\\Users\\Administrator\\.config\\opencode\\opencode.jsonc",
    )
    const omos = updateModeInContent(original, "omos", pluginEntry)

    expect(omos).toContain(`"plugin": ["${pluginEntry}"]`)
    expect(updateModeInContent(omos, "pomos", pluginEntry)).toContain('"plugin": []')
  })
})

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { omosTemplatePath, syncOmosConfig } from "../src/omosSync"

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "omos-sync-"))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe("omosSync", () => {
  test("omosTemplatePath points to profileDir/<name>.omos (not scanned as profile template)", () => {
    expect(omosTemplatePath("/profiles", "jojo").split("\\").join("/")).toBe(
      "/profiles/jojo.omos",
    )
  })

  test("syncs a matching <name>.omos template into configFile dir omos.json", () => {
    const profileDir = join(root, "profiles")
    const configDir = join(root, "config")
    mkdirSync(profileDir, { recursive: true })
    mkdirSync(configDir, { recursive: true })
    const template = omosTemplatePath(profileDir, "jojo")
    writeFileSync(template, '{"agents":{"researcher":{"model":"x"}}}')

    const configFile = join(configDir, "opencode.jsonc")
    const written = syncOmosConfig(configFile, profileDir, "jojo")

    expect(written).toBe(true)
    const target = join(configDir, "omos.json")
    expect(existsSync(target)).toBe(true)
    expect(readFileSync(target, "utf8")).toBe('{"agents":{"researcher":{"model":"x"}}}')
  })

  test("leaves omos.json untouched when the profile has no omos template", () => {
    const profileDir = join(root, "profiles")
    const configDir = join(root, "config")
    mkdirSync(profileDir, { recursive: true })
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, "omos.json"), '{"original":true}')

    const synced = syncOmosConfig(
      join(configDir, "opencode.jsonc"),
      profileDir,
      "go",
    )

    expect(synced).toBe(false)
    expect(readFileSync(join(configDir, "omos.json"), "utf8")).toBe('{"original":true}')
  })

  test("returns false when configFile is undefined", () => {
    expect(syncOmosConfig(undefined, join(root, "profiles"), "jojo")).toBe(false)
  })
})

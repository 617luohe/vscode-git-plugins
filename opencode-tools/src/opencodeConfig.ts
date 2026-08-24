import * as vscode from "vscode"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

/**
 * 共享的 OpenCode 环境发现逻辑。
 * 注意：插件可能运行在 Remote-WSL 的 VSCode Server（WSL 侧），而 opencode 本体配置在
 * Windows 侧 C:\Users\...\.config\opencode\opencode.jsonc，WSL 视角即 /mnt/c/Users/.../。
 * 同时兼容 WSL 本地配置与 Windows 侧运行。
 */
export const SETTINGS_SCHEME = "opencodeTools"

export function getSetting(key: string): string {
  return vscode.workspace.getConfiguration(SETTINGS_SCHEME).get<string>(key, "")
}

function defaultConfigCandidates(): string[] {
  const home = os.homedir()
  const winProfile = process.env.USERPROFILE || "C:\\Users\\Administrator"
  return [
    "/mnt/c/Users/Administrator/.config/opencode/opencode.jsonc",
    path.join(winProfile, ".config", "opencode", "opencode.jsonc"),
    path.join(home, ".config", "opencode", "opencode.jsonc"),
    path.join(home, ".config", "opencode", "opencode.json"),
  ]
}

/** 解析 OpenCode 主配置文件路径：设置 opencodeTools.configFile 优先，其次自动探测常见位置 */
export function resolveConfigFile(): string | undefined {
  const configured = getSetting("configFile")
  if (configured && fs.existsSync(configured)) return configured
  for (const c of defaultConfigCandidates()) {
    if (fs.existsSync(c)) return c
  }
  return undefined
}

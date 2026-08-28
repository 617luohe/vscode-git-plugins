import * as fs from "fs"
import * as path from "path"

/**
 * 将 profile 配套的 omos 配置随 profile 切换同步到 opencode 配置目录。
 * 纯 TS 模块（不依赖 vscode），便于单测。
 */

/** profile 配套 omos 模板路径（profileDir/<name>.omos）。用 `.omos` 后缀，避免被 profile 模板扫描把 `.json`/`.jsonc` 误认。 */
export function omosTemplatePath(profileDir: string, profileName: string): string {
  return path.join(profileDir, `${profileName}.omos`)
}

/**
 * 若 profile <name> 存在配套 omos 模板，则复制到 configFile 同目录的 omos.json；
 * 否则不触碰现有 omos.json。返回是否执行了写入。
 */
export function syncOmosConfig(
  configFile: string | undefined,
  profileDir: string,
  profileName: string,
): boolean {
  if (!configFile) return false
  const template = omosTemplatePath(profileDir, profileName)
  if (!fs.existsSync(template)) return false
  const target = path.join(path.dirname(configFile), "omos.json")
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(template, target)
  return true
}

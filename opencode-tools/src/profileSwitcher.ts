import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { getSetting } from "./opencodeConfig"
import { readModeFromConfig, writeModeToConfig } from "./modeSwitcher"
import { syncOmosConfig } from "./omosSync"

/** 一套可切换的 OpenCode 配置（模板文件） */
export interface Profile {
  /** 模板文件名（不含扩展名），用于展示与选择 */
  name: string
  /** 模板文件绝对路径 */
  filePath: string
}

const PROFILE_DIR_SETTING = "profileDir"
const GLOBAL_PREV_PATH_KEY = "opencodeTools.activeProfilePath"
const SELECT_COMMAND = "opencode-tools.selectProfile"
const PROFILE_TEMPLATE_EXTENSIONS = new Set([".jsonc", ".json"])

function templateExt(): Set<string> {
  return PROFILE_TEMPLATE_EXTENSIONS
}

/**
 * 解析模板目录路径：
 * 1. 显式设置 opencodeTools.profileDir 优先；
 * 2. 否则在 opencode 主配置文件所在目录下取 profiles 子目录；
 * 3. 目录不存在时自动创建。
 */
function resolveProfileDir(configFile: string | undefined): string | undefined {
  const explicit = getSetting(PROFILE_DIR_SETTING)
  if (explicit) {
    try {
      fs.mkdirSync(explicit, { recursive: true })
      return explicit
    } catch {
      return undefined
    }
  }
  if (!configFile) return undefined
  const auto = path.join(path.dirname(configFile), "profiles")
  try {
    fs.mkdirSync(auto, { recursive: true })
    return auto
  } catch {
    return undefined
  }
}

/** 首次使用的三份模板骨架（纯 DeepSeek / 纯 Max JOJO / 混合）。用户填好后再用。 */
interface SeedTemplate {
  fileName: string
  title: string
  render: (deepseekKey: string, jojoKey: string) => string
}

const DEEPSEEK_KEY = "sk-REPLACE_DEEPSEEK_API_KEY"
const JOJO_KEY = "sk-REPLACE_JOJO_API_KEY"

function deepseekProvider(apiKey: string): string {
  return `  "deepseek": {
    "name": "DeepSeek",
    "npm": "@ai-sdk/deepseek",
    "id": "deepseek",
    "options": {
      "apiKey": "${apiKey}"
    },
    "models": {
      "deepseek-v4-flash": {
        "name": "DeepSeek V4 Flash",
        "reasoning": true,
        "options": { "reasoningEffort": "xhigh" },
        "variants": {
          "xhigh": { "reasoningEffort": "xhigh" },
          "max": { "reasoningEffort": "max" }
        }
      },
      "deepseek-v4-pro": {
        "name": "DeepSeek V4 Pro",
        "reasoning": true,
        "options": { "reasoningEffort": "high" },
        "variants": {
          "high": { "reasoningEffort": "high" },
          "xhigh": { "reasoningEffort": "xhigh" }
        }
      }
    }
  }`
}

function jojoProvider(apiKey: string): string {
  return `  "jojo": {
    "name": "Max JOJO Code",
    "npm": "@ai-sdk/openai-compatible",
    "options": {
      "baseURL": "https://max2.jojocode.com/v1",
      "apiKey": "${apiKey}"
    },
    "models": {
      "gpt-5.6-sol": {
        "name": "GPT-5.6 Sol",
        "reasoning": true,
        "options": { "reasoningEffort": "high" },
        "variants": {
          "high": { "reasoningEffort": "high" },
          "xhigh": { "reasoningEffort": "xhigh" }
        }
      },
      "gpt-5.6-terra": {
        "name": "GPT-5.6 Terra",
        "reasoning": true,
        "options": { "reasoningEffort": "high" },
        "variants": {
          "high": { "reasoningEffort": "high" }
        }
      },
      "gpt-5.6-luna": {
        "name": "GPT-5.6 Luna",
        "reasoning": true,
        "options": { "reasoningEffort": "max" },
        "variants": {
          "max": { "reasoningEffort": "max" }
        }
      }
    }
  }`
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    fileName: "pure-deepseek.jsonc",
    title: "纯 DeepSeek",
    render: (dk, _jk) => `{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "*": "allow", "external_directory": "allow", "doom_loop": "allow" },
  "provider": {
${deepseekProvider(dk)}
  },
  "model": "deepseek/deepseek-v4-pro",
  "disabled_providers": ["opencode", "openai", "maxjojo", "jojo"]
}
`,
  },
  {
    fileName: "pure-maxjojo.jsonc",
    title: "纯 Max JOJO",
    render: (_dk, jk) => `{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "*": "allow", "external_directory": "allow", "doom_loop": "allow" },
  "provider": {
${jojoProvider(jk)}
  },
  "model": "jojo/gpt-5.6-sol",
  "agent": {
    "build": { "model": "jojo/gpt-5.6-sol", "variant": "xhigh", "options": { "reasoningEffort": "xhigh", "store": false } },
    "plan": { "model": "jojo/gpt-5.6-sol", "variant": "xhigh", "options": { "reasoningEffort": "xhigh", "store": false } }
  },
  "disabled_providers": ["opencode", "openai", "maxjojo"]
}
`,
  },
  {
    fileName: "hybrid-maxjojo-deepseek.jsonc",
    title: "混合：Max JOJO + DeepSeek",
    render: (dk, jk) => `{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "*": "allow", "external_directory": "allow", "doom_loop": "allow" },
  "provider": {
${jojoProvider(jk)},
${deepseekProvider(dk)}
  },
  "model": "jojo/gpt-5.6-sol",
  "agent": {
    "build": { "model": "jojo/gpt-5.6-sol", "variant": "xhigh", "options": { "reasoningEffort": "xhigh", "store": false } },
    "plan": { "model": "jojo/gpt-5.6-sol", "variant": "xhigh", "options": { "reasoningEffort": "xhigh", "store": false } }
  },
  "disabled_providers": ["opencode", "openai", "maxjojo"]
}
`,
  },
]

/** 扫描模板目录，返回可切换的配置列表（按文件名排序） */
function listProfiles(profileDir: string): Profile[] {
  const profiles: Profile[] = []
  for (const entry of fs.readdirSync(profileDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!templateExt().has(ext)) continue
    if (entry.name.startsWith(".")) continue
    profiles.push({ name: path.basename(entry.name, ext), filePath: path.join(profileDir, entry.name) })
  }
  profiles.sort((a, b) => a.name.localeCompare(b.name))
  return profiles
}

/** 归一化文本，用于比较配置内容（忽略行尾差异） */
function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

/**
 * 找出当前生效的配置：
 * 1. 若主配置文件内容与某模板完全一致，即为该模板；
 * 2. 否则回退到上次成功切换的模板路径（globalState）；
 * 3. 仍未命中则视为"自定义/未匹配"。
 */
function detectActiveProfile(
  profiles: Profile[],
  configFileContent: string | undefined,
  prevPath: string | undefined,
): Profile | undefined {
  const current = configFileContent !== undefined ? normalize(configFileContent) : undefined
  if (current !== undefined) {
    const hit = profiles.find((p) => {
      try {
        return normalize(fs.readFileSync(p.filePath, "utf8")) === current
      } catch {
        return false
      }
    })
    if (hit) return hit
  }
  if (prevPath) {
    const prev = profiles.find((p) => p.filePath === prevPath)
    if (prev) return prev
  }
  return undefined
}

/**
 * 确保模板目录里有可用配置；若目录为空，则写入三份骨架。
 * 返回实际写入的骨架文件名列表（目录中原有配置则返回空）。
 */
function ensureSeedProfiles(profileDir: string): string[] {
  const existing = listProfiles(profileDir)
  if (existing.length > 0) return []
  const seeded: string[] = []
  for (const t of SEED_TEMPLATES) {
    const filePath = path.join(profileDir, t.fileName)
    try {
      fs.writeFileSync(filePath, t.render(DEEPSEEK_KEY, JOJO_KEY), "utf8")
      seeded.push(t.fileName)
    } catch {
      // 单个模板写入失败不致命，继续尝试其余
    }
  }
  return seeded
}

/**
 * 注册整套配置切换状态栏（纯 DeepSeek / 纯 Max JOJO / 混合）。
 * 首次若模板目录为空会自动生成骨架。
 */
export function registerProfileSwitcher(
  context: vscode.ExtensionContext,
  configFile: string | undefined,
  prio: number,
): void {
  let profileDir: string | undefined
  let seeded: string[] = []
  try {
    profileDir = resolveProfileDir(configFile)
    if (configFile && profileDir) seeded = ensureSeedProfiles(profileDir)
  } catch (e) {
    void vscode.window.showErrorMessage(`OpenCode Tools 初始化失败：${String(e)}`)
  }

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, prio)
  statusBar.command = SELECT_COMMAND

  // 刷新状态栏显示：重新扫描模板并识别当前生效配置
  const refresh = (): Profile | undefined => {
    if (!configFile || !profileDir) {
      statusBar.text = "$(warning) opencode 未配置"
      statusBar.tooltip = "请配置 opencodeTools.profileDir / configFile"
      statusBar.show()
      return undefined
    }
    const profiles = listProfiles(profileDir)
    if (profiles.length === 0) {
      statusBar.text = "$(warning) 无配置模板"
      statusBar.tooltip = `目录 ${profileDir} 下没有 .jsonc/.json 模板`
      statusBar.show()
      return undefined
    }
    const content = fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : undefined
    const prev = context.globalState.get<string>(GLOBAL_PREV_PATH_KEY)
    const active = detectActiveProfile(profiles, content, prev)
    statusBar.text = active ? `$(verified) opencode: ${active.name}` : "$(file-text) opencode: 自定义"
    statusBar.tooltip =
      (active
        ? `当前配置：${active.name}（${active.filePath}）`
        : "当前 opencode.jsonc 与任何模板均不匹配") +
      "\n点击选择或切换 OpenCode 配置"
    statusBar.show()
    return active
  }
  refresh()

  if (seeded.length > 0) {
    void vscode.window.showInformationMessage(
      `已在 ${profileDir} 生成 ${seeded.length} 份配置模板骨架（${seeded.join("、")}）。` +
        "请打开编辑补齐各自 provider 的 apiKey 后，再点击状态栏切换。",
    )
  }

  const applyProfile = async (profile: Profile): Promise<void> => {
    if (!configFile) return
    try {
      // Profiles are full-file templates and usually omit `plugin`. Preserve
      // current omos/pomos mode across profile switches.
      const previousMode = readModeFromConfig(configFile)
      const template = fs.readFileSync(profile.filePath, "utf8")
      fs.writeFileSync(configFile, template, "utf8")
      writeModeToConfig(configFile, previousMode)
      // 若 profile 有同名配套 omos 模板（profiles/<name>.omos），随切换同步到 omos.json。
      const omosSynced =
        profileDir !== undefined && syncOmosConfig(configFile, profileDir, profile.name)
      await context.globalState.update(GLOBAL_PREV_PATH_KEY, profile.filePath)
      refresh()
      void vscode.window.showInformationMessage(
        `OpenCode 配置已切换为「${profile.name}」（已保留 ${previousMode} 模式${
          omosSynced ? "，同步 omos 配置" : "，omos 配置未变"
        }）。下次启动 opencode 生效。`,
      )
    } catch (e) {
      void vscode.window.showErrorMessage(`写入 OpenCode 配置失败：${String(e)}`)
    }
  }

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand(SELECT_COMMAND, async () => {
      if (!profileDir || !configFile) return
      const profiles = listProfiles(profileDir)
      if (profiles.length === 0) {
        void vscode.window.showWarningMessage(`模板目录 ${profileDir} 下没有可用的 .jsonc/.json 配置。`)
        return
      }
      const active = refresh()
      const picked = await vscode.window.showQuickPick(
        profiles.map((p) => ({
          label: active?.filePath === p.filePath ? `$(check) ${p.name}` : p.name,
          description: p.filePath,
          profile: p,
        })),
        { placeHolder: "选择要应用到 opencode 的配置" },
      )
      if (!picked) return
      await applyProfile(picked.profile)
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("opencodeTools")) refresh()
    }),
  )
}

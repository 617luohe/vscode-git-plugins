import * as vscode from "vscode"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

/** 一套可切换的 OpenCode 配置（模板文件） */
export interface Profile {
  /** 模板文件名（不含扩展名），用于展示与选择 */
  name: string
  /** 模板文件绝对路径 */
  filePath: string
}

const CONFIG_FILE_SETTING = "opencodeProfileSwitcher.configFile"
const PROFILE_DIR_SETTING = "opencodeProfileSwitcher.profileDir"
const GLOBAL_PREV_PATH_KEY = "opencodeProfileSwitcher.activeProfilePath"

const SELECT_COMMAND = "opencode-profile-switcher.select"
const LAUNCH_COMMAND = "opencode-profile-switcher.launch"

const PROFILE_TEMPLATE_EXTENSIONS = new Set([".jsonc", ".json"])

/**
 * OpenCode 主配置文件候选路径。
 * 插件可能运行在 Remote-WSL 的 VSCode Server（WSL 侧），而 opencode 本体配置在
 * Windows 侧 C:\Users\...\.config\opencode\opencode.jsonc，WSL 视角即 /mnt/c/Users/.../。
 * 同时兼容 WSL 本地配置与 Windows 侧运行。
 */
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

function getSetting(key: string): string {
  return vscode.workspace.getConfiguration("opencodeProfileSwitcher").get<string>(key, "")
}

/** 解析主配置文件路径：设置优先，其次在常见位置自动探测 */
function resolveConfigFile(): string | undefined {
  const configured = getSetting(CONFIG_FILE_SETTING)
  if (configured && fs.existsSync(configured)) return configured
  for (const c of defaultConfigCandidates()) {
    if (fs.existsSync(c)) return c
  }
  return undefined
}

/**
 * 解析模板目录路径：
 * 1. 显式设置 opencodeProfileSwitcher.profileDir 优先；
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

/** 扫描模板目录，返回可切换的配置列表（按文件名排序） */
export function listProfiles(profileDir: string): Profile[] {
  const profiles: Profile[] = []
  for (const entry of fs.readdirSync(profileDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!PROFILE_TEMPLATE_EXTENSIONS.has(ext)) continue
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

export function activate(context: vscode.ExtensionContext): void {
  // 解析主配置与模板目录。将初始化包进 try/catch：任何异常都弹窗并保有状态栏，
  // 避免“状态栏凭空消失、无从排查”。
  let configFile: string | undefined
  let profileDir: string | undefined
  let seeded: string[] = []
  try {
    configFile = resolveConfigFile()
    profileDir = resolveProfileDir(configFile)
    seeded = configFile && profileDir ? ensureSeedProfiles(profileDir) : []
  } catch (e) {
    void vscode.window.showErrorMessage(`OpenCode Profile Switcher 初始化失败：${String(e)}`)
  }
  if (!configFile) {
    void vscode.window.showWarningMessage(
      "未找到 OpenCode 主配置文件，请在设置 opencodeProfileSwitcher.configFile 中指定路径。",
    )
  }

  // 刷新状态栏显示：重新扫描模板并识别当前生效配置
  const refresh = (statusBar: vscode.StatusBarItem): Profile | undefined => {
    if (!configFile || !profileDir) {
      statusBar.text = "$(warning) opencode 未配置"
      statusBar.tooltip = "请配置 opencodeProfileSwitcher.profileDir / configFile"
      return undefined
    }
    const profiles = listProfiles(profileDir)
    if (profiles.length === 0) {
      statusBar.text = "$(warning) 无配置模板"
      statusBar.tooltip = `目录 ${profileDir} 下没有 .jsonc/.json 模板`
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
      ("\n点击选择或切换 OpenCode 配置")
    statusBar.show()
    return active
  }

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.command = SELECT_COMMAND
  refresh(statusBar)
  if (seeded.length > 0) {
    void vscode.window.showInformationMessage(
      `已在 ${profileDir} 生成 ${seeded.length} 份配置模板骨架（${seeded.join("、")}）。` +
        "请打开编辑补齐各自 provider 的 apiKey 后，再点击状态栏切换。",
    )
  }

  const applyProfile = async (profile: Profile): Promise<void> => {
    if (!configFile) return
    try {
      const template = fs.readFileSync(profile.filePath, "utf8")
      fs.writeFileSync(configFile, template, "utf8")
      await context.globalState.update(GLOBAL_PREV_PATH_KEY, profile.filePath)
      refresh(statusBar)
      void vscode.window.showInformationMessage(
        `OpenCode 配置已切换为「${profile.name}」。下次启动 opencode 生效。`,
      )
    } catch (e) {
      void vscode.window.showErrorMessage(`写入 OpenCode 配置失败：${String(e)}`)
    }
  }

  const pickAndApply = async (): Promise<void> => {
    if (!profileDir || !configFile) return
    const profiles = listProfiles(profileDir)
    if (profiles.length === 0) {
      void vscode.window.showWarningMessage(`模板目录 ${profileDir} 下没有可用的 .jsonc/.json 配置。`)
      return
    }
    const active = refresh(statusBar)
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
  }

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand(SELECT_COMMAND, pickAndApply),
    vscode.commands.registerCommand(LAUNCH_COMMAND, () => launch()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("opencodeProfileSwitcher")) refresh(statusBar)
    }),
  )
}

/** 用当前已写入的配置启动 opencode（新终端） */
function launch(): void {
  const terminal = vscode.window.createTerminal({
    name: "opencode",
    location: { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
  })
  terminal.show()
  terminal.sendText("opencode")
}

export function deactivate(): void {}

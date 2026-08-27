export type LaunchMode = "omos" | "pomos"

const OMOS_PLUGIN_SUFFIX = "/vendor/omos/dist/index.js"

interface ArrayRange {
  start: number
  end: number
}

function findPluginArray(content: string): ArrayRange | undefined {
  const property = /"plugin"\s*:/.exec(content)
  if (!property) return undefined

  const start = content.indexOf("[", property.index + property[0].length)
  if (start < 0) return undefined

  let depth = 0
  let inString = false
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let i = start; i < content.length; i += 1) {
    const char = content[i]
    const next = content[i + 1]

    if (lineComment) {
      if (char === "\n") lineComment = false
      continue
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false
        i += 1
      }
      continue
    }
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === "/" && next === "/") {
      lineComment = true
      i += 1
      continue
    }
    if (char === "/" && next === "*") {
      blockComment = true
      i += 1
      continue
    }
    if (char === '"') inString = true
    else if (char === "[") depth += 1
    else if (char === "]") {
      depth -= 1
      if (depth === 0) return { start, end: i + 1 }
    }
  }

  return undefined
}

export function getOmosPluginFile(configFile: string): string {
  const normalized = configFile.replace(/\\/g, "/")
  return `${normalized.slice(0, normalized.lastIndexOf("/"))}${OMOS_PLUGIN_SUFFIX}`
}

export function getOmosPluginEntry(configFile: string): string {
  let pluginFile = getOmosPluginFile(configFile)
  const wslWindowsPath = /^\/mnt\/([a-z])\/(.*)$/i.exec(pluginFile)
  if (wslWindowsPath) {
    pluginFile = `${wslWindowsPath[1].toUpperCase()}:/${wslWindowsPath[2]}`
  }

  const url = new URL("file:///")
  url.pathname = pluginFile
  return url.href
}

function isOmosPluginEntry(value: string): boolean {
  return (
    (value.startsWith("file:") && value.replace(/\\/g, "/").endsWith(OMOS_PLUGIN_SUFFIX)) ||
    /^@617luohe\/omos(?:@.+)?$/.test(value)
  )
}

export function readModeFromContent(content: string): LaunchMode {
  const range = findPluginArray(content)
  if (!range) return "pomos"

  const strings = content.slice(range.start, range.end).match(/"(?:\\.|[^"\\])*"/g) ?? []
  return strings.some((value) => {
    try {
      return isOmosPluginEntry(JSON.parse(value) as string)
    } catch {
      return false
    }
  })
    ? "omos"
    : "pomos"
}

export function updateModeInContent(
  content: string,
  mode: LaunchMode,
  omosPluginEntry: string,
): string {
  const pluginJson = JSON.stringify(mode === "omos" ? [omosPluginEntry] : [])
  const range = findPluginArray(content)
  if (range) {
    return `${content.slice(0, range.start)}${pluginJson}${content.slice(range.end)}`
  }
  return content.replace(/\{\s*/, `{ "plugin": ${pluginJson}, `)
}

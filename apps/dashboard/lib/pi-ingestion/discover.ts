import { readdir, readFile, stat } from "node:fs/promises"
import { basename, join } from "node:path"
import { homedir } from "node:os"

import type { ProviderName, SessionSource } from "@/lib/pi-ingestion/types"

type PiSessionHeader = {
  type: string
  id?: string
  cwd?: string
  timestamp?: string
}

type ClaudeFirstEntry = {
  sessionId?: string
  cwd?: string
  timestamp?: string
}

function getClaudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")
}

function getClaudeDesktopSessionsDir(): string {
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Claude", "local-agent-mode-sessions")
  }
  if (process.platform === "win32") {
    return join(homedir(), "AppData", "Roaming", "Claude", "local-agent-mode-sessions")
  }
  return join(homedir(), ".config", "Claude", "local-agent-mode-sessions")
}

export const DEFAULT_PI_SESSIONS_DIR = join(homedir(), ".pi", "agent", "sessions")
export const DEFAULT_CLAUDE_PROJECTS_DIR = join(getClaudeConfigDir(), "projects")

async function readFirstNonEmptyJson<T>(filePath: string): Promise<T | null> {
  let content = ""
  try {
    content = await readFile(filePath, "utf-8")
  } catch {
    return null
  }

  const line = content
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0)

  if (!line) return null

  try {
    return JSON.parse(line) as T
  } catch {
    return null
  }
}

async function collectClaudeJsonlFiles(projectPath: string): Promise<string[]> {
  const files = await readdir(projectPath).catch(() => [])
  const jsonlFiles = files.filter((file) => file.endsWith(".jsonl")).map((file) => join(projectPath, file))

  for (const entry of files) {
    if (entry.endsWith(".jsonl")) continue
    const subagentsPath = join(projectPath, entry, "subagents")
    const subagentFiles = await readdir(subagentsPath).catch(() => [])
    for (const subagentFile of subagentFiles) {
      if (subagentFile.endsWith(".jsonl")) {
        jsonlFiles.push(join(subagentsPath, subagentFile))
      }
    }
  }

  return jsonlFiles
}

export async function discoverPiSessionSources(
  sessionsDir: string = DEFAULT_PI_SESSIONS_DIR,
): Promise<SessionSource[]> {
  const sources: SessionSource[] = []

  let projectDirectories: string[] = []
  try {
    projectDirectories = await readdir(sessionsDir)
  } catch {
    return sources
  }

  for (const directoryName of projectDirectories) {
    const directoryPath = join(sessionsDir, directoryName)
    const directoryStat = await stat(directoryPath).catch(() => null)
    if (!directoryStat?.isDirectory()) continue

    let files: string[] = []
    try {
      files = await readdir(directoryPath)
    } catch {
      continue
    }

    for (const fileName of files) {
      if (!fileName.endsWith(".jsonl")) continue

      const filePath = join(directoryPath, fileName)
      const fileStat = await stat(filePath).catch(() => null)
      if (!fileStat?.isFile()) continue

      const header = await readFirstNonEmptyJson<PiSessionHeader>(filePath)
      if (!header || header.type !== "session") continue

      const sessionId = header.id ?? basename(fileName, ".jsonl")
      const cwd = header.cwd ?? directoryName
      const projectLabel = basename(cwd)

      sources.push({
        provider: "pi",
        path: filePath,
        sessionId,
        cwd,
        projectId: cwd,
        projectLabel,
        timestamp: header.timestamp,
      })
    }
  }

  return sources
}

async function findDesktopClaudeProjectDirs(basePath: string): Promise<string[]> {
  const results: string[] = []

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 8) return

    const entries = await readdir(directory).catch(() => [])
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git") continue

      const fullPath = join(directory, entry)
      const directoryStat = await stat(fullPath).catch(() => null)
      if (!directoryStat?.isDirectory()) continue

      if (entry === "projects") {
        const projectDirectories = await readdir(fullPath).catch(() => [])
        for (const projectDirectory of projectDirectories) {
          const projectPath = join(fullPath, projectDirectory)
          const projectStat = await stat(projectPath).catch(() => null)
          if (projectStat?.isDirectory()) results.push(projectPath)
        }
      } else {
        await walk(fullPath, depth + 1)
      }
    }
  }

  await walk(basePath, 0)
  return results
}

export async function discoverClaudeSessionSources(
  projectsDir: string = DEFAULT_CLAUDE_PROJECTS_DIR,
): Promise<SessionSource[]> {
  const sources: SessionSource[] = []
  const projectPaths = new Set<string>()

  const projectDirectories = await readdir(projectsDir).catch(() => [])
  for (const directoryName of projectDirectories) {
    const projectPath = join(projectsDir, directoryName)
    const projectStat = await stat(projectPath).catch(() => null)
    if (projectStat?.isDirectory()) {
      projectPaths.add(projectPath)
    }
  }

  const desktopProjectPaths = await findDesktopClaudeProjectDirs(getClaudeDesktopSessionsDir())
  for (const projectPath of desktopProjectPaths) {
    projectPaths.add(projectPath)
  }

  for (const projectPath of projectPaths) {
    const directoryName = basename(projectPath)
    const jsonlFiles = await collectClaudeJsonlFiles(projectPath)

    for (const filePath of jsonlFiles) {
      const fileStat = await stat(filePath).catch(() => null)
      if (!fileStat?.isFile()) continue

      const firstEntry = await readFirstNonEmptyJson<ClaudeFirstEntry>(filePath)
      if (!firstEntry) continue

      const sessionId = firstEntry.sessionId ?? basename(filePath, ".jsonl")
      const cwd = firstEntry.cwd ?? directoryName

      sources.push({
        provider: "claude",
        path: filePath,
        sessionId,
        cwd,
        projectId: cwd,
        projectLabel: basename(cwd),
        timestamp: firstEntry.timestamp,
      })
    }
  }

  return sources
}

type DiscoverOptions = {
  piSessionsDir?: string
  claudeProjectsDir?: string
  providers?: ProviderName[]
}

export async function discoverSessionSources(options: DiscoverOptions = {}): Promise<SessionSource[]> {
  const providers = options.providers ?? ["pi", "claude"]
  const shouldDiscoverPi = providers.includes("pi")
  const shouldDiscoverClaude = providers.includes("claude")

  const [piSources, claudeSources] = await Promise.all([
    shouldDiscoverPi ? discoverPiSessionSources(options.piSessionsDir) : Promise.resolve([]),
    shouldDiscoverClaude
      ? discoverClaudeSessionSources(options.claudeProjectsDir)
      : Promise.resolve([]),
  ])

  return [...piSources, ...claudeSources]
}

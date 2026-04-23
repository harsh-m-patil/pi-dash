import { readdir, readFile, stat } from "node:fs/promises"
import { basename, join } from "node:path"
import { homedir } from "node:os"

import type { SessionSource } from "@/lib/pi-ingestion/types"

type SessionHeader = {
  type: string
  id?: string
  cwd?: string
  timestamp?: string
}

export const DEFAULT_PI_SESSIONS_DIR = join(homedir(), ".pi", "agent", "sessions")

async function readSessionHeader(filePath: string): Promise<SessionHeader | null> {
  let content = ""
  try {
    content = await readFile(filePath, "utf-8")
  } catch {
    return null
  }

  const firstLine = content.split("\n", 1)[0]?.trim()
  if (!firstLine) return null

  try {
    const parsed = JSON.parse(firstLine) as SessionHeader
    if (parsed.type !== "session") return null
    return parsed
  } catch {
    return null
  }
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

      const header = await readSessionHeader(filePath)
      if (!header) continue

      const sessionId = header.id ?? basename(fileName, ".jsonl")
      const cwd = header.cwd ?? directoryName
      const projectLabel = basename(cwd)

      sources.push({
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

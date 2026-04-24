import "server-only"

import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { basename } from "node:path"

import { discoverSessionSources } from "./discover"
import { parseClaudeSessionContent, parsePiSessionContent } from "./parse"
import type {
  IngestionConflict,
  IngestionResult,
  Project,
  ProviderName,
  Session,
  SessionSource,
  TimeWindow,
} from "./types"
import { addUsage, createEmptyUsage } from "./usage"

type IngestOptions = {
  sessionsDir?: string
  claudeProjectsDir?: string
  providers?: ProviderName[]
  from?: Date
  to?: Date
  days?: number
}

type LoadedSource = {
  source: SessionSource
  hash: string
  content: string
}

function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

function resolveWindow(options: IngestOptions): TimeWindow {
  if (options.from || options.to) {
    const to = options.to ?? new Date()
    const from = options.from ?? new Date(0)
    return { from, to }
  }

  const days = options.days ?? 7
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - days)
  return { from, to }
}

function timestampInWindow(timestamp: string, window: TimeWindow): boolean {
  if (!timestamp) return false
  const value = Date.parse(timestamp)
  if (!Number.isFinite(value)) return false
  return value >= window.from.getTime() && value <= window.to.getTime()
}

function filterSessionByWindow(session: Session, window: TimeWindow): Session | null {
  const turns = session.turns
    .map((turn) => {
      const invocations = turn.invocations.filter((invocation) =>
        timestampInWindow(invocation.timestamp, window),
      )
      if (invocations.length === 0) return null

      const firstInvocation = invocations[0]!
      const lastInvocation = invocations[invocations.length - 1]!

      const toolCalls = turn.toolCalls.filter((toolCall) =>
        invocations.some((invocation) => invocation.toolCallIds.includes(toolCall.id)),
      )

      return {
        ...turn,
        startedAt: firstInvocation.timestamp || turn.startedAt,
        endedAt: lastInvocation.timestamp || turn.endedAt,
        invocations,
        toolCalls,
      }
    })
    .filter((turn): turn is Session["turns"][number] => turn !== null)

  if (turns.length === 0) return null

  let observed = createEmptyUsage()
  for (const turn of turns) {
    for (const invocation of turn.invocations) {
      observed = addUsage(observed, invocation.usage)
    }
  }

  return {
    ...session,
    startedAt: turns[0]!.startedAt,
    endedAt: turns[turns.length - 1]!.endedAt,
    turns,
    observed,
  }
}

function disambiguateProjectLabels(projects: Project[]): Project[] {
  const labelCounts = new Map<string, number>()

  for (const project of projects) {
    const label = basename(project.id)
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1)
  }

  return projects.map((project) => {
    const baseLabel = basename(project.id)
    const isAmbiguous = (labelCounts.get(baseLabel) ?? 0) > 1
    const label = isAmbiguous ? project.id : baseLabel
    return { ...project, label }
  })
}

function summarize(projects: Project[]): IngestionResult["summary"] {
  let sessions = 0
  let turns = 0
  let invocations = 0
  let observed = createEmptyUsage()

  for (const project of projects) {
    sessions += project.sessions.length
    observed = addUsage(observed, project.observed)

    for (const session of project.sessions) {
      turns += session.turns.length
      for (const turn of session.turns) {
        invocations += turn.invocations.length
      }
    }
  }

  return {
    projects: projects.length,
    sessions,
    turns,
    invocations,
    observed,
  }
}

async function loadSources(sources: SessionSource[]): Promise<LoadedSource[]> {
  const loaded: LoadedSource[] = []

  for (const source of sources) {
    let content = ""
    try {
      content = await readFile(source.path, "utf-8")
    } catch {
      continue
    }

    loaded.push({ source, content, hash: computeContentHash(content) })
  }

  return loaded
}

function resolveConflicts(
  loadedSources: LoadedSource[],
): { accepted: LoadedSource[]; conflicts: IngestionConflict[] } {
  const bySessionId = new Map<string, LoadedSource[]>()

  for (const loadedSource of loadedSources) {
    const key = `${loadedSource.source.provider}:${loadedSource.source.sessionId}`
    const existing = bySessionId.get(key) ?? []
    existing.push(loadedSource)
    bySessionId.set(key, existing)
  }

  const accepted: LoadedSource[] = []
  const conflicts: IngestionConflict[] = []

  for (const [key, sources] of bySessionId) {
    const [provider, sessionId] = key.split(":", 2)
    const uniqueByHash = new Map<string, LoadedSource>()
    for (const source of sources) {
      if (!uniqueByHash.has(source.hash)) {
        uniqueByHash.set(source.hash, source)
      }
    }

    if (uniqueByHash.size > 1) {
      conflicts.push({
        provider: (provider as ProviderName) ?? sources[0]!.source.provider,
        sessionId: sessionId ?? sources[0]!.source.sessionId,
        files: sources.map((source) => ({ path: source.source.path, hash: source.hash })),
      })
      continue
    }

    const canonical = uniqueByHash.values().next().value as LoadedSource
    accepted.push(canonical)
  }

  return { accepted, conflicts }
}

function groupByProject(sessions: Session[]): Project[] {
  const projectMap = new Map<string, Project>()

  for (const session of sessions) {
    const existing = projectMap.get(session.projectId)

    if (existing) {
      existing.sessions.push(session)
      existing.observed = addUsage(existing.observed, session.observed)
    } else {
      projectMap.set(session.projectId, {
        id: session.projectId,
        label: session.projectLabel,
        sessions: [session],
        observed: session.observed,
      })
    }
  }

  const projects = Array.from(projectMap.values())
    .map((project) => ({
      ...project,
      sessions: [...project.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    }))
    .sort((a, b) => b.observed.cost.total - a.observed.cost.total)

  return disambiguateProjectLabels(projects)
}

function parseSessionForProvider(source: SessionSource, content: string): Session | null {
  if (source.provider === "claude") return parseClaudeSessionContent(source, content)
  return parsePiSessionContent(source, content)
}

export async function ingestAgentSessions(options: IngestOptions = {}): Promise<IngestionResult> {
  const window = resolveWindow(options)

  const discovered = await discoverSessionSources({
    piSessionsDir: options.sessionsDir,
    claudeProjectsDir: options.claudeProjectsDir,
    providers: options.providers,
  })

  const loadedSources = await loadSources(discovered)
  const { accepted, conflicts } = resolveConflicts(loadedSources)

  const sessions: Session[] = []

  for (const source of accepted) {
    const session = parseSessionForProvider(source.source, source.content)
    if (!session) continue

    const inWindow = filterSessionByWindow(session, window)
    if (!inWindow) continue

    sessions.push(inWindow)
  }

  const projects = groupByProject(sessions)

  return {
    window,
    projects,
    conflicts,
    summary: summarize(projects),
  }
}

export async function ingestPiSessions(options: IngestOptions = {}): Promise<IngestionResult> {
  return ingestAgentSessions(options)
}

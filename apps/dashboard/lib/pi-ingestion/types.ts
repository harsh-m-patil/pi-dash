export type ProviderName = "pi" | "claude"

export type ObservedUsage = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  cost: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    total: number
  }
}

export type ParsedToolCall = {
  id: string
  name: string
  normalizedName: string
  arguments: Record<string, unknown>
  startedAt: string
  finishedAt?: string
  latencyMs?: number
  outcome: "success" | "error" | "unknown"
}

export type LlmInvocation = {
  id: string
  timestamp: string
  provider: string
  model: string
  responseId?: string
  stopReason?: string
  usage: ObservedUsage
  toolCallIds: string[]
}

export type Turn = {
  id: string
  userMessage: string
  startedAt: string
  endedAt: string
  invocations: LlmInvocation[]
  toolCalls: ParsedToolCall[]
}

export type Session = {
  id: string
  provider: ProviderName
  sourcePath: string
  cwd: string
  projectId: string
  projectLabel: string
  startedAt: string
  endedAt: string
  turns: Turn[]
  observed: ObservedUsage
}

export type Project = {
  id: string
  label: string
  sessions: Session[]
  observed: ObservedUsage
}

export type SessionSource = {
  provider: ProviderName
  path: string
  sessionId: string
  cwd: string
  projectId: string
  projectLabel: string
  timestamp?: string
}

export type IngestionConflict = {
  provider: ProviderName
  sessionId: string
  files: Array<{ path: string; hash: string }>
}

export type TimeWindow = {
  from: Date
  to: Date
}

export type IngestionSummary = {
  projects: number
  sessions: number
  turns: number
  invocations: number
  observed: ObservedUsage
}

export type IngestionResult = {
  window: TimeWindow
  projects: Project[]
  conflicts: IngestionConflict[]
  summary: IngestionSummary
}

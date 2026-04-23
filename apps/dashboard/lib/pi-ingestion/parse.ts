import { basename } from "node:path"

import type {
  LlmInvocation,
  ObservedUsage,
  ParsedToolCall,
  Session,
  SessionSource,
  Turn,
} from "@/lib/pi-ingestion/types"
import { normalizeToolName } from "@/lib/pi-ingestion/tooling"
import { addUsage, createEmptyUsage } from "@/lib/pi-ingestion/usage"

type PiEntry = {
  type: string
  id?: string
  timestamp?: string
  cwd?: string
  message?: {
    role?: string
    model?: string
    provider?: string
    responseId?: string
    stopReason?: string
    toolCallId?: string
    toolName?: string
    isError?: boolean
    content?: Array<{
      type?: string
      id?: string
      name?: string
      text?: string
      arguments?: Record<string, unknown>
    }>
    usage?: {
      input?: number
      output?: number
      cacheRead?: number
      cacheWrite?: number
      totalTokens?: number
      cost?: {
        input?: number
        output?: number
        cacheRead?: number
        cacheWrite?: number
        total?: number
      }
    }
  }
}

type MutableTurn = {
  id: string
  userMessage: string
  startedAt: string
  endedAt: string
  invocations: LlmInvocation[]
  toolCalls: ParsedToolCall[]
}

function parseJsonLine(line: string): PiEntry | null {
  try {
    return JSON.parse(line) as PiEntry
  } catch {
    return null
  }
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function parseObservedUsage(
  raw:
    | {
        input?: number
        output?: number
        cacheRead?: number
        cacheWrite?: number
        totalTokens?: number
        cost?: {
          input?: number
          output?: number
          cacheRead?: number
          cacheWrite?: number
          total?: number
        }
      }
    | undefined,
): ObservedUsage {
  const input = toNumber(raw?.input)
  const output = toNumber(raw?.output)
  const cacheRead = toNumber(raw?.cacheRead)
  const cacheWrite = toNumber(raw?.cacheWrite)
  const totalTokens = toNumber(raw?.totalTokens) || input + output + cacheRead + cacheWrite

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens,
    cost: {
      input: toNumber(raw?.cost?.input),
      output: toNumber(raw?.cost?.output),
      cacheRead: toNumber(raw?.cost?.cacheRead),
      cacheWrite: toNumber(raw?.cost?.cacheWrite),
      total: toNumber(raw?.cost?.total),
    },
  }
}

function extractUserMessageText(entry: PiEntry): string {
  const content = entry.message?.content
  if (!Array.isArray(content)) return ""

  return content
    .filter((block) => block.type === "text")
    .map((block) => (typeof block.text === "string" ? block.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
}

function toTimestampMs(timestamp?: string): number | null {
  if (!timestamp) return null
  const value = Date.parse(timestamp)
  return Number.isFinite(value) ? value : null
}

function createTurn(sessionId: string, turnNumber: number, startedAt: string, userMessage: string): MutableTurn {
  return {
    id: `${sessionId}:turn:${turnNumber}`,
    userMessage,
    startedAt,
    endedAt: startedAt,
    invocations: [],
    toolCalls: [],
  }
}

function finalizeTurn(turns: Turn[], turn: MutableTurn | null, fallbackTimestamp = ""): MutableTurn | null {
  if (!turn) return null
  if (turn.invocations.length === 0) return null

  if (!turn.endedAt) {
    turn.endedAt =
      turn.invocations[turn.invocations.length - 1]?.timestamp || turn.startedAt || fallbackTimestamp
  }

  turns.push({
    id: turn.id,
    userMessage: turn.userMessage,
    startedAt: turn.startedAt,
    endedAt: turn.endedAt,
    invocations: turn.invocations,
    toolCalls: turn.toolCalls,
  })

  return null
}

function summarizeSessionUsage(turns: Turn[]): ObservedUsage {
  let usage = createEmptyUsage()

  for (const turn of turns) {
    for (const invocation of turn.invocations) {
      usage = addUsage(usage, invocation.usage)
    }
  }

  return usage
}

export function parsePiSessionContent(source: SessionSource, content: string): Session | null {
  const lines = content.split("\n").filter((line) => line.trim().length > 0)
  if (lines.length === 0) return null

  let sessionId = source.sessionId || basename(source.path, ".jsonl")
  let cwd = source.cwd

  const turns: Turn[] = []
  let currentTurn: MutableTurn | null = null
  let turnCount = 0
  let pendingUserMessage = ""

  const toolCallsById = new Map<string, ParsedToolCall>()

  for (const line of lines) {
    const entry = parseJsonLine(line)
    if (!entry) continue

    if (entry.type === "session") {
      if (entry.id) sessionId = entry.id
      if (entry.cwd) cwd = entry.cwd
      continue
    }

    if (entry.type !== "message" || !entry.message) continue

    if (entry.message.role === "user") {
      pendingUserMessage = extractUserMessageText(entry)

      if (currentTurn && currentTurn.invocations.length > 0) {
        currentTurn.endedAt = entry.timestamp ?? currentTurn.endedAt
        currentTurn = finalizeTurn(turns, currentTurn, entry.timestamp)
      }
      continue
    }

    if (entry.message.role === "assistant" && entry.message.usage) {
      const usage = parseObservedUsage(entry.message.usage)
      if (usage.totalTokens === 0) continue

      if (!currentTurn) {
        turnCount += 1
        currentTurn = createTurn(
          sessionId,
          turnCount,
          entry.timestamp ?? "",
          pendingUserMessage,
        )
      }
      pendingUserMessage = ""

      const toolBlocks = (entry.message.content ?? []).filter(
        (block) => block.type === "toolCall" && typeof block.name === "string",
      )

      const toolCallIds: string[] = []
      for (const block of toolBlocks) {
        const toolCallId = block.id ?? `${currentTurn.id}:tool:${currentTurn.toolCalls.length + 1}`
        toolCallIds.push(toolCallId)

        const toolCall: ParsedToolCall = {
          id: toolCallId,
          name: block.name!,
          normalizedName: normalizeToolName(block.name!),
          arguments: block.arguments ?? {},
          startedAt: entry.timestamp ?? "",
          outcome: "unknown",
        }

        currentTurn.toolCalls.push(toolCall)
        toolCallsById.set(toolCallId, toolCall)
      }

      const invocation: LlmInvocation = {
        id: entry.id ?? `${currentTurn.id}:invocation:${currentTurn.invocations.length + 1}`,
        timestamp: entry.timestamp ?? "",
        provider: entry.message.provider ?? "unknown",
        model: entry.message.model ?? "unknown",
        responseId: entry.message.responseId,
        stopReason: entry.message.stopReason,
        usage,
        toolCallIds,
      }

      currentTurn.invocations.push(invocation)
      if (!currentTurn.startedAt) currentTurn.startedAt = invocation.timestamp
      currentTurn.endedAt = invocation.timestamp

      if (entry.message.stopReason === "stop") {
        currentTurn = finalizeTurn(turns, currentTurn, entry.timestamp)
      }

      continue
    }

    if (entry.message.role === "toolResult") {
      const toolCallId = entry.message.toolCallId
      if (!toolCallId) continue

      const toolCall = toolCallsById.get(toolCallId)
      if (!toolCall) continue

      const finishedAt = entry.timestamp
      toolCall.finishedAt = finishedAt
      toolCall.outcome = entry.message.isError ? "error" : "success"

      const startedAtMs = toTimestampMs(toolCall.startedAt)
      const finishedAtMs = toTimestampMs(finishedAt)
      if (startedAtMs !== null && finishedAtMs !== null && finishedAtMs >= startedAtMs) {
        toolCall.latencyMs = finishedAtMs - startedAtMs
      }
    }
  }

  currentTurn = finalizeTurn(turns, currentTurn)
  if (turns.length === 0) return null

  const startedAt = turns[0]?.startedAt ?? ""
  const endedAt = turns[turns.length - 1]?.endedAt ?? startedAt
  const observed = summarizeSessionUsage(turns)

  return {
    id: sessionId,
    sourcePath: source.path,
    cwd,
    projectId: cwd,
    projectLabel: basename(cwd),
    startedAt,
    endedAt,
    turns,
    observed,
  }
}

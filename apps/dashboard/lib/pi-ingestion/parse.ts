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

type ClaudeContentBlock = {
  type?: string
  id?: string
  name?: string
  text?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  toolUseId?: string
  is_error?: boolean
  isError?: boolean
}

type ClaudeEntry = {
  type: string
  id?: string
  uuid?: string
  sessionId?: string
  cwd?: string
  timestamp?: string
  message?: {
    id?: string
    role?: string
    model?: string
    content?: string | ClaudeContentBlock[]
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    stop_reason?: string
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

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function parseObservedUsageFromValues(values: {
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
}): ObservedUsage {
  const input = toNumber(values.input)
  const output = toNumber(values.output)
  const cacheRead = toNumber(values.cacheRead)
  const cacheWrite = toNumber(values.cacheWrite)
  const totalTokens = toNumber(values.totalTokens) || input + output + cacheRead + cacheWrite

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens,
    cost: {
      input: toNumber(values.cost?.input),
      output: toNumber(values.cost?.output),
      cacheRead: toNumber(values.cost?.cacheRead),
      cacheWrite: toNumber(values.cost?.cacheWrite),
      total: toNumber(values.cost?.total),
    },
  }
}

function parsePiJsonLine(line: string): PiEntry | null {
  try {
    return JSON.parse(line) as PiEntry
  } catch {
    return null
  }
}

function parseClaudeJsonLine(line: string): ClaudeEntry | null {
  try {
    return JSON.parse(line) as ClaudeEntry
  } catch {
    return null
  }
}

function extractPiUserMessageText(entry: PiEntry): string {
  const content = entry.message?.content
  if (!Array.isArray(content)) return ""

  return content
    .filter((block) => block.type === "text")
    .map((block) => (typeof block.text === "string" ? block.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
}

type ClaudeMessageContent = string | ClaudeContentBlock[] | undefined

function extractClaudeUserMessageText(content: ClaudeMessageContent): string {
  if (typeof content === "string") return content.trim()
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

function markToolCallResult(
  toolCallsById: Map<string, ParsedToolCall>,
  toolCallId: string,
  timestamp?: string,
  isError = false,
): void {
  const toolCall = toolCallsById.get(toolCallId)
  if (!toolCall) return

  toolCall.finishedAt = timestamp
  toolCall.outcome = isError ? "error" : "success"

  const startedAtMs = toTimestampMs(toolCall.startedAt)
  const finishedAtMs = toTimestampMs(timestamp)
  if (startedAtMs !== null && finishedAtMs !== null && finishedAtMs >= startedAtMs) {
    toolCall.latencyMs = finishedAtMs - startedAtMs
  }
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
    const entry = parsePiJsonLine(line)
    if (!entry) continue

    if (entry.type === "session") {
      if (entry.id) sessionId = entry.id
      if (entry.cwd) cwd = entry.cwd
      continue
    }

    if (entry.type !== "message" || !entry.message) continue

    if (entry.message.role === "user") {
      pendingUserMessage = extractPiUserMessageText(entry)

      if (currentTurn && currentTurn.invocations.length > 0) {
        currentTurn.endedAt = entry.timestamp ?? currentTurn.endedAt
        currentTurn = finalizeTurn(turns, currentTurn, entry.timestamp)
      }
      continue
    }

    if (entry.message.role === "assistant" && entry.message.usage) {
      const usage = parseObservedUsageFromValues({
        input: entry.message.usage.input,
        output: entry.message.usage.output,
        cacheRead: entry.message.usage.cacheRead,
        cacheWrite: entry.message.usage.cacheWrite,
        totalTokens: entry.message.usage.totalTokens,
        cost: entry.message.usage.cost,
      })
      if (usage.totalTokens === 0) continue

      if (!currentTurn) {
        turnCount += 1
        currentTurn = createTurn(sessionId, turnCount, entry.timestamp ?? "", pendingUserMessage)
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
        provider: entry.message.provider ?? "pi",
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

      markToolCallResult(toolCallsById, toolCallId, entry.timestamp, Boolean(entry.message.isError))
    }
  }

  currentTurn = finalizeTurn(turns, currentTurn)
  if (turns.length === 0) return null

  const startedAt = turns[0]?.startedAt ?? ""
  const endedAt = turns[turns.length - 1]?.endedAt ?? startedAt
  const observed = summarizeSessionUsage(turns)

  return {
    id: sessionId,
    provider: "pi",
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

export function parseClaudeSessionContent(source: SessionSource, content: string): Session | null {
  const lines = content.split("\n").filter((line) => line.trim().length > 0)
  if (lines.length === 0) return null

  let sessionId = source.sessionId || basename(source.path, ".jsonl")
  let cwd = source.cwd

  const turns: Turn[] = []
  let currentTurn: MutableTurn | null = null
  let turnCount = 0
  let pendingUserMessage = ""

  const seenInvocationIds = new Set<string>()
  const toolCallsById = new Map<string, ParsedToolCall>()

  for (const line of lines) {
    const entry = parseClaudeJsonLine(line)
    if (!entry) continue

    if (entry.sessionId) sessionId = entry.sessionId
    if (entry.cwd) cwd = entry.cwd

    if (entry.type === "user") {
      const contentBlocks = entry.message?.content
      const userText = extractClaudeUserMessageText(contentBlocks)

      if (userText) {
        if (currentTurn && currentTurn.invocations.length > 0) {
          currentTurn.endedAt = entry.timestamp ?? currentTurn.endedAt
          currentTurn = finalizeTurn(turns, currentTurn, entry.timestamp)
        }
        pendingUserMessage = userText
      }

      if (Array.isArray(contentBlocks)) {
        for (const block of contentBlocks) {
          if (block.type !== "tool_result") continue

          const toolCallId = block.tool_use_id ?? block.toolUseId
          if (!toolCallId) continue

          markToolCallResult(
            toolCallsById,
            toolCallId,
            entry.timestamp,
            Boolean(block.is_error ?? block.isError),
          )
        }
      }

      continue
    }

    if (entry.type !== "assistant" || !entry.message?.usage || !entry.message.model) continue

    const usage = parseObservedUsageFromValues({
      input: entry.message.usage.input_tokens,
      output: entry.message.usage.output_tokens,
      cacheRead: entry.message.usage.cache_read_input_tokens,
      cacheWrite: entry.message.usage.cache_creation_input_tokens,
    })
    if (usage.totalTokens === 0) continue

    if (!currentTurn) {
      turnCount += 1
      currentTurn = createTurn(sessionId, turnCount, entry.timestamp ?? "", pendingUserMessage)
    }
    pendingUserMessage = ""

    const invocationId =
      entry.message.id ?? entry.uuid ?? entry.id ?? `${currentTurn.id}:invocation:${currentTurn.invocations.length + 1}`

    if (seenInvocationIds.has(invocationId)) continue
    seenInvocationIds.add(invocationId)

    const contentBlocks = Array.isArray(entry.message.content) ? entry.message.content : []
    const toolBlocks = contentBlocks.filter(
      (block) => block.type === "tool_use" && typeof block.name === "string",
    )

    const toolCallIds: string[] = []
    for (const block of toolBlocks) {
      const toolCallId = block.id ?? `${currentTurn.id}:tool:${currentTurn.toolCalls.length + 1}`
      toolCallIds.push(toolCallId)

      const toolCall: ParsedToolCall = {
        id: toolCallId,
        name: block.name!,
        normalizedName: normalizeToolName(block.name!),
        arguments: block.input ?? {},
        startedAt: entry.timestamp ?? "",
        outcome: "unknown",
      }

      currentTurn.toolCalls.push(toolCall)
      toolCallsById.set(toolCallId, toolCall)
    }

    const invocation: LlmInvocation = {
      id: invocationId,
      timestamp: entry.timestamp ?? "",
      provider: "claude",
      model: entry.message.model,
      stopReason: entry.message.stop_reason,
      usage,
      toolCallIds,
    }

    currentTurn.invocations.push(invocation)
    if (!currentTurn.startedAt) currentTurn.startedAt = invocation.timestamp
    currentTurn.endedAt = invocation.timestamp

    if (entry.message.stop_reason === "stop" || entry.message.stop_reason === "end_turn") {
      currentTurn = finalizeTurn(turns, currentTurn, entry.timestamp)
    }
  }

  currentTurn = finalizeTurn(turns, currentTurn)
  if (turns.length === 0) return null

  const startedAt = turns[0]?.startedAt ?? ""
  const endedAt = turns[turns.length - 1]?.endedAt ?? startedAt
  const observed = summarizeSessionUsage(turns)

  return {
    id: sessionId,
    provider: "claude",
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

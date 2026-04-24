import { basename } from "node:path"

import type {
  LlmInvocation,
  ObservedUsage,
  ParsedToolCall,
  Session,
  SessionSource,
  Turn,
} from "./types"
import { normalizeToolName } from "./tooling"
import { addUsage, createEmptyUsage } from "./usage"

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
  agentId?: string
  isSidechain?: boolean
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

/**
 * Claude logs multiple streaming entries per logical assistant message.
 * All streaming entries share the same `message.id` but have different `uuid`s.
 * Each streaming entry typically contains only one `tool_use` block (the latest
 * tool being dispatched). The final entry for a message has a non-null
 * `stop_reason` (e.g. "tool_use", "end_turn", "stop_sequence") and carries
 * the real token usage.
 *
 * To get the complete picture we consolidate all entries sharing a `message.id`:
 *   - Collect tool_use blocks from ALL streaming entries (deduped by block id)
 *   - Use the FINAL entry's usage and stop_reason
 *   - Emit one invocation per consolidated message
 */

type ConsolidatedClaudeMessage = {
  /** Canonical invocation id (message.id) */
  messageId: string
  /** Timestamp of the first streaming entry (start of generation) */
  firstTimestamp: string
  /** Timestamp of the final streaming entry */
  lastTimestamp: string
  /** Model from the final entry */
  model: string
  /** stop_reason from the final entry (may still be undefined for incomplete messages) */
  stopReason: string | undefined
  /** Usage from the final entry (highest token counts) */
  usage: ClaudeEntry["message"] & { usage: NonNullable<ClaudeEntry["message"]>["usage"] }
  /** All unique tool_use blocks collected across streaming entries, in order */
  toolBlocks: ClaudeContentBlock[]
}

function consolidateClaudeAssistantEntries(
  entries: ClaudeEntry[],
): ConsolidatedClaudeMessage[] {
  // Ordered map: messageId -> accumulator
  const byMessageId = new Map<
    string,
    {
      firstTimestamp: string
      lastTimestamp: string
      model: string
      stopReason: string | undefined
      finalUsage: NonNullable<ClaudeEntry["message"]>["usage"]
      toolBlockIds: Set<string>
      toolBlocks: ClaudeContentBlock[]
      rawFinalMessage: NonNullable<ClaudeEntry["message"]>
    }
  >()

  let syntheticCounter = 0

  for (const entry of entries) {
    if (entry.type !== "assistant" || !entry.message?.usage || !entry.message.model) continue

    const messageId =
      entry.message.id ?? entry.uuid ?? entry.id ?? `__synthetic_${++syntheticCounter}`
    const timestamp = entry.timestamp ?? ""

    const existing = byMessageId.get(messageId)

    // Extract tool_use blocks from this streaming entry
    const contentBlocks = Array.isArray(entry.message.content) ? entry.message.content : []
    const newToolBlocks = contentBlocks.filter(
      (block) => block.type === "tool_use" && typeof block.name === "string",
    )

    if (!existing) {
      const seenIds = new Set<string>()
      const deduped: ClaudeContentBlock[] = []
      for (const block of newToolBlocks) {
        const blockId = block.id ?? ""
        if (blockId && seenIds.has(blockId)) continue
        if (blockId) seenIds.add(blockId)
        deduped.push(block)
      }

      byMessageId.set(messageId, {
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
        model: entry.message.model,
        stopReason: entry.message.stop_reason ?? undefined,
        finalUsage: entry.message.usage,
        toolBlockIds: seenIds,
        toolBlocks: deduped,
        rawFinalMessage: entry.message,
      })
    } else {
      // Update with latest timestamp, usage, stop_reason, model
      existing.lastTimestamp = timestamp
      existing.model = entry.message.model
      existing.rawFinalMessage = entry.message

      // Always prefer a non-null stop_reason from the latest entry
      if (entry.message.stop_reason) {
        existing.stopReason = entry.message.stop_reason
      }

      // Use the entry with the highest totalTokens as the authoritative usage
      const existingTotal =
        (existing.finalUsage?.input_tokens ?? 0) + (existing.finalUsage?.output_tokens ?? 0)
      const newTotal =
        (entry.message.usage?.input_tokens ?? 0) + (entry.message.usage?.output_tokens ?? 0)
      if (newTotal >= existingTotal) {
        existing.finalUsage = entry.message.usage
      }

      // Merge new tool blocks (dedup by block id)
      for (const block of newToolBlocks) {
        const blockId = block.id ?? ""
        if (blockId && existing.toolBlockIds.has(blockId)) continue
        if (blockId) existing.toolBlockIds.add(blockId)
        existing.toolBlocks.push(block)
      }
    }
  }

  const consolidated: ConsolidatedClaudeMessage[] = []
  for (const [messageId, data] of byMessageId) {
    consolidated.push({
      messageId,
      firstTimestamp: data.firstTimestamp,
      lastTimestamp: data.lastTimestamp,
      model: data.model,
      stopReason: data.stopReason,
      usage: { ...data.rawFinalMessage, usage: data.finalUsage },
      toolBlocks: data.toolBlocks,
    })
  }

  return consolidated
}

export function parseClaudeSessionContent(source: SessionSource, content: string): Session | null {
  const lines = content.split("\n").filter((line) => line.trim().length > 0)
  if (lines.length === 0) return null

  let sessionId = source.sessionId || basename(source.path, ".jsonl")
  let cwd = source.cwd
  let agentId: string | undefined = source.agentId
  let parentSessionId: string | undefined = source.parentSessionId

  // First pass: parse all entries, consolidate streamed assistant messages,
  // and produce a flat ordered list of logical events.
  type LogicalEvent =
    | { kind: "user"; entry: ClaudeEntry }
    | { kind: "assistant"; message: ConsolidatedClaudeMessage }

  const allParsedEntries: ClaudeEntry[] = []
  for (const line of lines) {
    const entry = parseClaudeJsonLine(line)
    if (entry) allParsedEntries.push(entry)
  }

  // Build ordered logical events.
  // We need to interleave consolidated assistant messages with user entries
  // in their original order. Strategy:
  //  1. Collect assistant entries per message.id, noting the index of the *first*
  //     streaming entry for ordering purposes.
  //  2. Walk the entries in order, emit user events immediately, emit
  //     consolidated assistant events at the position of their first entry.

  const assistantEntries: ClaudeEntry[] = []
  const firstIndexByMessageId = new Map<string, number>()
  let syntheticIdCounter = 0

  for (let i = 0; i < allParsedEntries.length; i++) {
    const entry = allParsedEntries[i]!

    // Track session / agent metadata
    if (entry.sessionId && !agentId) sessionId = entry.sessionId
    if (entry.agentId) agentId = entry.agentId
    if (entry.cwd) cwd = entry.cwd
    if (agentId && !sessionId.includes(":subagent:")) {
      parentSessionId = entry.sessionId ?? sessionId
      sessionId = `${parentSessionId}:subagent:${agentId}`
    }

    if (entry.type === "assistant" && entry.message?.usage && entry.message.model) {
      const msgId =
        entry.message.id ?? entry.uuid ?? entry.id ?? `__synthetic_${++syntheticIdCounter}`
      if (!firstIndexByMessageId.has(msgId)) {
        firstIndexByMessageId.set(msgId, i)
      }
      assistantEntries.push(entry)
    }
  }

  const consolidated = consolidateClaudeAssistantEntries(assistantEntries)
  const consolidatedByFirstIndex = new Map<number, ConsolidatedClaudeMessage>()
  for (const msg of consolidated) {
    const firstIdx = firstIndexByMessageId.get(msg.messageId)
    if (firstIdx !== undefined) {
      consolidatedByFirstIndex.set(firstIdx, msg)
    }
  }

  const logicalEvents: LogicalEvent[] = []
  const emittedAssistantIds = new Set<string>()

  for (let i = 0; i < allParsedEntries.length; i++) {
    const entry = allParsedEntries[i]!

    if (entry.type === "user") {
      logicalEvents.push({ kind: "user", entry })
      continue
    }

    const consolidatedMsg = consolidatedByFirstIndex.get(i)
    if (consolidatedMsg && !emittedAssistantIds.has(consolidatedMsg.messageId)) {
      emittedAssistantIds.add(consolidatedMsg.messageId)
      logicalEvents.push({ kind: "assistant", message: consolidatedMsg })
    }
  }

  // Second pass: walk logical events and build turns
  const turns: Turn[] = []
  let currentTurn: MutableTurn | null = null
  let turnCount = 0
  let pendingUserMessage = ""
  const toolCallsById = new Map<string, ParsedToolCall>()

  for (const event of logicalEvents) {
    if (event.kind === "user") {
      const entry = event.entry
      const contentBlocks = entry.message?.content
      const userText = extractClaudeUserMessageText(contentBlocks)

      if (userText) {
        if (currentTurn && currentTurn.invocations.length > 0) {
          currentTurn.endedAt = entry.timestamp ?? currentTurn.endedAt
          currentTurn = finalizeTurn(turns, currentTurn, entry.timestamp)
        }
        pendingUserMessage = userText
      }

      // Process tool_result blocks in user messages
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

    // kind === "assistant" — consolidated message
    const msg = event.message

    const usage = parseObservedUsageFromValues({
      input: msg.usage.usage?.input_tokens,
      output: msg.usage.usage?.output_tokens,
      cacheRead: msg.usage.usage?.cache_read_input_tokens,
      cacheWrite: msg.usage.usage?.cache_creation_input_tokens,
    })
    if (usage.totalTokens === 0) continue

    if (!currentTurn) {
      turnCount += 1
      currentTurn = createTurn(sessionId, turnCount, msg.firstTimestamp, pendingUserMessage)
    }
    pendingUserMessage = ""

    const toolCallIds: string[] = []
    for (const block of msg.toolBlocks) {
      const toolCallId = block.id ?? `${currentTurn.id}:tool:${currentTurn.toolCalls.length + 1}`
      toolCallIds.push(toolCallId)

      const toolCall: ParsedToolCall = {
        id: toolCallId,
        name: block.name!,
        normalizedName: normalizeToolName(block.name!),
        arguments: block.input ?? {},
        startedAt: msg.firstTimestamp,
        outcome: "unknown",
      }

      currentTurn.toolCalls.push(toolCall)
      toolCallsById.set(toolCallId, toolCall)
    }

    const invocation: LlmInvocation = {
      id: msg.messageId,
      timestamp: msg.lastTimestamp,
      provider: "claude",
      model: msg.model,
      stopReason: msg.stopReason,
      usage,
      toolCallIds,
    }

    currentTurn.invocations.push(invocation)
    if (!currentTurn.startedAt) currentTurn.startedAt = invocation.timestamp
    currentTurn.endedAt = invocation.timestamp

    if (msg.stopReason === "stop" || msg.stopReason === "end_turn" || msg.stopReason === "stop_sequence") {
      currentTurn = finalizeTurn(turns, currentTurn, msg.lastTimestamp)
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
    ...(parentSessionId ? { parentSessionId } : {}),
    ...(agentId ? { agentId } : {}),
  }
}

import { basename } from "node:path"

/**
 * Normalize a raw tool name into a canonical display form.
 *
 * Works dynamically — no hardcoded tool list required.
 *
 * Rules:
 *  1. MCP tools ("mcp__<server>__<action>") → keep as-is (already namespaced)
 *  2. Lowercase single-word names (Pi style: "bash") → Title-case → "Bash"
 *  3. Already title-cased names (Claude style: "Bash", "WebFetch") → keep as-is
 *  4. Everything else → return as-is
 *
 * This ensures Pi's "bash" and Claude's "Bash" collapse to the same key.
 */
export function normalizeToolName(rawToolName: string): string {
  if (!rawToolName) return rawToolName

  // MCP tools: preserve the fully-qualified name
  if (rawToolName.startsWith("mcp__") || rawToolName.startsWith("mcp_")) {
    return rawToolName
  }

  // If the name is entirely lowercase (Pi convention), title-case it
  // so it groups with Claude's already-title-cased variant.
  if (rawToolName === rawToolName.toLowerCase()) {
    return rawToolName.charAt(0).toUpperCase() + rawToolName.slice(1)
  }

  return rawToolName
}

function stripQuotedStrings(command: string): string {
  return command.replace(/"[^"]*"|'[^']*'/g, (match) => " ".repeat(match.length))
}

export function extractBashCommands(command: string): string[] {
  if (!command || !command.trim()) return []

  const stripped = stripQuotedStrings(command)
  const separatorRegex = /\s*(?:&&|;|\|)\s*/g

  const separators: Array<{ start: number; end: number }> = []
  let match: RegExpExecArray | null
  while ((match = separatorRegex.exec(stripped)) !== null) {
    separators.push({ start: match.index, end: match.index + match[0].length })
  }

  const ranges: Array<[number, number]> = []
  let cursor = 0
  for (const separator of separators) {
    ranges.push([cursor, separator.start])
    cursor = separator.end
  }
  ranges.push([cursor, command.length])

  const commands: string[] = []
  for (const [start, end] of ranges) {
    const segment = command.slice(start, end).trim()
    if (!segment) continue

    const tokens = segment.split(/\s+/)
    let index = 0
    while (index < tokens.length && /^\w+=/.test(tokens[index]!)) index++

    const executable = index < tokens.length ? basename(tokens[index]!) : ""
    if (executable && executable !== "cd" && executable !== "true" && executable !== "false") {
      commands.push(executable)
    }
  }

  return commands
}

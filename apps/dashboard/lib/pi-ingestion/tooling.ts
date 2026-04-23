import { basename } from "node:path"

const TOOL_NAME_MAP: Record<string, string> = {
  bash: "Bash",
  read: "Read",
  edit: "Edit",
  write: "Write",
}

function stripQuotedStrings(command: string): string {
  return command.replace(/"[^"]*"|'[^']*'/g, (match) => " ".repeat(match.length))
}

export function normalizeToolName(rawToolName: string): string {
  return TOOL_NAME_MAP[rawToolName] ?? rawToolName
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

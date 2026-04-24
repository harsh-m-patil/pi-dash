import { basename } from "node:path"

import { ingestAgentSessions, type ProviderName } from "@/lib/pi-ingestion"

export type DashboardProviderFilter = "all" | ProviderName
export type PageSearchParams = Record<string, string | string[] | undefined>

type DashboardSearchParamsInput = Promise<PageSearchParams> | PageSearchParams | undefined

type ActiveWindowQuery =
  | {
      days: number
    }
  | {
      from: string
      to: string
    }

export type DashboardProjectRow = {
  id: string
  label: string
  sessions: number
  turns: number
  invocations: number
  tokens: number
  cost: number
  cacheRate: number
}

export type DashboardSessionRow = {
  id: string
  provider: string
  projectId: string
  projectName: string
  turns: number
  invocations: number
  tools: number
  totalTokens: number
  cost: number
  endedAt: string
  endedAtLabel: string
}

export type DashboardToolRow = {
  name: string
  calls: number
  errors: number
  avgLatencyMs: number | null
}

export type DashboardData = {
  result: Awaited<ReturnType<typeof ingestAgentSessions>>
  selectedProviderFilter: DashboardProviderFilter
  selectedDays: number
  fromInput: string
  toInput: string
  isCustomWindow: boolean
  selectedWindowLabel: string
  windowLabel: string
  activeWindowQuery: ActiveWindowQuery
  providerSessionCounts: Record<string, number>
  projectRows: DashboardProjectRow[]
  recentSessionRows: DashboardSessionRow[]
  topTools: DashboardToolRow[]
  dailySeries: Array<{ key: string; value: number; label: string }>
  dailyTokenMixSeries: Array<{ key: string; input: number; output: number; cache: number; label: string }>
  tokenMixTotals: { input: number; output: number; cache: number }
  projectSpendSeries: Array<{ project: string; cost: number; sessions: number }>
  chartWindowLabel: string
  overallCacheRate: number
}

export const PROVIDER_FILTERS: Array<{ value: DashboardProviderFilter; label: string }> = [
  { value: "all", label: "All providers" },
  { value: "pi", label: "Pi" },
  { value: "claude", label: "Claude" },
]

const WINDOW_PRESETS = [7, 14, 30, 90] as const
const DEFAULT_WINDOW_DAYS = WINDOW_PRESETS[0]
const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeProviderFilter(value: string | undefined): DashboardProviderFilter {
  if (value === "pi" || value === "claude") return value
  return "all"
}

function normalizeWindowDays(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_WINDOW_DAYS
  return Math.min(parsed, 365)
}

function parseDateInput(value: string | undefined, boundary: "start" | "end"): Date | undefined {
  if (!value || !DATE_INPUT_REGEX.test(value)) return undefined

  const timestamp = Date.parse(
    boundary === "start" ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`,
  )

  if (!Number.isFinite(timestamp)) return undefined
  return new Date(timestamp)
}

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date)
}

function formatDateTime(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return "—"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed))
}

function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function buildDayKeys({ days, from, to }: { days: number; from?: Date; to?: Date }): string[] {
  const keys: string[] = []

  if (from && to) {
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))

    while (cursor.getTime() <= end.getTime()) {
      keys.push(isoDateKey(cursor))
      cursor = addUtcDays(cursor, 1)
    }

    return keys
  }

  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  for (let index = days - 1; index >= 0; index -= 1) {
    keys.push(isoDateKey(addUtcDays(todayUtc, -index)))
  }

  return keys
}

function cacheRate(input: number, cacheRead: number): number {
  const total = input + cacheRead
  if (total <= 0) return 0
  return (cacheRead / total) * 100
}

export function buildDashboardHref({
  path,
  provider,
  days,
  from,
  to,
}: {
  path: string
  provider: DashboardProviderFilter
  days?: number
  from?: string
  to?: string
}): string {
  const search = new URLSearchParams()

  if (provider !== "all") search.set("provider", provider)

  if (from && to) {
    search.set("from", from)
    search.set("to", to)
  } else if (days && days !== DEFAULT_WINDOW_DAYS) {
    search.set("days", String(days))
  }

  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export async function getDashboardData(searchParamsInput: DashboardSearchParamsInput): Promise<DashboardData> {
  const resolvedSearchParams =
    searchParamsInput instanceof Promise ? await searchParamsInput : searchParamsInput ?? {}

  const selectedProviderFilter = normalizeProviderFilter(firstQueryValue(resolvedSearchParams.provider))
  const fromQueryValue = firstQueryValue(resolvedSearchParams.from)
  const toQueryValue = firstQueryValue(resolvedSearchParams.to)
  const selectedDays = normalizeWindowDays(firstQueryValue(resolvedSearchParams.days))

  let customFrom = parseDateInput(fromQueryValue, "start")
  let customTo = parseDateInput(toQueryValue, "end")

  if (customFrom && customTo && customFrom.getTime() > customTo.getTime()) {
    const swappedFrom = customTo
    const swappedTo = customFrom
    customFrom = swappedFrom
    customTo = swappedTo
  }

  const customWindow = customFrom && customTo ? { from: customFrom, to: customTo } : null

  const providers: ProviderName[] | undefined =
    selectedProviderFilter === "all" ? undefined : [selectedProviderFilter]

  const result = await ingestAgentSessions(
    customWindow
      ? { from: customWindow.from, to: customWindow.to, providers }
      : { days: selectedDays, providers },
  )

  const activeWindowQuery = customWindow
    ? { from: dateInputValue(customWindow.from), to: dateInputValue(customWindow.to) }
    : { days: selectedDays }

  const fromInput = customWindow ? dateInputValue(customWindow.from) : (fromQueryValue ?? "")
  const toInput = customWindow ? dateInputValue(customWindow.to) : (toQueryValue ?? "")

  const sessions = result.projects
    .flatMap((project) =>
      project.sessions.map((session) => ({
        id: session.id,
        provider: session.provider,
        projectId: project.id,
        projectLabel: project.label,
        endedAt: session.endedAt,
        turns: session.turns.length,
        invocations: session.turns.reduce((sum, turn) => sum + turn.invocations.length, 0),
        tools: session.turns.reduce((sum, turn) => sum + turn.toolCalls.length, 0),
        cost: session.observed.cost.total,
        totalTokens: session.observed.totalTokens,
        inputTokens: session.observed.input,
        outputTokens: session.observed.output,
        cacheTokens: session.observed.cacheRead + session.observed.cacheWrite,
      })),
    )
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))

  const recentSessionRows: DashboardSessionRow[] = sessions.map((session) => ({
    id: session.id,
    provider: session.provider,
    projectId: session.projectId,
    projectName: session.projectLabel || basename(session.projectId),
    turns: session.turns,
    invocations: session.invocations,
    tools: session.tools,
    totalTokens: session.totalTokens,
    cost: session.cost,
    endedAt: session.endedAt,
    endedAtLabel: formatDateTime(session.endedAt),
  }))

  const providerSessionCounts = sessions.reduce(
    (acc, session) => {
      acc[session.provider] = (acc[session.provider] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const projectRows: DashboardProjectRow[] = result.projects.map((project) => {
    const turns = project.sessions.reduce((sum, session) => sum + session.turns.length, 0)
    const invocations = project.sessions.reduce(
      (sum, session) => sum + session.turns.reduce((inner, turn) => inner + turn.invocations.length, 0),
      0,
    )

    return {
      id: project.id,
      label: project.label,
      sessions: project.sessions.length,
      turns,
      invocations,
      tokens: project.observed.totalTokens,
      cost: project.observed.cost.total,
      cacheRate: cacheRate(project.observed.input, project.observed.cacheRead),
    }
  })

  const toolMap = new Map<
    string,
    { calls: number; errors: number; latencyTotalMs: number; latencySamples: number }
  >()

  for (const project of result.projects) {
    for (const session of project.sessions) {
      for (const turn of session.turns) {
        for (const toolCall of turn.toolCalls) {
          const key = toolCall.normalizedName
          const existing = toolMap.get(key) ?? {
            calls: 0,
            errors: 0,
            latencyTotalMs: 0,
            latencySamples: 0,
          }

          existing.calls += 1
          if (toolCall.outcome === "error") existing.errors += 1
          if (typeof toolCall.latencyMs === "number") {
            existing.latencyTotalMs += toolCall.latencyMs
            existing.latencySamples += 1
          }

          toolMap.set(key, existing)
        }
      }
    }
  }

  const topTools: DashboardToolRow[] = [...toolMap.entries()]
    .map(([name, stats]) => ({
      name,
      calls: stats.calls,
      errors: stats.errors,
      avgLatencyMs:
        stats.latencySamples > 0 ? Math.round(stats.latencyTotalMs / stats.latencySamples) : null,
    }))
    .sort((a, b) => b.calls - a.calls)

  const dailySpendBuckets = new Map<string, number>()
  const dailyInputBuckets = new Map<string, number>()
  const dailyOutputBuckets = new Map<string, number>()
  const dailyCacheBuckets = new Map<string, number>()
  const dayKeys = buildDayKeys({
    days: selectedDays,
    from: customWindow?.from,
    to: customWindow?.to,
  })

  for (const key of dayKeys) {
    dailySpendBuckets.set(key, 0)
    dailyInputBuckets.set(key, 0)
    dailyOutputBuckets.set(key, 0)
    dailyCacheBuckets.set(key, 0)
  }

  for (const session of sessions) {
    const parsed = Date.parse(session.endedAt)
    if (!Number.isFinite(parsed)) continue
    const key = isoDateKey(new Date(parsed))
    if (!dailySpendBuckets.has(key)) continue

    dailySpendBuckets.set(key, (dailySpendBuckets.get(key) ?? 0) + session.cost)
    dailyInputBuckets.set(key, (dailyInputBuckets.get(key) ?? 0) + session.inputTokens)
    dailyOutputBuckets.set(key, (dailyOutputBuckets.get(key) ?? 0) + session.outputTokens)
    dailyCacheBuckets.set(key, (dailyCacheBuckets.get(key) ?? 0) + session.cacheTokens)
  }

  const dailySeries = dayKeys.map((key) => ({
    key,
    value: dailySpendBuckets.get(key) ?? 0,
    label: formatDateOnly(new Date(`${key}T00:00:00.000Z`)),
  }))

  const dailyTokenMixSeries = dayKeys.map((key) => ({
    key,
    input: dailyInputBuckets.get(key) ?? 0,
    output: dailyOutputBuckets.get(key) ?? 0,
    cache: dailyCacheBuckets.get(key) ?? 0,
    label: formatDateOnly(new Date(`${key}T00:00:00.000Z`)),
  }))

  const tokenMixTotals = dailyTokenMixSeries.reduce(
    (acc, day) => ({
      input: acc.input + day.input,
      output: acc.output + day.output,
      cache: acc.cache + day.cache,
    }),
    { input: 0, output: 0, cache: 0 },
  )

  const projectSpendSeries = projectRows.slice(0, 8).map((project) => ({
    project: project.label,
    cost: project.cost,
    sessions: project.sessions,
  }))

  return {
    result,
    selectedProviderFilter,
    selectedDays,
    fromInput,
    toInput,
    isCustomWindow: !!customWindow,
    selectedWindowLabel: customWindow ? "Custom dates" : `Last ${selectedDays} days`,
    windowLabel: `${formatDateOnly(result.window.from)} → ${formatDateOnly(result.window.to)}`,
    activeWindowQuery,
    providerSessionCounts,
    projectRows,
    recentSessionRows,
    topTools,
    dailySeries,
    dailyTokenMixSeries,
    tokenMixTotals,
    projectSpendSeries,
    chartWindowLabel: customWindow ? "custom range" : `last ${selectedDays} days`,
    overallCacheRate: cacheRate(result.summary.observed.input, result.summary.observed.cacheRead),
  }
}

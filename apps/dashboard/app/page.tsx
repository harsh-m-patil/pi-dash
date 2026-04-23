import { basename } from "node:path"
import Link from "next/link"
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Coins,
  Database,
  RefreshCcw,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { DailySpendChart, DailyTokenMixChart, ProjectSpendChart } from "@/components/dashboard-charts"
import { ingestAgentSessions, type ProviderName } from "@/lib/pi-ingestion"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export const dynamic = "force-dynamic"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integer = new Intl.NumberFormat("en-US")

function formatCurrency(value: number): string {
  return currency.format(value || 0)
}

function formatNumber(value: number): string {
  return integer.format(Math.round(value || 0))
}

function formatDate(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return "—"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed))
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date)
}

function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function cacheRate(input: number, cacheRead: number): number {
  const total = input + cacheRead
  if (total <= 0) return 0
  return (cacheRead / total) * 100
}

type StatCardProps = {
  title: string
  value: string
  description: string
  icon: LucideIcon
  emphasis?: string
}

function StatCard({ title, value, description, icon: Icon, emphasis }: StatCardProps) {
  return (
    <Card className="border border-border/60 bg-muted/20">
      <CardHeader>
        <CardAction>
          <Icon className="size-4 text-muted-foreground" />
        </CardAction>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{description}</p>
        {emphasis ? <p className="text-xs font-medium text-foreground">{emphasis}</p> : null}
      </CardContent>
    </Card>
  )
}

type DashboardProviderFilter = "all" | ProviderName

type PageSearchParams = Record<string, string | string[] | undefined>

type PageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeProviderFilter(value: string | undefined): DashboardProviderFilter {
  if (value === "pi" || value === "claude") return value
  return "all"
}

function providerHref(providerFilter: DashboardProviderFilter): string {
  return providerFilter === "all" ? "/" : `/?provider=${providerFilter}`
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams ?? {}
  const selectedProviderFilter = normalizeProviderFilter(firstQueryValue(resolvedSearchParams.provider))

  const providers: ProviderName[] | undefined =
    selectedProviderFilter === "all" ? undefined : [selectedProviderFilter]

  const result = await ingestAgentSessions({ days: 7, providers })

  const providerFilters: Array<{ value: DashboardProviderFilter; label: string }> = [
    { value: "all", label: "All providers" },
    { value: "pi", label: "Pi" },
    { value: "claude", label: "Claude" },
  ]

  const providerLabel = selectedProviderFilter === "all" ? "All" : selectedProviderFilter

  const sessions = result.projects
    .flatMap((project) =>
      project.sessions.map((session) => ({
        id: session.id,
        provider: session.provider,
        projectId: project.id,
        projectLabel: project.label,
        startedAt: session.startedAt,
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

  const providerSessionCounts = sessions.reduce(
    (acc, session) => {
      acc[session.provider] = (acc[session.provider] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const projectRows = result.projects.map((project) => {
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

  const topTools = [...toolMap.entries()]
    .map(([name, stats]) => ({
      name,
      calls: stats.calls,
      errors: stats.errors,
      avgLatencyMs:
        stats.latencySamples > 0 ? Math.round(stats.latencyTotalMs / stats.latencySamples) : null,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 12)

  const dailySpendBuckets = new Map<string, number>()
  const dailyInputBuckets = new Map<string, number>()
  const dailyOutputBuckets = new Map<string, number>()
  const dailyCacheBuckets = new Map<string, number>()
  const dayKeys: string[] = []
  const now = new Date()
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - index)
    const key = isoDateKey(date)
    dayKeys.push(key)
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

  const windowLabel = `${formatDateOnly(result.window.from)} → ${formatDateOnly(result.window.to)}`
  const overallCacheRate = cacheRate(result.summary.observed.input, result.summary.observed.cacheRead)

  return (
    <main className="min-h-svh">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:py-12">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Agent Dashboard</Badge>
              <Badge variant="secondary">Default window: 7 days</Badge>
              <Badge variant="outline">Provider: {providerLabel}</Badge>
              <Badge variant="outline">{windowLabel}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Local-first session analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Aggregated from <code>~/.pi/agent/sessions</code> and <code>~/.claude/projects</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {Object.entries(providerSessionCounts).map(([provider, count]) => (
              <Badge key={provider} variant="outline" className="capitalize">
                {provider}: {count}
              </Badge>
            ))}
            <div className="flex flex-wrap items-center gap-1">
              {providerFilters.map((providerFilter) => (
                <Button
                  key={providerFilter.value}
                  variant={providerFilter.value === selectedProviderFilter ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={providerHref(providerFilter.value)}>{providerFilter.label}</Link>
                </Button>
              ))}
            </div>
            <Button variant="outline" asChild>
              <Link href={providerHref(selectedProviderFilter)}>
                <RefreshCcw className="size-4" /> Refresh
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Observed cost"
            value={formatCurrency(result.summary.observed.cost.total)}
            description="Input + output + cache read/write cost totals"
            icon={Coins}
            emphasis={`${result.summary.sessions} sessions in window`}
          />
          <StatCard
            title="Observed tokens"
            value={formatNumber(result.summary.observed.totalTokens)}
            description="input + output + cacheRead + cacheWrite"
            icon={Database}
            emphasis={`${formatNumber(result.summary.invocations)} invocations`}
          />
          <StatCard
            title="Turns"
            value={formatNumber(result.summary.turns)}
            description="User message through assistant stop=stop completion"
            icon={Bot}
            emphasis={`${formatNumber(result.summary.projects)} projects`}
          />
          <StatCard
            title="Cache read rate"
            value={`${overallCacheRate.toFixed(1)}%`}
            description="cacheRead / (input + cacheRead)"
            icon={Timer}
            emphasis={`${formatNumber(result.summary.observed.cacheRead)} cache-read tokens`}
          />
        </section>

        {result.summary.sessions === 0 ? (
          <Card className="border border-dashed border-border/70 bg-muted/10">
            <CardContent className="py-10">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays className="size-4" />
                  </EmptyMedia>
                  <EmptyTitle>No sessions found for this provider/window</EmptyTitle>
                  <EmptyDescription>
                    Run some Pi sessions or widen the time window, then refresh this page.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Daily spend (last 7 days)</CardTitle>
                  <CardDescription>Observed session cost trend by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <DailySpendChart data={dailySeries} />
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Daily token mix (last 7 days)</CardTitle>
                  <CardDescription>Stacked input vs output vs cache tokens by day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1">
                      <span className="size-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Input</span>
                      <span className="font-mono text-blue-700 dark:text-blue-300">
                        {formatNumber(tokenMixTotals.input)}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1">
                      <span className="size-2 rounded-full bg-violet-500" />
                      <span className="text-muted-foreground">Output</span>
                      <span className="font-mono text-violet-700 dark:text-violet-300">
                        {formatNumber(tokenMixTotals.output)}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">Cache</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300">
                        {formatNumber(tokenMixTotals.cache)}
                      </span>
                    </div>
                  </div>
                  <DailyTokenMixChart data={dailyTokenMixSeries} />
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Project spend share</CardTitle>
                  <CardDescription>Top projects by observed cost in the selected window</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectSpendChart data={projectSpendSeries} />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <Card className="border border-border/60 xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Projects</CardTitle>
                  <CardDescription>Canonical project ID is full cwd, label is basename</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Turns</TableHead>
                        <TableHead className="text-right">Invocations</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cache</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectRows.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="max-w-[280px] truncate font-medium" title={project.id}>
                                {project.label}
                              </p>
                              <p className="max-w-[320px] truncate text-xs text-muted-foreground" title={project.id}>
                                {project.id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{project.sessions}</TableCell>
                          <TableCell className="text-right font-mono">{project.turns}</TableCell>
                          <TableCell className="text-right font-mono">{project.invocations}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(project.tokens)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {project.cacheRate.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(project.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Top tools</CardTitle>
                  <CardDescription>Tool calls extracted from assistant content blocks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topTools.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tool calls recorded in this window.</p>
                  ) : (
                    topTools.map((tool) => (
                      <div key={tool.name} className="rounded-lg border border-border/60 p-2.5">
                        <div className="flex items-center justify-between">
                          <p className="flex items-center gap-1.5 font-medium">
                            <Wrench className="size-3.5 text-muted-foreground" />
                            {tool.name}
                          </p>
                          <Badge variant="outline">{tool.calls} calls</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Errors: {tool.errors}</span>
                          <span>
                            Avg latency: {tool.avgLatencyMs !== null ? `${tool.avgLatencyMs}ms` : "—"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Recent sessions</CardTitle>
                  <CardDescription>Most recently completed sessions in the selected time window</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Turns</TableHead>
                        <TableHead className="text-right">Invocations</TableHead>
                        <TableHead className="text-right">Tools</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Ended</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.slice(0, 15).map((session) => (
                        <TableRow key={`${session.projectId}:${session.id}:${session.endedAt}`}>
                          <TableCell className="font-mono text-xs">{session.id.slice(0, 12)}…</TableCell>
                          <TableCell>{session.projectLabel || basename(session.projectId)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {session.provider}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{session.turns}</TableCell>
                          <TableCell className="text-right font-mono">{session.invocations}</TableCell>
                          <TableCell className="text-right font-mono">{session.tools}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(session.totalTokens)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(session.cost)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatDate(session.endedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            {result.conflicts.length > 0 ? (
              <section>
                <Card className="border border-amber-500/40 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4 text-amber-400" />
                      Session ID conflicts ({result.conflicts.length})
                    </CardTitle>
                    <CardDescription>
                      Conflicted session IDs are excluded because duplicate IDs point to different file
                      content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.conflicts.map((conflict) => (
                      <div
                        key={conflict.sessionId}
                        className="rounded-lg border border-amber-400/30 bg-background/70 p-3"
                      >
                        <p className="font-mono text-xs">
                          [{conflict.provider}] {conflict.sessionId}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {conflict.files.map((file) => (
                            <li key={`${file.path}:${file.hash}`} className="truncate" title={file.path}>
                              {file.path}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

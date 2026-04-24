import { Bot, CalendarDays, Coins, Database, Timer, type LucideIcon } from "lucide-react"

import { DailySpendChart, DailyTokenMixChart, ProjectSpendChart } from "@/components/dashboard-charts"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { getDashboardData, type PageSearchParams } from "@/lib/dashboard-data"
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

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams
}

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

export default async function Page({ searchParams }: PageProps) {
  const data = await getDashboardData(searchParams)

  return (
    <DashboardPageShell
      path="/"
      title="Overview"
      description="Aggregated from ~/.pi/agent/sessions and ~/.claude/projects."
      selectedWindowLabel={data.selectedWindowLabel}
      windowLabel={data.windowLabel}
      selectedProviderFilter={data.selectedProviderFilter}
      selectedDays={data.selectedDays}
      fromInput={data.fromInput}
      toInput={data.toInput}
      isCustomWindow={data.isCustomWindow}
      providerSessionCounts={data.providerSessionCounts}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Observed cost"
          value={formatCurrency(data.result.summary.observed.cost.total)}
          description="Input + output + cache read/write cost totals"
          icon={Coins}
          emphasis={`${data.result.summary.sessions} sessions in window`}
        />
        <StatCard
          title="Observed tokens"
          value={formatNumber(data.result.summary.observed.totalTokens)}
          description="input + output + cacheRead + cacheWrite"
          icon={Database}
          emphasis={`${formatNumber(data.result.summary.invocations)} invocations`}
        />
        <StatCard
          title="Turns"
          value={formatNumber(data.result.summary.turns)}
          description="User message through assistant stop=stop completion"
          icon={Bot}
          emphasis={`${formatNumber(data.result.summary.projects)} projects`}
        />
        <StatCard
          title="Cache read rate"
          value={`${data.overallCacheRate.toFixed(1)}%`}
          description="cacheRead / (input + cacheRead)"
          icon={Timer}
          emphasis={`${formatNumber(data.result.summary.observed.cacheRead)} cache-read tokens`}
        />
      </section>

      {data.result.summary.sessions === 0 ? (
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
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Daily spend ({data.chartWindowLabel})</CardTitle>
              <CardDescription>Observed session cost trend by day</CardDescription>
            </CardHeader>
            <CardContent>
              <DailySpendChart data={data.dailySeries} />
            </CardContent>
          </Card>

          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Daily token mix ({data.chartWindowLabel})</CardTitle>
              <CardDescription>Stacked input vs output vs cache tokens by day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1">
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Input</span>
                  <span className="font-mono text-blue-700 dark:text-blue-300">
                    {formatNumber(data.tokenMixTotals.input)}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1">
                  <span className="size-2 rounded-full bg-violet-500" />
                  <span className="text-muted-foreground">Output</span>
                  <span className="font-mono text-violet-700 dark:text-violet-300">
                    {formatNumber(data.tokenMixTotals.output)}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Cache</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300">
                    {formatNumber(data.tokenMixTotals.cache)}
                  </span>
                </div>
              </div>
              <DailyTokenMixChart data={data.dailyTokenMixSeries} />
            </CardContent>
          </Card>

          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Project spend share</CardTitle>
              <CardDescription>Top projects by observed cost in the selected window</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectSpendChart data={data.projectSpendSeries} />
            </CardContent>
          </Card>
        </section>
      )}
    </DashboardPageShell>
  )
}

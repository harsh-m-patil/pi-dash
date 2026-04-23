"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

type DailyUsagePoint = {
  label: string
  value: number
}

type DailyTokenMixPoint = {
  label: string
  input: number
  output: number
  cache: number
}

type ProjectSpendPoint = {
  project: string
  cost: number
  sessions: number
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integer = new Intl.NumberFormat("en-US")

function formatCurrency(value: number): string {
  return usd.format(value || 0)
}

function formatTokens(value: number): string {
  return integer.format(Math.round(value || 0))
}

function formatTokensTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return formatTokens(value)
}

const dailyChartConfig = {
  value: {
    label: "Daily spend",
    theme: {
      light: "hsl(221 83% 53%)",
      dark: "hsl(210 100% 68%)",
    },
  },
} satisfies ChartConfig

const dailyTokenMixChartConfig = {
  input: {
    label: "Input",
    theme: {
      light: "hsl(221 83% 53%)",
      dark: "hsl(210 100% 68%)",
    },
  },
  output: {
    label: "Output",
    theme: {
      light: "hsl(265 89% 58%)",
      dark: "hsl(262 100% 74%)",
    },
  },
  cache: {
    label: "Cache",
    theme: {
      light: "hsl(160 84% 39%)",
      dark: "hsl(160 84% 56%)",
    },
  },
} satisfies ChartConfig

const projectChartConfig = {
  cost: {
    label: "Project spend",
    theme: {
      light: "hsl(160 84% 39%)",
      dark: "hsl(160 84% 56%)",
    },
  },
} satisfies ChartConfig

export function DailySpendChart({ data }: { data: DailyUsagePoint[] }) {
  if (data.length === 0) return null

  return (
    <ChartContainer config={dailyChartConfig} className="h-[240px] w-full aspect-auto">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fill-daily-spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.55} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.18} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `$${Math.round(value)}`}
          width={56}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => {
                const numeric = typeof value === "number" ? value : Number(value)
                return (
                  <span className="font-mono">{formatCurrency(Number.isFinite(numeric) ? numeric : 0)}</span>
                )
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          fill="url(#fill-daily-spend)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function DailyTokenMixChart({ data }: { data: DailyTokenMixPoint[] }) {
  if (data.length === 0) return null

  return (
    <ChartContainer config={dailyTokenMixChartConfig} className="h-[240px] w-full aspect-auto">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fill-token-input" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-input)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-input)" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="fill-token-output" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-output)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-output)" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="fill-token-cache" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-cache)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-cache)" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatTokensTick(value)}
          width={56}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => {
                const numeric = typeof value === "number" ? value : Number(value)
                return (
                  <span className="font-mono">
                    {formatTokens(Number.isFinite(numeric) ? numeric : 0)} tokens
                  </span>
                )
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="input"
          stackId="tokens"
          stroke="var(--color-input)"
          fill="url(#fill-token-input)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="output"
          stackId="tokens"
          stroke="var(--color-output)"
          fill="url(#fill-token-output)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="cache"
          stackId="tokens"
          stroke="var(--color-cache)"
          fill="url(#fill-token-cache)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function ProjectSpendChart({ data }: { data: ProjectSpendPoint[] }) {
  if (data.length === 0) return null

  return (
    <ChartContainer config={projectChartConfig} className="h-[240px] w-full aspect-auto">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="project"
          type="category"
          tickLine={false}
          axisLine={false}
          width={110}
          tickMargin={8}
          interval={0}
        />
        <XAxis type="number" dataKey="cost" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelKey="project"
              formatter={(value, _name, item) => {
                const numeric = typeof value === "number" ? value : Number(value)
                const sessions =
                  typeof item?.payload?.sessions === "number" ? item.payload.sessions : 0

                return (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{sessions} sessions</span>
                    <span className="font-mono">
                      {formatCurrency(Number.isFinite(numeric) ? numeric : 0)}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="cost"
          fill="var(--color-cost)"
          stroke="var(--color-cost)"
          fillOpacity={0.95}
          radius={5}
        />
      </BarChart>
    </ChartContainer>
  )
}

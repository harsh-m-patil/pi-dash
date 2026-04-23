import type { ComponentType } from "react"
import Link from "next/link"
import { BarChart3, DatabaseZap, FileJson } from "lucide-react"

import { HeroAgentBadges } from "@/components/hero-agent-badges"
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

type Step = {
  id: string
  title: string
  description: string
  detail: string
  Icon: ComponentType<{ className?: string }>
}

const steps: Step[] = [
  {
    id: "01",
    title: "Ingest local JSONL logs",
    description: "Load session logs from your machine without shipping data to a server.",
    detail: "Source: default local pi session files",
    Icon: FileJson,
  },
  {
    id: "02",
    title: "Normalize into sessions",
    description: "Convert raw events into stable session, turn, and usage records.",
    detail: "Model: consistent domain objects for querying",
    Icon: DatabaseZap,
  },
  {
    id: "03",
    title: "Explore trustworthy insights",
    description: "Track tokens, cache behavior, tools, and spend with clear breakdowns.",
    detail: "Views: project + time filters with granular metrics",
    Icon: BarChart3,
  },
]

export default function Page() {
  return (
    <main className="min-h-svh">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-10 md:py-16">
        <header className="flex items-center justify-between">
          <p className="font-mono text-xs text-muted-foreground">
            local-first • developer friendly • minimal surface area
          </p>
        </header>

        <section className="space-y-6">
          <div className="relative max-w-3xl py-2 md:py-8">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Analytics for your coding-agent sessions, without the noise.
            </h1>

            <HeroAgentBadges />
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Ingest local JSONL session logs and get trustworthy insight into tokens, cache
            behavior, tool activity, and spend trends.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="#overview">Explore scope</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="#overview">See how it works</Link>
            </Button>
          </div>
        </section>

        <section id="overview" className="space-y-5">
          <div className="space-y-3">
            <Badge variant="outline">How it works</Badge>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              From raw logs to actionable session analytics in 3 steps
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ id, title, description, detail, Icon }) => (
              <Card key={id} className="border border-border/60 bg-muted/20">
                <CardHeader>
                  <CardAction>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardAction>
                  <Badge variant="secondary" className="w-fit font-mono text-[10px]">
                    STEP {id}
                  </Badge>
                  <CardTitle className="mt-2">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-1 text-xs text-muted-foreground">{detail}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="border-t border-border/60 pt-6">
          <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Built for local-first coding-agent analytics.</p>
            <div className="flex items-center gap-4">
              <Link href="#overview" className="transition-colors hover:text-foreground">
                How it works
              </Link>
              <Link href="#" className="transition-colors hover:text-foreground">
                Back to top
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}

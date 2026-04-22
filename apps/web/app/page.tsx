import type { ComponentType } from "react"
import Link from "next/link"

import { HeroAgentBadges } from "@/components/hero-agent-badges"
import { Button } from "@workspace/ui/components/button"

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
              <Link href="#metrics">View metrics model</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}

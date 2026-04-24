import { Badge } from "@workspace/ui/components/badge"

import { DashboardToolbar } from "@/components/dashboard-toolbar"
import type { DashboardProviderFilter } from "@/lib/dashboard-data"

type DashboardPageShellProps = {
  path: string
  title: string
  description: string
  selectedWindowLabel: string
  windowLabel: string
  selectedProviderFilter: DashboardProviderFilter
  selectedDays: number
  fromInput: string
  toInput: string
  isCustomWindow: boolean
  providerSessionCounts: Record<string, number>
  children: React.ReactNode
}

export function DashboardPageShell({
  path,
  title,
  description,
  selectedWindowLabel,
  windowLabel,
  selectedProviderFilter,
  selectedDays,
  fromInput,
  toInput,
  isCustomWindow,
  providerSessionCounts,
  children,
}: DashboardPageShellProps) {
  const providerLabel = selectedProviderFilter === "all" ? "All" : selectedProviderFilter

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DashboardToolbar
          path={path}
          selectedProviderFilter={selectedProviderFilter}
          selectedDays={selectedDays}
          fromInput={fromInput}
          toInput={toInput}
          isCustomWindow={isCustomWindow}
          providerSessionCounts={providerSessionCounts}
        />
      </header>

      {children}
    </div>
  )
}

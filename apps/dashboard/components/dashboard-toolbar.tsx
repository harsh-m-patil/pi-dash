import Link from "next/link"
import { RefreshCcw } from "lucide-react"

import {
  buildDashboardHref,
  PROVIDER_FILTERS,
  type DashboardProviderFilter,
} from "@/lib/dashboard-data"
import { DateRangeFilter } from "@/components/date-range-filter"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

type DashboardToolbarProps = {
  path: string
  selectedProviderFilter: DashboardProviderFilter
  selectedDays: number
  fromInput: string
  toInput: string
  isCustomWindow: boolean
  providerSessionCounts: Record<string, number>
}

export function DashboardToolbar({
  path,
  selectedProviderFilter,
  selectedDays,
  fromInput,
  toInput,
  isCustomWindow,
  providerSessionCounts,
}: DashboardToolbarProps) {
  const activeWindowQuery =
    isCustomWindow && fromInput && toInput
      ? { from: fromInput, to: toInput }
      : { days: selectedDays }

  const providerHref = (providerFilter: DashboardProviderFilter): string =>
    buildDashboardHref({ path, provider: providerFilter, ...activeWindowQuery })

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {Object.entries(providerSessionCounts).map(([provider, count]) => (
        <Badge key={provider} variant="outline" className="capitalize">
          {provider}: {count}
        </Badge>
      ))}
      <div className="flex flex-wrap items-center gap-1">
        {PROVIDER_FILTERS.map((providerFilter) => (
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
      <DateRangeFilter
        basePath={path}
        currentDays={selectedDays}
        currentFrom={fromInput}
        currentTo={toInput}
        isCustom={isCustomWindow}
        provider={selectedProviderFilter}
      />
      <Button variant="outline" size="sm" asChild>
        <Link href={providerHref(selectedProviderFilter)}>
          <RefreshCcw className="size-4" /> Refresh
        </Link>
      </Button>
    </div>
  )
}

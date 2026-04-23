"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { CalendarDays, Check } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Separator } from "@workspace/ui/components/separator"

const PRESETS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
] as const

type DateRangeFilterProps = {
  currentDays: number
  currentFrom: string
  currentTo: string
  isCustom: boolean
  provider: string
}

function buildHref({
  provider,
  days,
  from,
  to,
}: {
  provider: string
  days?: number
  from?: string
  to?: string
}): string {
  const search = new URLSearchParams()
  if (provider !== "all") search.set("provider", provider)
  if (from && to) {
    search.set("from", from)
    search.set("to", to)
  } else if (days && days !== 7) {
    search.set("days", String(days))
  }
  const query = search.toString()
  return query ? `/?${query}` : "/"
}

function triggerLabel(isCustom: boolean, days: number, from: string, to: string): string {
  if (isCustom && from && to) return `${from} \u2013 ${to}`
  const preset = PRESETS.find((p) => p.value === days)
  return preset ? preset.label : `Last ${days} days`
}

export function DateRangeFilter({
  currentDays,
  currentFrom,
  currentTo,
  isCustom,
  provider,
}: DateRangeFilterProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fromDate, setFromDate] = useState(currentFrom)
  const [toDate, setToDate] = useState(currentTo)

  const handlePreset = useCallback(
    (days: number) => {
      setOpen(false)
      router.push(buildHref({ provider, days }))
    },
    [provider, router],
  )

  const handleApplyCustom = useCallback(() => {
    if (!fromDate || !toDate) return
    setOpen(false)
    router.push(buildHref({ provider, from: fromDate, to: toDate }))
  }, [provider, fromDate, toDate, router])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          {triggerLabel(isCustom, currentDays, currentFrom, currentTo)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-0">
        {/* Preset list */}
        <div className="flex flex-col py-1">
          {PRESETS.map((preset) => {
            const active = !isCustom && currentDays === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePreset(preset.value)}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              >
                <span>{preset.label}</span>
                {active && <Check className="size-3.5 text-foreground" />}
              </button>
            )
          })}
        </div>

        <Separator />

        {/* Custom range section */}
        <div className="space-y-3 p-3">
          <p className="text-xs font-medium text-muted-foreground">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={handleApplyCustom}
            disabled={!fromDate || !toDate}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

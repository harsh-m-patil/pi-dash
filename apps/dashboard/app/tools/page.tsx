import { Wrench } from "lucide-react"

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { getDashboardData, type PageSearchParams } from "@/lib/dashboard-data"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams
}

export default async function ToolsPage({ searchParams }: PageProps) {
  const data = await getDashboardData(searchParams)

  return (
    <DashboardPageShell
      path="/tools"
      title="Tools"
      description="Tool calls discovered from session logs in the selected window."
      selectedWindowLabel={data.selectedWindowLabel}
      windowLabel={data.windowLabel}
      selectedProviderFilter={data.selectedProviderFilter}
      selectedDays={data.selectedDays}
      fromInput={data.fromInput}
      toInput={data.toInput}
      isCustomWindow={data.isCustomWindow}
      providerSessionCounts={data.providerSessionCounts}
    >
      <Card className="border border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Tools ({data.topTools.length})</CardTitle>
          <CardDescription>Ordered by total calls.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.topTools.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tool calls recorded in this window.</p>
          ) : (
            data.topTools.map((tool) => (
              <div key={tool.name} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Wrench className="size-3.5 text-muted-foreground" />
                    {tool.name}
                  </p>
                  <Badge variant="outline">{tool.calls} calls</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Errors: {tool.errors}</span>
                  <span>Avg latency: {tool.avgLatencyMs !== null ? `${tool.avgLatencyMs}ms` : "—"}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

import { AlertTriangle } from "lucide-react"

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { getDashboardData, type PageSearchParams } from "@/lib/dashboard-data"
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

export default async function ConflictsPage({ searchParams }: PageProps) {
  const data = await getDashboardData(searchParams)

  return (
    <DashboardPageShell
      path="/conflicts"
      title="Conflicts"
      description="Conflicted session IDs are excluded when duplicate IDs point to different file content."
      selectedWindowLabel={data.selectedWindowLabel}
      windowLabel={data.windowLabel}
      selectedProviderFilter={data.selectedProviderFilter}
      selectedDays={data.selectedDays}
      fromInput={data.fromInput}
      toInput={data.toInput}
      isCustomWindow={data.isCustomWindow}
      providerSessionCounts={data.providerSessionCounts}
    >
      <Card className="border border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-400" />
            Session ID conflicts ({data.result.conflicts.length})
          </CardTitle>
          <CardDescription>
            Duplicate session IDs are ignored until source files are reconciled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.result.conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conflicts for this window.</p>
          ) : (
            data.result.conflicts.map((conflict) => (
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
            ))
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

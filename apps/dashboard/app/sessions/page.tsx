import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { SessionsDataTable } from "@/components/sessions-data-table"
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

export default async function SessionsPage({ searchParams }: PageProps) {
  const data = await getDashboardData(searchParams)

  return (
    <DashboardPageShell
      path="/sessions"
      title="Sessions"
      description="Most recently completed sessions in the selected time window."
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
          <CardTitle className="text-base">Recent sessions ({data.recentSessionRows.length})</CardTitle>
          <CardDescription>Sortable, filterable, paginated session breakdown.</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsDataTable data={data.recentSessionRows} />
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

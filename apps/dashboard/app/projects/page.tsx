import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { ProjectsDataTable } from "@/components/projects-data-table"
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

export default async function ProjectsPage({ searchParams }: PageProps) {
  const data = await getDashboardData(searchParams)

  return (
    <DashboardPageShell
      path="/projects"
      title="Projects"
      description="Canonical project ID is full cwd, label is basename."
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
          <CardTitle className="text-base">Projects ({data.projectRows.length})</CardTitle>
          <CardDescription>Sortable, filterable, paginated project breakdown.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectsDataTable data={data.projectRows} />
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export type ProjectTableRow = {
  id: string
  label: string
  sessions: number
  turns: number
  invocations: number
  tokens: number
  cacheRate: number
  cost: number
}

const integer = new Intl.NumberFormat("en-US")
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatNumber(value: number): string {
  return integer.format(Math.round(value || 0))
}

function formatCurrency(value: number): string {
  return usd.format(value || 0)
}

const columns: ColumnDef<ProjectTableRow>[] = [
  {
    accessorKey: "label",
    id: "project",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-2 h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Project
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    filterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase().trim()
      if (!query) return true

      return (
        row.original.label.toLowerCase().includes(query) ||
        row.original.id.toLowerCase().includes(query)
      )
    },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="max-w-[280px] truncate font-medium" title={row.original.id}>
          {row.original.label}
        </p>
        <p className="max-w-[320px] truncate text-xs text-muted-foreground" title={row.original.id}>
          {row.original.id}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "sessions",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="ml-auto h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Sessions
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{formatNumber(row.original.sessions)}</div>,
  },
  {
    accessorKey: "turns",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="ml-auto h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Turns
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{formatNumber(row.original.turns)}</div>,
  },
  {
    accessorKey: "invocations",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="ml-auto h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Invocations
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{formatNumber(row.original.invocations)}</div>,
  },
  {
    accessorKey: "tokens",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="ml-auto h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Tokens
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{formatNumber(row.original.tokens)}</div>,
  },
  {
    accessorKey: "cacheRate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="ml-auto h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Cache
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{row.original.cacheRate.toFixed(1)}%</div>,
  },
  {
    accessorKey: "cost",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="ml-auto h-8 px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Cost
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.cost)}</div>,
  },
]

export function ProjectsDataTable({ data }: { data: ProjectTableRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter projects..."
          value={(table.getColumn("project")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("project")?.setFilterValue(event.target.value)}
          className="h-8 max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">
              Columns <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No projects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{table.getFilteredRowModel().rows.length} row(s)</p>
        <div className="flex items-center gap-2">
          <p>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

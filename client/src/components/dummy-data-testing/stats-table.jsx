import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { SortableHeader } from "./sortable-header"
import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

export function StatsTable({ stats }) {
  const [sorting, setSorting] = useState([])

  const data = useMemo(() => {
    return Object.entries(stats).map(([ageGroup, data]) => ({
      age_group: ageGroup,
      participants: data.total,
      male_percentage: data.status !== "Cancelled" ? data.maleRatio : "-",
      female_percentage: data.status !== "Cancelled" ? data.femaleRatio : "-",
      status: data.status,
    }))
  }, [stats])

  const columns = [
    {
      accessorKey: "age_group",
      header: ({ column }) => <SortableHeader column={column} title="Age Group" />,
      cell: ({ row }) => <span className="font-semibold">{row.getValue("age_group")}</span>,
    },
    {
      accessorKey: "participants",
      header: ({ column }) => <SortableHeader column={column} title="Participants" />,
    },
    {
      accessorKey: "male_percentage",
      header: ({ column }) => <SortableHeader column={column} title="Male %" />,
    },
    {
      accessorKey: "female_percentage",
      header: ({ column }) => <SortableHeader column={column} title="Female %" />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} title="Status" />,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  return (
    <div className="bg-zinc-50 border-2 rounded-lg p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

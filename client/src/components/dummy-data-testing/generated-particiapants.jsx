import { useMemo, useState } from "react"
import { SortableHeader } from "./sortable-header"
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { TableWrapper } from "./table-wrapper";

function getAgeGroup(age) {
  if (age >= 20 && age <= 30) return "20-30";
  if (age >= 31 && age <= 40) return "31-40";
  if (age >= 41 && age <= 50) return "41-50";
  if (age > 50) return "50+";
  return "N/A";
}

export function GeneratedParticipantsTable({
  participants,
  highlightedParticipant,
  onParticipantClick,
}) {
  const [sorting, setSorting] = useState([])

  const columns = useMemo(
    () => [
      {
        accessorKey: "_id",
        header: ({ column }) => <SortableHeader column={column} title="ID" />,
        cell: ({ row }) => row.original._id?.substring(5) || "-",
      },
      {
        accessorKey: "first_name",
        header: ({ column }) => <SortableHeader column={column} title="First Name" />,
        cell: ({ row }) => {
            const isHighlighted = highlightedParticipant === row.original._id
            return <span className={isHighlighted ? "font-bold" : ""}>{row.getValue("first_name")}</span>
        }
      },
      {
        accessorKey: "last_name",
        header: ({ column }) => <SortableHeader column={column} title="Last Name" />,
        cell: ({ row }) => {
            const isHighlighted = highlightedParticipant === row.original._id
            return <span className={isHighlighted ? "font-bold" : ""}>{row.getValue("last_name")}</span>
        }
      },
      {
        accessorKey: "gender",
        header: ({ column }) => <SortableHeader column={column} title="Gender" />,
      },
      {
        accessorKey: "date_of_birth",
        header: ({ column }) => <SortableHeader column={column} title="DOB" />,
      },
      {
        accessorKey: "age",
        header: ({ column }) => <SortableHeader column={column} title="Age" />,
      },
      {
        id: "age_group",
        header: ({ column }) => <SortableHeader column={column} title="Age Group" />,
        accessorFn: (row) => getAgeGroup(row.age),
      },
    ],
    [highlightedParticipant]
  )

  const table = useReactTable({
    data: participants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isHighlighted = highlightedParticipant === row.original._id
            return (
              <TableRow
                key={row.id}
                className={`cursor-pointer hover:bg-gray-100 ${
                  isHighlighted ? "bg-yellow-200 dark:bg-slate-600" : ""
                }`}
                onClick={() => onParticipantClick(row.original._id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}

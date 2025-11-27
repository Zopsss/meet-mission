import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Accordion } from "./accordion";
import { SortableHeader } from "./sortable-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useMemo, useState } from "react";

export function AgeGroupTeamsTable({ teams, highlightedParticipant, onParticipantClick }) {
  return (
    <Accordion title={`Teams`} defaultOpen={true} enableBorder={false}>
      <TeamsTable
        teams={teams}
        highlightedParticipant={highlightedParticipant}
        onParticipantClick={onParticipantClick}
      />
    </Accordion>
  )
}

export function TeamsTable({ teams, highlightedParticipant, onParticipantClick, showHeader = true }) {
  const [sorting, setSorting] = useState([])

  // Member Cell Renderer
  const MemberCell = ({ member, highlightedParticipant, onParticipantClick }) => {
    if (!member) return "-"
    const fullName = `${member.first_name} ${member.last_name}`
    const isHighlighted = highlightedParticipant === member.id

    return (
      <span
        className={`cursor-pointer hover:underline ${
          isHighlighted ? "bg-yellow-200 font-bold px-1 rounded" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onParticipantClick(member.id)
        }}
      >
        {fullName} ({member.gender}, {member.age})
      </span>
    )
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "team_name",
        header: ({ column }) => <SortableHeader column={column} title="Team Name" />,
        cell: ({ row }) => <span className="font-semibold">{row.getValue("team_name")}</span>
      },
      {
        id: "member1",
        header: ({ column }) => <SortableHeader column={column} title="Member 1" />,
        // Custom accessor to allow sorting by first member's name
        accessorFn: (row) => row.members?.[0]?.first_name || "",
        cell: ({ row }) => (
          <MemberCell
            member={row.original.members?.[0]}
            highlightedParticipant={highlightedParticipant}
            onParticipantClick={onParticipantClick}
          />
        ),
      },
      {
        id: "member2",
        header: ({ column }) => <SortableHeader column={column} title="Member 2" />,
        accessorFn: (row) => row.members?.[1]?.first_name || "",
        cell: ({ row }) => (
          <MemberCell
            member={row.original.members?.[1]}
            highlightedParticipant={highlightedParticipant}
            onParticipantClick={onParticipantClick}
          />
        ),
      },
      {
        id: "member3",
        header: ({ column }) => <SortableHeader column={column} title="Member 3" />,
        accessorFn: (row) => row.members?.[2]?.first_name || "",
        cell: ({ row }) => (
          <MemberCell
            member={row.original.members?.[2]}
            highlightedParticipant={highlightedParticipant}
            onParticipantClick={onParticipantClick}
          />
        ),
      },
      {
        accessorKey: "already_registered_together",
        header: ({ column }) => <SortableHeader column={column} title="Pre-Registered" />,
        cell: ({ row }) => (row.getValue("already_registered_together") ? "Yes" : "-"),
      },
      {
        accessorKey: "age_group",
        header: ({ column }) => <SortableHeader column={column} title="Age Group" />,
      },
    ],
    [highlightedParticipant, onParticipantClick]
  )

  const table = useReactTable({
    data: teams || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  if (!teams || teams.length === 0) {
      return <p className="font-semibold text-red-500">No Teams available.</p>
  }

  return (
    <div className="bg-zinc-50 border-2 rounded-lg p-4">
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

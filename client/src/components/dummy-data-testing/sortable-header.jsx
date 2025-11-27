import { ArrowUpDown } from "lucide-react"
import { Button } from "../ui/button"

export const SortableHeader = ({ column, title }) => {
  return (
    <Button
      variant="ghost"
      className="-ml-4 h-8 data-[state=open]:bg-accent"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

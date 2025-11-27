import { useState } from "react"
import { Badge } from "../ui/badge"

export const Accordion = ({
  title,
  children,
  defaultOpen = false,
  enableBorder = false,
  modeData = null,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div
      className={`${enableBorder && "border border-gray-200 shadow-sm"} rounded-lg`}
    >
      <div
        className="flex justify-between items-center p-4 cursor-pointer rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          {modeData && isOpen && (
            <div className="flex gap-3">
              {modeData.map((badge, idx) => {
                return (
                  <Badge
                    key={idx}
                    className={
                      "px-2 py-1 rounded-xl bg-zinc-100 border-zinc-200 text-black shadow-none hover:bg-zinc-100"
                    }
                  >
                    {badge}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
        <button className="text-sm font-semibold">
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>
      {isOpen && (
        <div className="p-4 border-t border-gray-200">{children}</div>
      )}
    </div>
  )
}

import { useMemo } from "react"
import { Accordion } from "./accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Badge } from "../ui/badge"
import { MapPin } from "feather-icons-react/build/IconComponents"

export function AgeGroupRoundsTabs({
  rounds,
  teams,
  highlightedParticipant,
  onParticipantClick,
}) {
  if (!rounds) return

  // Build a lookup map: { "Team 24": { team_name, members[] } }
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.team_name, t])), [teams])

  return (
    <Accordion title={`Rounds`} defaultOpen={true} enableBorder={false}>
      <Tabs defaultValue={Object.keys(rounds)[0]}>
        <TabsList>
          {Object.entries(rounds).map(([roundNum]) => (
            <TabsTrigger key={roundNum} value={roundNum}>
              Round {roundNum}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(rounds).map(([roundNum, groups]) => (
          <TabsContent key={roundNum} value={roundNum} className="py-4">
            <div className="flex gap-4 w-full overflow-x-auto pb-2">
              {groups.map((group, idx) => {
                return (
                  <div
                    key={idx}
                    className="bg-zinc-50 dark:bg-slate-700/50 dark:border-none border-2 rounded-lg p-4 flex-1 flex flex-col justify-between min-w-[300px]"
                  >
                    <div className="border-b-2 dark:border-b dark:border-slate-200 pb-4 mb-4">
                      <div className="flex items-center justify-between ">
                        <p>
                          <strong>Group {idx + 1}</strong>
                        </p>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              "px-2 py-2 rounded-xl bg-zinc-100 border-zinc-200 dark:border-none text-black shadow-none hover:bg-zinc-100"
                            }
                          >
                            Total Participants: {group.total_participants}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center text-zinc-700 text-sm mt-1 dark:text-slate-100">
                        <span className="mr-2">
                          <MapPin size={13} />
                        </span>
                        {group.bar_name} ({group.bar_seats} seats)
                      </div>
                    </div>

                    <div className="mt-2 h-full self-start">
                      <strong>Teams & Members:</strong>
                      <ul className="mt-1 space-y-2">
                        {group.teams.map((teamName) => {
                          const team = teamMap[teamName]

                          return (
                            <li key={teamName} className="p-2">
                              <p className="font-semibold">{teamName}</p>

                              {team?.members?.length > 0 ? (
                                <ul className="ml-4 list-disc">
                                  {team.members.map((m) => {
                                    const isHighlighted =
                                      highlightedParticipant === m.id
                                    return (
                                      <li
                                        key={m.id}
                                        className={`cursor-pointer hover:underline ${
                                          isHighlighted
                                            ? "bg-yellow-200 dark:bg-slate-600 font-bold px-1 rounded"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          onParticipantClick(m.id)
                                        }
                                      >
                                        {m.first_name} {m.last_name} ({m.age}, {m.gender})
                                      </li>
                                    )
                                  })}
                                </ul>
                              ) : (
                                <p className="text-red-500 ml-4">
                                  No member data
                                </p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Accordion>
  )
}

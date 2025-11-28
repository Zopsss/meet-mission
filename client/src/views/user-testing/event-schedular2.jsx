import { useState } from "react"
import Axios from "axios"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { AgeGroupTeamsTable, TeamsTable } from "@/components/dummy-data-testing/age-group-teams"
import { AgeGroupRoundsTabs } from "@/components/dummy-data-testing/age-group-tabs"
import { Accordion } from "@/components/dummy-data-testing/accordion"
import { StatsTable } from "@/components/dummy-data-testing/stats-table"
import { GeneratedBarsTable } from "@/components/dummy-data-testing/generated-bars"
import { GeneratedParticipantsTable } from "@/components/dummy-data-testing/generated-particiapants"

// Helper: Assign numeric order to age groups for sorting
function getAgeGroupOrder(group) {
  const order = { "20-30": 1, "31-40": 2, "41-50": 3, "50+": 4 }
  return order[group] || 99
}

// --- Main Component ---
export function EventScheduler() {
  const [numParticipants, setNumParticipants] = useState("80")
  const [barInput, setBarInput] = useState({ name: "", available_spots: null })
  const [highlightedParticipant, setHighlightedParticipant] = useState(null)

  // NEW STATE for dynamic bar inputs
  const [barInputs, setBarInputs] = useState([
    { _id: 0, name: "bar1", available_spots: 12 },
    { _id: 1, name: "bar2", available_spots: 78 },
    { _id: 2, name: "bar3", available_spots: 55 },
    { _id: 3, name: "bar4", available_spots: 69 },
    { _id: 4, name: "bar5", available_spots: 98 },
    { _id: 5, name: "bar6", available_spots: 45 },
    { _id: 6, name: "bar7", available_spots: 68 },
    { _id: 7, name: "bar8", available_spots: 43 },
    { _id: 8, name: "bar9", available_spots: 89 },
    { _id: 9, name: "bar10", available_spots: 53 },
    { _id: 10, name: "bar11", available_spots: 59 },
  ])
  const [nextBarId, setNextBarId] = useState(11)

  const [apiData, setApiData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleParticipantClick = (participantId) => {
    console.log("participantId: ", participantId, highlightedParticipant)
    setHighlightedParticipant((prev) =>
      prev === participantId ? null : participantId
    )
  }

  const handleGenerateSchedule = async () => {
    setIsLoading(true)
    setError(null)
    setApiData(null)
    setHighlightedParticipant(null)

    const participants = Number(numParticipants)

    const formattedBarInputs = barInputs.map((bar) => ({
      ...bar,
      available_spots: Number(bar.available_spots),
    }))

    try {
      const res = await Axios.post("/api/test/groupAndBarsModified", {
        noOfParticipants: participants,
        bars: formattedBarInputs,
      })

      const safeGeneratedData = res.data.generatedData || {
        participants: [],
        teams: [],
        bars: [],
      }

      setApiData({
        notes: res.data.notes || [],
        summary: res.data.summary || {},
        stats: res.data.stats || {},
        generatedData: safeGeneratedData,
        allTeams: res.data.allTeams, // Ensure this exists if used
      })
    } catch (err) {
      console.error("API Error: ", err)
      setError(
        err.response?.data?.message || "An unexpected error occurred."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="w-full">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Event Configuration</h1>
          <div className="max-w-9xl w-fit mx-auto">
            <div>
              {/* --- Left Side: Inputs --- */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-start space-y-2 flex-col">
                    <Label className="font-semibold">
                      Number of Participants
                    </Label>
                    <Input
                      type="number"
                      placeholder="Number of participants"
                      value={numParticipants}
                      onChange={(e) => setNumParticipants(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-start space-y-2 flex-col">
                    <Label className="font-semibold">Bars Configuration</Label>
                    <ButtonGroup>
                      <ButtonGroup>
                        <Input
                          placeholder="bar name"
                          value={barInput.name}
                          onChange={(e) =>
                            setBarInput((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          disabled={isLoading}
                        />
                        <Input
                          type="number"
                          placeholder="bar capacity"
                          value={barInput.available_spots || ""}
                          onChange={(e) =>
                            setBarInput((prev) => ({
                              ...prev,
                              available_spots: e.target.value,
                            }))
                          }
                          disabled={isLoading}
                        />
                      </ButtonGroup>
                      <ButtonGroup>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            if (
                              barInput.name.trim() === "" ||
                              !barInput.available_spots
                            )
                              return
                            setBarInputs((prev) => [
                              ...prev,
                              { ...barInput, _id: nextBarId },
                            ])
                            setNextBarId(nextBarId + 1)
                            setBarInput({ name: "", available_spots: null })
                          }}
                        >
                          <Plus />
                        </Button>
                      </ButtonGroup>
                    </ButtonGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Bars</Label>
                  <div className="flex items-center gap-2 max-w-xl flex-wrap">
                    {barInputs.map((bar) => {
                      return (
                        <Badge
                          key={bar._id}
                          variant={"secondary"}
                          className="flex items-center gap-2 w-fit text-sm"
                        >
                          <p>
                            {bar.name} ({bar.available_spots})
                          </p>
                          <span
                            className="hover:cursor-pointer"
                            onClick={() => {
                              setBarInputs((prev) =>
                                prev.filter((currBar) => currBar._id !== bar._id)
                              )
                            }}
                          >
                            <X size={12} />
                          </span>
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <Button className="w-full" onClick={handleGenerateSchedule}>
                  {isLoading ? "Generating..." : "Generate Schedule"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6">
          {error && (
            <Card className="border-red-300 bg-red-50 p-4">
              <p className="text-red-600 text-center font-semibold">{error}</p>
            </Card>
          )}

          {isLoading && (
            <Card className="p-6">
              <p className="text-center text-lg font-semibold">
                Generating and scheduling...
              </p>
            </Card>
          )}

          {apiData && (
            <div className="space-y-6">
              {/* Notes */}
              <Card>
                <Accordion title="Scheduler Notes" defaultOpen={true}>
                  <div className="text-center space-y-1">
                    {apiData.notes.length === 0 ? (
                      <p className="p-3 bg-blue-100 dark:bg-blue-950 rounded-md text-blue-600 text-left">
                        No notes returned.
                      </p>
                    ) : (
                      apiData.notes.map((note, index) => (
                        <p
                          key={index}
                          className="p-3 bg-red-100 dark:bg-slate-950 rounded-md text-red-600 dark:text-[#cf4f43] text-left"
                        >
                          {note}
                        </p>
                      ))
                    )}
                  </div>
                </Accordion>
              </Card>

              {/* Stats */}
              <Card>
                <Accordion title="Stats" defaultOpen={true}>
                  <StatsTable stats={apiData.stats} />
                </Accordion>
              </Card>

              {/* Generated Bars */}
              <Card>
                <Accordion
                  title={`Generated Bars (${barInputs.length})`}
                  defaultOpen={true}
                >
                  <GeneratedBarsTable bars={barInputs} />
                </Accordion>
              </Card>

              {/* Generated Participants */}
              <Card>
                <Accordion
                  title={`Generated Participants (${apiData.generatedData.participants.length})`}
                  defaultOpen={false}
                >
                  <GeneratedParticipantsTable
                    participants={apiData.generatedData.participants}
                    highlightedParticipant={highlightedParticipant}
                    onParticipantClick={handleParticipantClick}
                  />
                </Accordion>
              </Card>

              {/* Generated Teams */}
              <Card>
                <Accordion
                  title={`Formed Teams (${
                    (apiData.generatedData.teams || []).length
                  })`}
                  defaultOpen={false}
                >
                  <TeamsTable
                    teams={
                      apiData.allTeams || apiData.generatedData.teams || []
                    }
                    highlightedParticipant={highlightedParticipant}
                    onParticipantClick={handleParticipantClick}
                  />
                </Accordion>
              </Card>

              {/* Age Group Summary Tables */}
              {Object.entries(apiData.summary)
                .sort(
                  ([a], [b]) => getAgeGroupOrder(a) - getAgeGroupOrder(b)
                )
                .map(([ageGroup, data]) => {
                  if (!data.rounds) return

                  return (
                    <div key={ageGroup}>
                      <Card>
                        <Accordion
                          title={`Age Group: ${ageGroup}`}
                          defaultOpen={true}
                          modeData={[
                            `${
                              Array.isArray(data.rounds[1])
                                ? data.rounds[1].length
                                : 0
                            } groups`,
                            `${data.totalParticipants} Participants`,
                            `Mode ${data.mode}`,
                          ]}
                        >
                          {!Array.isArray(data.rounds[1]) ||
                          data.rounds[1].length === 0 ? (
                            <div className="text-center text-gray-600 py-4">
                              No groups for this age group.
                            </div>
                          ) : (
                            <>
                              <AgeGroupTeamsTable
                                teams={data.teams}
                                highlightedParticipant={
                                  highlightedParticipant
                                }
                                onParticipantClick={handleParticipantClick}
                              />
                              <AgeGroupRoundsTabs
                                rounds={data.rounds}
                                teams={data.teams}
                                highlightedParticipant={
                                  highlightedParticipant
                                }
                                onParticipantClick={handleParticipantClick}
                              />
                            </>
                          )}
                        </Accordion>
                      </Card>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from "react";
import Axios from "axios";
import { Animate, Card } from 'components/lib';
import { Accordion } from "@/components/dummy-data-testing/accordion";
import { GeneratedParticipantsTable } from "@/components/dummy-data-testing/generated-particiapants";
import { Card as ShadcnCard } from "@/components/ui/card";
import { TeamsTable } from "@/components/dummy-data-testing/age-group-teams";
import { StatsTable } from "@/components/dummy-data-testing/stats-table";

export function TeamFormation() {
  const [numParticipants, setNumParticipants] = useState("75");
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedParticipant, setHighlightedParticipant] = useState(null);
  
  const handleParticipantClick = (participantId) => {
    setHighlightedParticipant((prev) =>
      prev === participantId ? null : participantId
    )
  }

  const handleCreateData = async () => {
    setIsLoading(true);
    setError(null);
    setApiData(null);

    if (!numParticipants || Number(numParticipants) < 12) {
      setError("Please enter a number of participants greater than 11.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await Axios.post("/api/test/test-formTeams", {
        noOfParticipants: Number(numParticipants),
      });

      const data = res.data;
      console.log("data: ", data);

      // Sort participants by age (ascending)
      const sortedParticipants = [...data.generaredParticipants].sort(
        (a, b) => a.age - b.age
      );

      // Sort teams by the age of their first member (ascending)
      const sortedTeams = [...data.teams].sort((a, b) => {
        const ageA = a.members?.[0]?.age ?? Infinity;
        const ageB = b.members?.[0]?.age ?? Infinity;
        return ageA - ageB;
      });

      const sortedData = {
        ...data,
        generaredParticipants: sortedParticipants,
        teams: sortedTeams,
      };

      setApiData(sortedData);
    } catch (err) {
      console.error("API Error: ", err);
      setError(err.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Animate>
      <div className="w-full">
        <Card>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-4">Team Formation Test</h1>
            <div className="flex justify-center items-center space-x-4 mb-4">
              <input
                type="number"
                value={numParticipants}
                onChange={(e) => setNumParticipants(e.target.value)}
                placeholder="Enter number of participants"
                className="border p-2 rounded w-64 dark:text-white dark:bg-gray-700"
                disabled={isLoading}
              />
              <button
                className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                onClick={handleCreateData}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Teams"}
              </button>
            </div>
            <p className="text-sm text-red-500">
              Note: These are just dummy data. Keep the number of participants high to get more random and accurate results.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          )}
        </Card>

        {apiData && (
          <>
            {/* Notes Section */}
            {apiData.notes && apiData.notes.length > 0 && (
              <Card title="Notes" className="mb-6">
                <div className="space-y-3">
                  {apiData.notes.map((note, index) => (
                    <p key={index} className="text-center">
                      {note}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* Stats Table */}
            <div className="flex flex-col gap-4 mt-4">
              <ShadcnCard>
                <Accordion title="Stats" defaultOpen={true}>
                  <StatsTable stats={apiData?.generatedData.summary} />
                </Accordion>
              </ShadcnCard>

              {/* Participants Table */}
              <ShadcnCard>
                <Accordion
                  title={`Generated Participants (${apiData.generaredParticipants.length})`}
                  defaultOpen={false}
                >
                  <GeneratedParticipantsTable
                    participants={apiData.generaredParticipants}
                    highlightedParticipant={highlightedParticipant}
                    onParticipantClick={handleParticipantClick}
                  />
                </Accordion>
              </ShadcnCard>

              {/* Teams Table */}
              <ShadcnCard>
                <Accordion
                  title={`Formed Teams (${(apiData.teams || []).length})`}
                  defaultOpen={true}
                >
                  <TeamsTable
                    teams={
                      apiData.teams || []
                    }
                    highlightedParticipant={highlightedParticipant}
                    onParticipantClick={handleParticipantClick}
                  />
                </Accordion>
            </ShadcnCard>
            </div>
          </>
        )}
      </div>
    </Animate>
  );
}

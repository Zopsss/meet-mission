import { useState } from "react";
import Axios from "axios";
import { Animate, Card, Table } from 'components/lib';

// Helper: Determine Age Group
function getAgeGroup(age) {
  if (age >= 20 && age <= 30) return "20-30";
  if (age >= 31 && age <= 40) return "31-40";
  if (age >= 41 && age <= 50) return "41-50";
  if (age > 50) return "50+";
  return "N/A";
}

// Format participants data for Table component
function formatParticipantsData(participants) {
  return participants.map((p) => ({
    id: p._id,
    _id: p._id?.substring(0, 8) + "...",
    first_name: p.first_name,
    last_name: p.last_name,
    gender: p.gender,
    date_of_birth: p.date_of_birth || "-",
    age: p.age || "-",
    age_group: getAgeGroup(p.age),
  }));
}

// Format teams data for Table component
function formatTeamsData(teams) {
  return teams.map((team) => {
    const [m1, m2, m3] = team.members;
    return {
      id: team.team_id,
      team_id: team.team_id?.substring(0, 8) + "...",
      member_1: m1
        ? `${m1.first_name} ${m1.last_name} (${m1.gender}, ${m1.age})`
        : "-",
      member_2: m2
        ? `${m2.first_name} ${m2.last_name} (${m2.gender}, ${m2.age})`
        : "-",
      member_3: m3
        ? `${m3.first_name} ${m3.last_name} (${m3.gender}, ${m3.age})`
        : "-",
      already_registered: team.already_registered_together ? "Yes" : "-",
      age_group: team.age_group,
    };
  });
}

// Format stats data for Table component
function formatStatsData(summary) {
  return Object.entries(summary).map(([ageGroup, stats]) => ({
    id: ageGroup,
    age_group: ageGroup,
    participants: stats.total,
    male_percentage: stats.status !== "Cancelled" ? stats.maleRatio : "-",
    female_percentage: stats.status !== "Cancelled" ? stats.femaleRatio : "-",
    status: stats.status,
  }));
}

export function TeamFormation() {
  const [numParticipants, setNumParticipants] = useState("75");
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
            <Card title={`Stats`} className="mb-6">
              <Table
                loading={isLoading}
                data={formatStatsData(apiData?.generatedData.summary)}
                show={["age_group", "participants", "male_percentage", "female_percentage", "status"]}
              />
            </Card>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Participants Table */}
              <Card title={`Generated Participants (${apiData.generaredParticipants.length})`}>
                <Table
                  loading={isLoading}
                  data={formatParticipantsData(apiData.generaredParticipants)}
                  show={["_id", "first_name", "last_name", "gender", "date_of_birth", "age", "age_group"]}
                />
              </Card>

              {/* Teams Table */}
              <Card title={`Formed Teams (${apiData.teams.length})`}>
                <Table
                  loading={isLoading}
                  data={formatTeamsData(apiData.teams)}
                  show={["team_id", "member_1", "member_2", "member_3", "already_registered", "age_group"]}
                />
              </Card>
            </div>
          </>
        )}
      </div>
    </Animate>
  );
}

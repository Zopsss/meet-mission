import React, { useState } from "react";
import Axios from "axios";

// Helper: Determine Age Group
function getAgeGroup(age) {
  if (age >= 20 && age <= 30) return "20-30";
  if (age >= 31 && age <= 40) return "31-40";
  if (age >= 41 && age <= 50) return "41-50";
  if (age > 50) return "50+";
  return "N/A";
}

// Helper: Assign numeric order to age groups for sorting
function getAgeGroupOrder(group) {
  const order = { "20-30": 1, "31-40": 2, "41-50": 3, "50+": 4, "N/A": 5 };
  return order[group] || 99;
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
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Team Formation Test</h1>
          <div className="flex justify-center items-center space-x-4">
            <input
              type="number"
              value={numParticipants}
              onChange={(e) => setNumParticipants(e.target.value)}
              placeholder="Enter number of participants"
              className="border p-2 rounded w-64"
              disabled={isLoading}
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 ml-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
              onClick={handleCreateData}
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Generate Teams"}
            </button>
          </div>
          <h1 className="text-sm mb-4 mt-2 text-red-500">Note: These are just dummy data. Keep the number of participants high to get more random and accurate results.</h1>
        </div>

        <div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          {isLoading && <p className="text-center">Loading data...</p>}

          {apiData && (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Participants Table */}
              <div className="w-full max-w-5xl mt-6">
                {apiData.notes && apiData.notes.length > 0 && (
                  <div>
                    <h2 className="font-semibold mb-4 text-center">Notes:</h2>
                    <div className="space-y-3">
                      {apiData.notes.map((note, index) => (
                        <p key={index} className="text-center">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-xl font-semibold mt-4 mb-4 text-center">
                  Stats:
                </h2>
                <table className="divide-y divide-gray-200 border w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Age Group
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Males
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Females
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Male Ratio
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Female Ratio
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(apiData.generatedData.summary).map(
                      ([ageGroup, stats]) => (
                        <tr key={ageGroup}>
                          <td className="px-4 py-3 text-center text-sm font-semibold">
                            {ageGroup}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {stats.males}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {stats.females}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {stats.total}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-blue-600 font-mono">
                            {stats.maleRatio}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-pink-600 font-mono">
                            {stats.femaleRatio}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                <h2 className="text-xl font-semibold mt-4 mb-4 text-center">
                  Generated Participants ({apiData.generaredParticipants.length}
                  )
                </h2>
                <div className="overflow-auto max-h-[60vh] rounded flex items-center justify-center">
                  <table className="divide-y divide-gray-200 border w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Participant ID
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          First Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Last Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Gender
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Date Of Birth
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Age
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Age Group
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apiData.generaredParticipants.map((p) => (
                        <tr key={p._id}>
                          <td className="px-4 py-3 text-center text-sm font-mono">
                            {p._id?.substring(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {p.first_name}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {p.last_name}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {p.gender}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {p.date_of_birth || "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {p.age || "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {getAgeGroup(p.age)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Teams Table */}
              <div className="w-full max-w-5xl">
                <h2 className="text-xl font-semibold mb-4 mt-4 text-center">
                  Formed Teams ({apiData.teams.length})
                </h2>
                <div className="overflow-auto max-h-[60vh] border rounded">
                  <table className="divide-y divide-gray-200 w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Team ID
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Team Member 1
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Team Member 2
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Team Member 3
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Already Registered Together
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Age Group
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apiData.teams.map((team) => {
                        const [m1, m2, m3] = team.members;
                        return (
                          <tr key={team.team_id}>
                            <td className="px-4 py-3 text-center text-sm font-mono">
                              {team.team_id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {m1
                                ? `${m1.first_name} ${m1.last_name} (${m1.gender}, ${m1.age})`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {m2
                                ? `${m2.first_name} ${m2.last_name} (${m2.gender}, ${m2.age})`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {m3
                                ? `${m3.first_name} ${m3.last_name} (${m3.gender}, ${m3.age})`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {team.already_registered_together ? `Yes` : "-"}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {team.age_group}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

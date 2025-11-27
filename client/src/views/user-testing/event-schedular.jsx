import React, { useState } from "react";
import Axios from "axios";

// --- Reusable Accordion Component ---
const Accordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
      <div
        className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-xl font-bold text-gray-700">{title}</h2>
        <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
};

// Helper: Determine Age Group (from previous component)
function getAgeGroup(age) {
  if (age >= 20 && age <= 30) return "20-30";
  if (age >= 31 && age <= 40) return "31-40";
  if (age >= 41 && age <= 50) return "41-50";
  if (age > 50) return "50+";
  return "N/A";
}

// Helper: Assign numeric order to age groups for sorting
function getAgeGroupOrder(group) {
  const order = { "20-30": 1, "31-40": 2, "41-50": 3, "50+": 4 };
  return order[group] || 99;
}

// --- Main Component ---
export function EventScheduler() {
  const [numParticipants, setNumParticipants] = useState("65");

  // NEW STATE for dynamic bar inputs
  const [barInputs, setBarInputs] = useState([
    { id: 1, capacity: "20" },
    { id: 2, capacity: "25" },
    { id: 3, capacity: "18" },
    { id: 4, capacity: "22" },
  ]);
  const [nextBarId, setNextBarId] = useState(5); // To ensure unique keys

  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- NEW EVENT HANDLERS for dynamic bars ---
  const handleAddBar = () => {
    setBarInputs([...barInputs, { id: nextBarId, capacity: "20" }]);
    setNextBarId(nextBarId + 1);
  };

  const handleRemoveBar = (idToRemove) => {
    if (barInputs.length <= 2) {
      setError("You must have at least 2 bars.");
      return;
    }
    setBarInputs(barInputs.filter((bar) => bar.id !== idToRemove));
  };

  const handleBarCapacityChange = (id, newCapacity) => {
    setBarInputs(
      barInputs.map((bar) =>
        bar.id === id ? { ...bar, capacity: newCapacity } : bar
      )
    );
  };

  const handleGenerateSchedule = async () => {
    setIsLoading(true);
    setError(null);
    setApiData(null);

    const participants = Number(numParticipants);
    if (!participants || participants < 12) {
      setError("Please enter a number of participants greater than 11.");
      setIsLoading(false);
      return;
    }
    if (barInputs.length < 2) {
      setError("You must configure at least 2 bars.");
      setIsLoading(false);
      return;
    }
    // Prepare bar data for the API (remove client-side ID)
    const formattedBarInputs = barInputs.map(({ capacity }) => ({
      capacity: Number(capacity),
    }));

    try {
      const res = await Axios.post("/api/test/test-groupAndBars", {
        noOfParticipants: participants,
        bars: formattedBarInputs, // Send the new bars array
      });
      console.log("API Response: ", res.data);

      const allTeams = Object.values(res.data.report).flatMap(
        (ageGroupData) => ageGroupData.teams
      );
      const sortedParticipants = [...res.data.generatedData.participants].sort(
        (a, b) => a.age - b.age
      );
      const sortedTeams = [...allTeams].sort(
        (a, b) =>
          (a.members?.[0]?.age ?? Infinity) - (b.members?.[0]?.age ?? Infinity)
      );

      setApiData({
        ...res.data,
        generatedData: {
          ...res.data.generatedData,
          participants: sortedParticipants,
        },
        allTeams: sortedTeams,
      });
    } catch (err) {
      console.error("API Error: ", err);
      setError(err.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center bg-white p-6 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Event Scheduler & Bar Hopping Test
          </h1>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
              Event Scheduler & Bar Hopping Test
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* --- Left Side: Inputs --- */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Participants
                  </label>
                  <input
                    type="number"
                    value={numParticipants}
                    onChange={(e) => setNumParticipants(e.target.value)}
                    className="border p-2 rounded"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configure Bars & Capacities
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {barInputs.map((bar, index) => (
                      <div
                        key={bar.id}
                        className="flex items-center space-x-2 gap-4 justify-center"
                      >
                        <span className="font-semibold text-gray-600 w-16">
                          Bar {index + 1}:
                        </span>
                        <input
                          type="number"
                          value={bar.capacity}
                          onChange={(e) =>
                            handleBarCapacityChange(bar.id, e.target.value)
                          }
                          placeholder="Capacity"
                          className="border p-2 rounded"
                          disabled={isLoading}
                        />
                        <button
                          onClick={() => handleRemoveBar(bar.id)}
                          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:bg-gray-300"
                          disabled={isLoading || barInputs.length <= 2}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleAddBar}
                    className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                    disabled={isLoading}
                  >
                    + Add another bar
                  </button>
                </div>
              </div>

              {/* --- Right Side: Action Button --- */}
              <div className="text-center md:text-left pt-6">
                <button
                  className="bg-blue-600 text-white px-4 py-2 ml-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
                  onClick={handleGenerateSchedule}
                  disabled={isLoading}
                >
                  {isLoading ? "Generating..." : "Generate Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          {error && (
            <p className="text-red-600 text-center text-lg bg-red-100 p-3 rounded-md">
              {error}
            </p>
          )}
          {isLoading && (
            <p className="text-center text-lg text-indigo-600">
              Generating and scheduling, please wait...
            </p>
          )}

          {apiData && (
            <div>
              <Accordion title="Scheduler Notes" defaultOpen={true}>
                <div className="text-center text-gray-600 space-y-1">
                  {apiData.notes.map((note, index) => (
                    <p key={index}>{note}</p>
                  ))}
                </div>
              </Accordion>

              <Accordion
                title={`Generated Participants (${apiData.generatedData.participants.length})`}
              >
                <div className="overflow-auto max-h-[60vh]">
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
                      {apiData.generatedData.participants.map((p) => (
                        <tr key={p._id}>
                          <td className="px-4 py-3 text-center text-sm font-mono">
                            {p._id?.substring(5)}
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
              </Accordion>

              <Accordion title={`Formed Teams (${apiData.allTeams.length})`}>
                <div className="overflow-auto max-h-[60vh]">
                  <table className="divide-y divide-gray-200 w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Team Name
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
                          Pre-Registered
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Age Group
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apiData.allTeams.map((team) => {
                        const [m1, m2, m3] = team.members;
                        return (
                          <tr key={team.team_id}>
                            <td className="px-4 py-3 text-center text-sm font-semibold">
                              {team.team_name}
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
              </Accordion>

              <Accordion
                title={`Generated Bars (${apiData.generatedData.bars.length})`}
              >
                <div className="overflow-auto max-h-[60vh]">
                  <table className="divide-y divide-gray-200 border w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Bar ID
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Bar Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Capacity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apiData.generatedData.bars.map((bar) => (
                        <tr key={bar._id}>
                          <td className="px-4 py-3 text-center text-sm font-mono">
                            {bar._id}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold">
                            {bar.name}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {bar.available_spots}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Accordion>

              {Object.entries(apiData.report)
                .sort(
                  ([groupA], [groupB]) =>
                    getAgeGroupOrder(groupA) - getAgeGroupOrder(groupB)
                )
                .map(([ageGroup, data]) => (
                  <Accordion
                    key={ageGroup}
                    title={`Age Group Report: ${ageGroup}`}
                    defaultOpen={true}
                  >
                    <div className="bg-gray-50 p-4 rounded-md mb-4 flex items-center justify-center text-center">
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p
                          className={`font-bold text-lg ${
                            data.status === "Cancelled"
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {data.status}
                        </p>
                      </div>
                      {data.status === "Scheduled" && (
                        <>
                          <div className="ml-4 mr-4">
                            <p className="text-sm text-gray-500">Mode</p>
                            <p className="font-bold text-lg text-indigo-600">
                              {data.mode}
                            </p>
                          </div>
                          <div className="mr-4">
                            <p className="text-sm text-gray-500">Rounds</p>
                            <p className="font-bold text-lg">
                              {data.totalRounds}
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Teams</p>
                        <p className="font-bold text-lg">{data.teamCount}</p>
                      </div>
                    </div>

                    {data.status === "Scheduled" &&
                      Object.entries(data.schedule).map(
                        ([roundName, barList]) => {
                          const roundNum = parseInt(
                            roundName.replace("Round ", ""),
                            10
                          );
                          const nextRound =
                            data.schedule[`Round ${roundNum + 1}`];

                          const nextBarMap = new Map();
                          if (nextRound) {
                            for (const bar of nextRound) {
                              for (const group of bar.groups) {
                                for (const team of group.teams) {
                                  nextBarMap.set(team.team_id, bar.bar_name);
                                }
                              }
                            }
                          }

                          // ✅ --- FIX IS HERE ---
                          // Flatten all teams for the round, then sort by CURRENT BAR first.
                          const teamsInRound = barList
                            .flatMap((bar) =>
                              bar.groups.flatMap((group) =>
                                group.teams.map((team) => ({
                                  ...team,
                                  currentBar: bar.bar_name,
                                  groupName: group.group_name,
                                }))
                              )
                            )
                            .sort((a, b) => {
                              // Primary sort: by group name to group R1-G1, R1-G2 together.
                              if (a.groupName < b.groupName) return -1;
                              if (a.groupName > b.groupName) return 1;

                              // Secondary sort: by team name for stability within the group
                              return a.team_name.localeCompare(b.team_name);
                            });

                          const roundSummary = barList
                            .flatMap((bar) =>
                              bar.groups.map((group) => {
                                const participantCount = group.teams.reduce(
                                  (sum, team) => sum + team.members.length,
                                  0
                                );
                                return {
                                  groupName: group.group_name,
                                  barName: bar.bar_name,
                                  barCapacity: bar.bar_capacity,
                                  participantCount: participantCount,
                                };
                              })
                            )
                            .sort((a, b) =>
                              a.groupName.localeCompare(b.groupName)
                            );

                          return (
                            <div key={roundName} className="mt-6">
                              <h3 className="text-lg font-semibold mb-2">
                                {roundName} Schedule
                              </h3>
                              <div className="overflow-auto max-h-[60vh]">
                                <table className="divide-y divide-gray-200 border w-full">
                                  <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Team Name
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Group
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Current Bar
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Next Bar
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {teamsInRound.map((team) => (
                                      <tr key={team.team_id}>
                                        <td className="px-4 py-3 text-center text-sm font-semibold">
                                          {team.team_name}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                          {team.groupName}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                          {team.currentBar}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">
                                          {nextBarMap.get(team.team_id) ||
                                            "--- End ---"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-6">
                                <h4 className="text-md font-semibold mb-2">
                                  {roundName} Capacity Summary
                                </h4>
                                <table className="divide-y divide-gray-200 border w-full">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Group
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Total Participants
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Bar
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                        Bar Capacity
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {roundSummary.map((summary) => {
                                      const isOverCapacity =
                                        summary.participantCount >
                                        summary.barCapacity;
                                      return (
                                        <tr key={summary.groupName}>
                                          <td className="px-4 py-3 text-center text-sm font-semibold">
                                            {summary.groupName}
                                          </td>
                                          <td
                                            className={`px-4 py-3 text-center text-sm font-bold ${
                                              isOverCapacity
                                                ? "text-red-600"
                                                : ""
                                            }`}
                                          >
                                            {summary.participantCount}
                                          </td>
                                          <td className="px-4 py-3 text-center text-sm">
                                            {summary.barName}
                                          </td>
                                          <td
                                            className={`px-4 py-3 text-center text-sm font-bold ${
                                              isOverCapacity
                                                ? "text-red-600"
                                                : ""
                                            }`}
                                          >
                                            {summary.barCapacity}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        }
                      )}
                  </Accordion>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

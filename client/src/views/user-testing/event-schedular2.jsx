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
  const [numParticipants, setNumParticipants] = useState("80");

  // NEW STATE for dynamic bar inputs
  const [barInputs, setBarInputs] = useState([
    { id: 1, capacity: "45" },
    { id: 2, capacity: "67" },
    { id: 3, capacity: "44" },
    { id: 4, capacity: "38" },
    { id: 5, capacity: "42" },
    { id: 6, capacity: "60" },
    { id: 7, capacity: "65" },
    { id: 8, capacity: "39" },
    { id: 9, capacity: "59" },
    { id: 10, capacity: "69" },
    { id: 11, capacity: "60" },
    { id: 12, capacity: "72" },
  ]);
  const [nextBarId, setNextBarId] = useState(13); // ensure unique keys (there are 12 initial bars)

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
      // call the new endpoint
      const res = await Axios.post("/api/test/groupAndBarsModified", {
        noOfParticipants: participants,
        bars: formattedBarInputs,
      });

      // API returns: { message, notes, summary } (summary: { ageGroup: [ ... ] })
      console.log("API Response: ", res.data);

      // Build safe apiData so UI sections that expect generatedData don't crash
      const safeGeneratedData = res.data.generatedData || { participants: [], bars: [] };

      setApiData({
        notes: res.data.notes || [],
        summary: res.data.summary || {},
        stats: res.data.stats || {},
        generatedData: safeGeneratedData,
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
            <h1 className="text-red-500 mb-4 text-center">
              Keep the number of participants and bars high for better testing!
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
              Generating and scheduling...
            </p>
          )}

          {apiData && (
            <div>
              <Accordion title="Scheduler Notes" defaultOpen={true}>
                <div className="text-center text-gray-600 space-y-1">
                  {apiData.notes.length === 0 ? (
                    <p>No notes returned.</p>
                  ) : (
                    apiData.notes.map((note, index) => <p key={index}>{note}</p>)
                  )}
                </div>
              </Accordion>
              
              <Accordion title={"Stats"} defaultOpen={true}>
                <table className="divide-y divide-gray-200 border w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Age Group
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Number of Participants
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Male Percentage
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Female Percentage
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(apiData.stats).map(
                      ([ageGroup, stats]) => (
                        <tr key={ageGroup}>
                          <td className="px-4 py-3 text-center text-sm font-semibold">
                            {ageGroup}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">{stats.total}</td>
                          <td className="px-4 py-3 text-center text-sm text-blue-600 font-mono">
                            {stats.status !== "Cancelled" ? stats.maleRatio : "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-pink-600 font-mono">
                            {stats.status !== "Cancelled" ? stats.femaleRatio : "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-pink-600 font-mono">
                            {stats.status}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </Accordion>

              {/* --- Simplified Age Group Summary Tables --- */}
              {Object.entries(apiData.summary)
                .sort(([a], [b]) => getAgeGroupOrder(a) - getAgeGroupOrder(b))
                .map(([ageGroup, groups]) => (
                  <Accordion
                    key={ageGroup}
                    title={`Age Group: ${ageGroup} — ${Array.isArray(groups) ? groups.length : 0} groups`}
                    defaultOpen={true}
                  >
                    {(!Array.isArray(groups) || groups.length === 0) ? (
                      <div className="text-center text-gray-600">No groups for this age group.</div>
                    ) : (
                      <div className="overflow-auto">
                        <table className="divide-y divide-gray-200 border w-full">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Round</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Teams</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Participants</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Bar</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Seats</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groups.map((g, idx) => {
                              // If cancelled entry format from backend
                              if (g.status === "Cancelled") {
                                return (
                                  <tr key={`cancel-${idx}`}>
                                    <td colSpan={5} className="px-4 py-3 text-center text-sm text-red-600">
                                      Cancelled: {g.reason || "No reason provided"}
                                    </td>
                                  </tr>
                                );
                              }

                              const teamsText = Array.isArray(g.teams)
                                ? g.teams.join(", ")
                                : (typeof g.teams === "string" ? g.teams : "");

                              const participantsCount = g.total_participants ?? g.totalParticipants ?? 0;
                              const seats = g.bar_seats ?? g.barSeats ?? g.barCapacity ?? "N/A";
                              const barName = g.bar_name ?? g.barName ?? "-";

                              return (
                                <tr key={`${ageGroup}-${g.group_name ?? idx}`}>
                                  <td className="px-4 py-3 text-center text-sm font-semibold">
                                    {g.group_name ?? `Group ${idx + 1}`}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm">{teamsText}</td>
                                  <td className="px-4 py-3 text-center text-sm">{participantsCount}</td>
                                  <td className="px-4 py-3 text-center text-sm">{barName}</td>
                                  <td className="px-4 py-3 text-center text-sm font-semibold">{seats}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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

import React, { useState } from "react";
import Axios from "axios";
import { Card, Table, Animate } from 'components/lib';

// --- Reusable Accordion Component ---
const Accordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-4 shadow-sm">
      <div
        className="flex justify-between items-center p-4 cursor-pointer rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-xl font-bold mr-4">{title}</h2>
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

// --- Stats Table Component ---
function StatsTable({ stats }) {
  const statsData = Object.entries(stats).map(([ageGroup, data]) => ({
    age_group: ageGroup,
    participants: data.total,
    male_percentage: data.status !== "Cancelled" ? data.maleRatio : "-",
    female_percentage: data.status !== "Cancelled" ? data.femaleRatio : "-",
    status: data.status
  }));

  return (
    <Table
      data={statsData}
      show={['age_group', 'participants', 'male_percentage', 'female_percentage', 'status']}
    />
  );
}

// --- Age Group Table Component ---
function AgeGroupTable({ ageGroup, groups }) {
  const groupsData = groups.map((g, idx) => {
    if (g.status === "Cancelled") {
      return {
        round: "Cancelled",
        teams: `${g.reason || "No reason provided"}`,
        participants: "-",
        bar: "-",
        seats: "-",
        _is_cancelled: true
      };
    }

    const teamsText = Array.isArray(g.teams)
      ? g.teams.join(", ")
      : (typeof g.teams === "string" ? g.teams : "");

    const participantsCount = g.total_participants ?? g.totalParticipants ?? 0;
    const seats = g.bar_seats ?? g.barSeats ?? g.barCapacity ?? "N/A";
    const barName = g.bar_name ?? g.barName ?? "-";

    return {
      round: g.group_name ?? `Group ${idx + 1}`,
      teams: teamsText,
      participants: participantsCount,
      bar: barName,
      seats: seats
    };
  });

  return (
    <Table
      data={groupsData}
      show={['round', 'teams', 'participants', 'bar', 'seats']}
    />
  );
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
    <Animate>
      <div className="w-full">
        <Card title="Event Scheduler & Bar Hopping Test" shadow>
          <div className="max-w-7xl w-fit mx-auto">
          <div className="bg-red-100 border border-red-300 text-red-600 p-4 rounded mb-6">
            <h2 className="font-semibold mb-2">Keep the number of participants and bars high for better testing!</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start ">
            {/* --- Left Side: Inputs --- */}
            <div>
              <div className="mb-4 flex items-center space-y-2 flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-white mb-1">
                  Number of Participants
                </label>
                <input
                  type="number"
                  value={numParticipants}
                  onChange={(e) => setNumParticipants(e.target.value)}
                  className="border p-2 rounded dark:text-white dark:bg-gray-700"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-center text-gray-700 dark:text-white mb-2">
                  Configure Bars & Capacities
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {barInputs.map((bar, index) => (
                    <div
                      key={bar.id}
                      className="flex items-center space-x-2 gap-4 justify-center"
                    >
                      <span className="font-semibold text-white-600 dark:text-white w-16">
                        Bar {index + 1}:
                      </span>
                      <input
                        type="number"
                        value={bar.capacity}
                        onChange={(e) =>
                          handleBarCapacityChange(bar.id, e.target.value)
                        }
                        placeholder="Capacity"
                        className="border p-2 rounded dark:text-white dark:bg-gray-700"
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
                  className="mt-3 text-sm font-semibold text-center w-full mb-3 text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                  disabled={isLoading}
                >
                  + Add another bar
                </button>
              </div>
            </div>

            {/* --- Right Side: Action Button --- */}
            <div className="flex items-end justify-center md:justify-start">
              <button
                className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full md:w-auto"
                onClick={handleGenerateSchedule}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Schedule"}
              </button>
            </div>
          </div>
          </div>
        </Card>

        <div className="mt-6">
          {error && (
            <Card className="border-red-300 bg-red-50">
              <p className="text-red-600 text-center font-semibold">{error}</p>
            </Card>
          )}
          
          {isLoading && (
            <Card>
              <p className="text-center text-lg text-indigo-600 font-semibold">
                Generating and scheduling...
              </p>
            </Card>
          )}

          {apiData && (
            <div>
              <Card noPadding>
                <Accordion title="Scheduler Notes" defaultOpen={true}>
                    <div className="text-center text-gray-200 space-y-1">
                      {apiData.notes.length === 0 ? (
                        <p>No notes returned.</p>
                      ) : (
                        apiData.notes.map((note, index) => <p key={index}>{note}</p>)
                      )}
                    </div>
                </Accordion>
              </Card>

              <Card noPadding>
                <Accordion title="Stats" defaultOpen={true}>
                    <StatsTable stats={apiData.stats} />
                </Accordion>
              </Card>

              {/* --- Age Group Summary Tables --- */}
              {Object.entries(apiData.summary)
                .sort(([a], [b]) => getAgeGroupOrder(a) - getAgeGroupOrder(b))
                .map(([ageGroup, groups]) => (
                  <Card noPadding>
                    <Accordion
                      key={ageGroup}
                      title={`Age Group: ${ageGroup} — ${Array.isArray(groups) ? groups.length : 0} groups`}
                      defaultOpen={true}
                    >
                      {(!Array.isArray(groups) || groups.length === 0) ? (
                        <div className="text-center text-gray-600 py-4">
                          No groups for this age group.
                        </div>
                      ) : (
                        <AgeGroupTable ageGroup={ageGroup} groups={groups} />
                      )}
                    </Accordion>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </Animate>
  );
}

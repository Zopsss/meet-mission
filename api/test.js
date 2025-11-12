// test.js

const express = require("express");
const api = express.Router();

const { generateParticipantData, generateBarData } = require("../helper/testDataGenerator");
const { buildGroupsAndRoundsByAge } = require("../helper/teamHelper2");
const { formTeams } = require("../helper/finalTeamBuilder");

// --- Endpoint 1: Test Team Formation ---
api.post("/api/test/test-formTeams", (req, res) => {
  try {
    const { noOfParticipants } = req.body;
    if (!noOfParticipants || typeof noOfParticipants !== "number" || noOfParticipants < 12) {
      return res.status(400).json({ message: "Request body must include 'noOfParticipants' as a number greater than 11." });
    }

    const { participants, summary } = generateParticipantData(noOfParticipants);
    const { teams, notes } = formTeams({ participants });

    res.status(200).json({
      message: `Successfully formed ${teams.length} teams from ${participants.length} generated participants.`,
      notes: notes,
      generatedData: {
        totalParticipants: participants.length,
        preRegisteredDuos: participants.filter((p) => p.invited_user_id).length,
        summary
      },
      generaredParticipants: participants, // Corrected typo from 'generared' to 'generated'
      teams: teams,
    });
  } catch (error) {
    console.error("--- [TEST] FAILED ---", error);
    res.status(500).json({ message: "An error occurred while testing formTeams.", error: error.message });
  }
});


// --- Endpoint 2: Test Group Formation and Bar Hopping ---
api.post("/api/test/test-groupAndBars", (req, res) => {
  console.log("request came...");
  try {
    const { noOfParticipants, bars: barInputs } = req.body;

    if (
      !noOfParticipants ||
      typeof noOfParticipants !== "number" ||
      noOfParticipants < 12
    ) {
      return res.status(400).json({
        message:
          "Request body must include 'noOfParticipants' as a number greater than 11.",
      });
    }
    if (!barInputs || !Array.isArray(barInputs) || barInputs.length < 2) {
      return res.status(400).json({
        message:
          "Request body must include 'bars' as an array with at least 2 bar objects.",
      });
    }

    // Step 1: Generate participants and form teams
    const {
      participants,
      summary,
    } = generateParticipantData(noOfParticipants);
    const { teams, notes: teamNotes } = formTeams({ participants });

    // Step 2: Generate bars
    const bars = generateBarData(barInputs);
    const barMap = new Map(bars.map((b) => [b._id, b])); // Create a lookup map for bar details

    // === Step 3: Run the Main Grouping and Round Building Engine ===
    const {
      groupsAndRounds,
      notes: schedulerNotes,
      cancelledByRound,
    } = buildGroupsAndRoundsByAge(teams, bars);

    // Optional: Write raw results to a file for debugging
    // fs.writeFileSync(
    //   "result_raw.json",
    //   JSON.stringify(groupsAndRounds, null, 2)
    // );

    // === Step 4: Structure the Detailed Response ===
    const detailedReport = {};
    const allNotes = [...teamNotes, ...schedulerNotes];

    // console.log("groupsAndRounds: ", groupsAndRounds);
    // Process each age group that has a schedule
    for (const [ageGroup, rounds] of Object.entries(groupsAndRounds)) {
      const teamsInAgeGroup = teams.filter((t) => t.age_group === ageGroup);
      const participantCount = teamsInAgeGroup.reduce(
        (sum, team) => sum + team.members.length,
        0
      );

      let mode;
      if (participantCount >= 24) {
        mode = "A";
      } else if (participantCount >= 18) {
        mode = "B";
      } else {
        mode = "C";
      }

      const scheduleDetails = {};
      // Loop through each round's data ("1", "2", etc.)
      for (const [roundNum, assignments] of Object.entries(rounds)) {
        // console.log("assignemnts: ", assignments);
        // ✅ --- TRANSFORMATION LOGIC --- ✅
        // This block transforms the flat array of groups into the nested
        // bar -> groups structure that the frontend expects.
        const barsForRound = new Map();

        // 'assignments' is the flat array of groups from the core logic.
        for (const group of assignments) {
          // If we haven't seen this bar yet in this round, initialize it.
          if (!barsForRound.has(group.bar_id)) {
            const barDetails = barMap.get(group.bar_id) || {};
            barsForRound.set(group.bar_id, {
              bar_id: group.bar_id,
              bar_name: group.bar_name,
              bar_capacity: barDetails.available_spots || "N/A", // Add capacity
              groups: [], // This is the key: an array to hold groups
            });
          }

          // Get the bar object we're building.
          const currentBar = barsForRound.get(group.bar_id);

          // Add the current group to this bar's list of groups, using the old format.
          currentBar.groups.push({
            group_name: group.group_id, // Map new 'group_id' to old 'group_name'
            teams: group.teams, // Teams array is already in the correct format
          });
        }
        // Convert the Map values back to an array for the final report.
        scheduleDetails[`Round ${roundNum}`] = Array.from(
          barsForRound.values()
        );
      }

      detailedReport[ageGroup] = {
        status: "Scheduled",
        mode: mode,
        totalRounds: Object.keys(rounds).length, // More accurate count
        participantCount: participantCount,
        teamCount: teamsInAgeGroup.length,
        schedule: scheduleDetails, // Now contains the correctly formatted data
        teams: teamsInAgeGroup,
      };
    }

    // Process any age groups that were cancelled
    for (const [ageGroup, cancelInfo] of Object.entries(cancelledByRound)) {
      detailedReport[ageGroup] = {
        status: "Cancelled",
        reason: cancelInfo.reason,
        teamCount: cancelInfo.teams.length,
        teams: cancelInfo.teams,
      };
    }

    res.status(200).json({
      message: "Successfully generated and processed event schedule.",
      notes: allNotes,
      generatedData: {
        totalParticipants: participants.length,
        totalTeams: teams.length,
        bars: bars,
        participants,
        summary,
      },
      report: detailedReport,
    });
  } catch (error) {
    console.error("--- [TEST] FAILED ---", error);
    res.status(500).json({
      message: "An error occurred while testing group and bar formation.",
      error: error.message,
    });
  }
});

// --- Endpoint 3: Group and Bars (Modified Summary Version) ---
api.post("/api/test/groupAndBarsModified", (req, res) => {
  try {
    const { noOfParticipants, bars: barInputs } = req.body;

    if (!noOfParticipants || typeof noOfParticipants !== "number" || noOfParticipants < 12) {
      return res.status(400).json({
        message: "Request body must include 'noOfParticipants' as a number greater than 11.",
      });
    }
    if (!barInputs || !Array.isArray(barInputs) || barInputs.length < 2) {
      return res.status(400).json({
        message: "Request body must include 'bars' as an array with at least 2 bar objects.",
      });
    }

    // Step 1: Generate participants and form teams
    const { participants, summary } = generateParticipantData(noOfParticipants);
    const { teams, notes: teamNotes } = formTeams({ participants });

    // Step 2: Generate bars
    const bars = generateBarData(barInputs);
    const barMap = new Map(bars.map((b) => [b._id, b]));

    // Step 3: Build groups and rounds
    const { groupsAndRounds, notes: schedulerNotes, cancelledByRound } =
      buildGroupsAndRoundsByAge(teams, bars);

    // Step 4: Build simplified summary
    const simplifiedReport = {};

    for (const [ageGroup, rounds] of Object.entries(groupsAndRounds)) {
      const ageGroupSummary = [];

      for (const [roundNum, assignments] of Object.entries(rounds)) {
        for (const group of assignments) {
          const barDetails = barMap.get(group.bar_id) || {};
          const groupTeams = group.teams.map((t) => t.team_name);
          const totalParticipants = group.teams.reduce(
            (sum, team) => sum + (team.members?.length || 0),
            0
          );

          ageGroupSummary.push({
            round: `Round ${roundNum}`,
            group_name: group.group_id,
            teams: groupTeams,
            total_participants: totalParticipants,
            bar_name: group.bar_name,
            bar_seats: barDetails.available_spots || "N/A",
          });
        }
      }

      simplifiedReport[ageGroup] = ageGroupSummary;
    }

    // Handle cancelled rounds
    for (const [ageGroup, cancelInfo] of Object.entries(cancelledByRound)) {
      simplifiedReport[ageGroup] = [
        {
          status: "Cancelled",
          reason: cancelInfo.reason,
          teamCount: cancelInfo.teams.length,
          teams: cancelInfo.teams.map((t) => t.team_name),
        },
      ];
    }

    
    console.log("summary: ", summary);
    res.status(200).json({
      message: "Successfully generated simplified group and bar summary.",
      notes: [...teamNotes, ...schedulerNotes],
      summary: simplifiedReport,
      stats: summary
    });
  } catch (error) {
    console.error("--- [TEST MODIFIED] FAILED ---", error);
    res.status(500).json({
      message: "An error occurred while generating simplified summary.",
      error: error.message,
    });
  }
});


module.exports = api;

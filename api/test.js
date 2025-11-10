// test.js

const express = require("express");
const api = express.Router();

const { generateParticipantData, generateBarData } = require("../helper/testDataGenerator");
const { buildGroupsAndRoundsByAge } = require("../helper/teamHelper");
const { formTeams } = require("../helper/finalTeamBuilder");

// --- Endpoint 1: Test Team Formation ---
api.post("/api/test/test-formTeams", (req, res) => {
  try {
    const { noOfParticipants } = req.body;
    if (!noOfParticipants || typeof noOfParticipants !== "number" || noOfParticipants < 12) {
      return res.status(400).json({ message: "Request body must include 'noOfParticipants' as a number greater than 11." });
    }

    const { participants, summary, notes: cancelledNotes } = generateParticipantData(noOfParticipants);
    const { teams, notes } = formTeams({ participants });

    if (cancelledNotes.length > 0) {
      notes.unshift(...cancelledNotes);
    }

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
    try {
 const { noOfParticipants, bars: barInputs } = req.body; // Changed to 'bars'

        if (!noOfParticipants || typeof noOfParticipants !== "number" || noOfParticipants < 12) {
            return res.status(400).json({ message: "Request body must include 'noOfParticipants' as a number greater than 11." });
        }
        // New validation for the bars array
        if (!barInputs || !Array.isArray(barInputs) || barInputs.length < 2) {
            return res.status(400).json({ message: "Request body must include 'bars' as an array with at least 2 bar objects." });
        }

        // Step 1: Generate participants and form teams
        const { participants, summary, notes: cancelledNotes } = generateParticipantData(noOfParticipants);
        const { teams, notes: teamNotes } = formTeams({ participants });

        if (cancelledNotes.length > 0) {
          teamNotes.unshift(...cancelledNotes);
        }

        // Step 2: Generate bars using the new function signature
        const bars = generateBarData(barInputs);

        // === Step 4: Run the Main Scheduling Engine ===
        const { groupsAndRounds, notes: schedulerNotes, cancelledByRound } = buildGroupsAndRoundsByAge(teams, bars);
        console.log("teamsNotes: ", teamNotes);
        console.log("schedulerNotes: ", schedulerNotes);

        // === Step 5: Structure the Detailed Response ===
        const detailedReport = {};
        const allNotes = [...teamNotes, ...schedulerNotes];

        // Process each age group that has a schedule
        for (const [ageGroup, rounds] of Object.entries(groupsAndRounds)) {
            const teamsInAgeGroup = teams.filter(t => t.age_group === ageGroup);
            const teamCount = teamsInAgeGroup.length;

            let mode, totalRounds;
            if (teamCount >= 12) { mode = "A"; totalRounds = 3; }
            else if (teamCount >= 9) { mode = "B"; totalRounds = 2; }
            else { mode = "C"; totalRounds = 2; }

            const roundDetails = {};
            for (const [roundNum, barList] of Object.entries(rounds)) {
                let groupCounter = 1; // Initialize a counter for each round.

                roundDetails[`Round ${roundNum}`] = barList.map(bar => {
                    const barDetails = bars.find(b => b._id === bar.bar_id) || {};
                    return {
                        bar_id: bar.bar_id,
                        bar_name: barDetails.name,
                        bar_capacity: barDetails.available_spots,
                        groups: bar.groups.map((group) => { // Removed the 'index' from here
                            const groupName = `R${roundNum}-G${groupCounter++}`; // Use and increment the round-wide counter
                            return {
                                group_name: groupName,
                                teams: group.map(team => ({
                                    team_id: team.team_id,
                                    team_name: team.team_name,
                                    members: team.members,
                                }))
                            };
                        })
                    };
                });
            }

            detailedReport[ageGroup] = {
                status: "Scheduled",
                mode: mode,
                totalRounds: totalRounds,
                teamCount: teamCount,
                teams: teamsInAgeGroup,
                schedule: roundDetails,
            };
        }

        // Process any age groups that were cancelled
        for (const [ageGroup, cancelledData] of Object.entries(cancelledByRound)) {
             if (cancelledData.all && cancelledData.all.length > 0) {
                const teamsInAgeGroup = teams.filter(t => t.age_group === ageGroup);
                detailedReport[ageGroup] = {
                    status: "Cancelled",
                    reason: "Too few teams to schedule.",
                    teamCount: teamsInAgeGroup.length,
                    teams: teamsInAgeGroup,
                };
             }
        }

        res.status(200).json({
            message: "Successfully generated and processed event schedule.",
            notes: allNotes,
            generatedData: {
                participants: participants,
                bars: bars,
                summary
            },
            report: detailedReport,
        });

    } catch (error) {
        console.error("--- [TEST] FAILED ---", error);
        res.status(500).json({ message: "An error occurred while testing group and bar formation.", error: error.message });
    }
});


module.exports = api;

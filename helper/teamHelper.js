function buildGroupsAndRounds(allTeams, allBars = []) {
  const groupsAndRounds = {};
  const notes = [];
  const cancelledByRound = {};

  const byAge = new Map();
  for (const t of allTeams) {
    if (!byAge.has(t.age_group)) byAge.set(t.age_group, []);
    byAge.get(t.age_group).push(t);
  }

  for (const [age_group, teams] of byAge.entries()) {
    groupsAndRounds[age_group] = {};
    cancelledByRound[age_group] = {};

    const teamCount = teams.length;
    notes.push(`ℹ️ ${age_group}: ${teamCount} teams detected.`);

    if (teamCount < 6) {
      notes.push(`❌ Event canceled for ${age_group} (<6 teams).`);
      cancelledByRound[age_group]["all"] = teams.map(t => ({
        ...t,
        reason: "Too few teams"
      }));
      continue;
    }

    // auto mode
    let mode, rounds;
    if (teamCount >= 12) {
      mode = "A"; rounds = 3;
    } else if (teamCount >= 9) {
      mode = "B"; rounds = 2;
    } else {
      mode = "C"; rounds = 2;
    }
    notes.push(`✅ ${age_group}: Mode ${mode}, ${rounds} rounds.`);

    // use the renamed low-level scheduler
    const schedResult = scheduleRoundsForAgeGroup(teams, rounds, allBars, mode);

    groupsAndRounds[age_group] = schedResult.groupsByRound || {};
    if (schedResult.notes) notes.push(...schedResult.notes);
  }

  return { groupsAndRounds, notes, cancelledByRound };
}

// 🔹 Low-level scheduler (handles bar rotation + groups)
function scheduleRoundsForAgeGroup(teams, rounds, bars, mode) {
  const pairHistory = new Set(); // track all pairings across rounds
  const result = { success: true, groupsByRound: {} };

  // Round 1 → distribute evenly into bars
  let barAssignments = distributeToBars(teams, bars);

  for (let r = 0; r < rounds; r++) {
    if (r === 0) {
      // Round 1 already distributed
    } else if (mode === "A" && r === 2) {
      // Round 3: stay in the same bar but reshuffle groups
      barAssignments = stayInSameBars(barAssignments);
    } else {
      // Round 2 (or Mode B/C) → rotate bars
      barAssignments = rotateBars(barAssignments, bars, mode, r);
    }

    let groupsForRound = [];
    for (const bar of bars) {
      const barTeams = barAssignments[bar._id] || [];

      // Shuffle teams inside the bar to create new matchups
      const shuffledTeams = shuffle(barTeams);

      let barGroups = splitIntoGroups(shuffledTeams, 3, 5);

      // Ensure no duplicate encounters (tries hard, but won’t cancel)
      barGroups = resolveDuplicates(barGroups, pairHistory, r + 1);

      groupsForRound.push({
        bar_id: bar._id,
        groups: barGroups
      });
    }

    result.groupsByRound[r + 1] = groupsForRound;
  }

  return result;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}


// ---- Helper Functions ----

// distribute evenly across bars
function distributeToBars(teams, bars) {
  let assignments = {};
  bars.forEach(b => (assignments[b._id] = []));

  // step 1: give each bar 1 team if enough
  let shuffled = shuffle([...teams]);
  bars.forEach((bar, i) => {
    if (shuffled.length > 0) {
      assignments[bar._id].push(shuffled.shift());
    }
  });

  // step 2: distribute the rest evenly
  shuffled.forEach((t, i) => {
    assignments[bars[i % bars.length]._id].push(t);
  });

  return assignments;
}

// simple rotation: A->B, B->C, C->A
function rotateBars(prevAssignments, bars, mode, roundNum) {
  let newAssignments = {};
  bars.forEach(b => (newAssignments[b._id] = []));

  bars.forEach((bar, i) => {
    const nextBar = bars[(i + 1) % bars.length];
    prevAssignments[bar._id].forEach(team => {
      newAssignments[nextBar._id].push(team);
    });
  });

  return newAssignments;
}

// mode A round 3: stay in same bar
function stayInSameBars(prevAssignments) {
  return JSON.parse(JSON.stringify(prevAssignments));
}

// split into groups of 3–5
function splitIntoGroups(teams, minSize = 3, maxSize = 5) {
  const groups = [];
  let shuffled = shuffle([...teams]);
  while (shuffled.length > 0) {
    let size = Math.min(maxSize, Math.max(minSize, Math.floor(shuffled.length / 2)));
    groups.push(shuffled.splice(0, size));
  }
  return groups;
}
function resolveDuplicates(groups, pairHistory, roundNumber) {
  const hasDuplicate = (group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = [group[i].team_id, group[j].team_id].sort().join("-");
        if (pairHistory.has(key)) return true; // seen before in ANY round
      }
    }
    return false;
  };

  // try up to 200 reshuffles to avoid repeats
  let attempts = 0;
  while (groups.some(hasDuplicate) && attempts < 200) {
    groups = shuffle(groups.flat()).reduce((acc, team, i) => {
      const idx = Math.floor(i / 4); // target group size ~4
      if (!acc[idx]) acc[idx] = [];
      acc[idx].push(team);
      return acc;
    }, []);
    attempts++;
  }

  // mark all new pairs as seen
  for (let g of groups) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const key = [g[i].team_id, g[j].team_id].sort().join("-");
        pairHistory.add(key);
      }
    }
  }

  // if still duplicates after 200 tries → allow them, but log
  if (groups.some(hasDuplicate)) {
    console.warn(`⚠️ Duplicate unavoidable in round ${roundNumber}`);
  }

  return groups;
}

// function checkBarCapacities(groupsAndRounds, bars) {
//   const barMap = new Map(bars.map(b => [b._id, b.available_spots]));
//   const deficits = {};
//   const barMaxUsage = {}; // track peak usage details per bar

//   for (const [ageGroup, rounds] of Object.entries(groupsAndRounds)) {
//     for (const [round, barList] of Object.entries(rounds)) {
//       for (const bar of barList) {
//         // Flatten all teams across groups in this bar
//         const teams = bar.groups.flat();

//         // Count people, not teams
//         const roundCount = teams.reduce(
//           (sum, team) => sum + (team.members?.length || 0),
//           0
//         );

//         const available = barMap.get(bar.bar_id) || 0;

//         // Track max usage per bar
//         if (
//           !barMaxUsage[bar.bar_id] ||
//           roundCount > barMaxUsage[bar.bar_id].assigned
//         ) {
//           barMaxUsage[bar.bar_id] = {
//             assigned: roundCount,
//             available,
//             ageGroup,
//             round
//           };
//         }

//         console.log(
//           `Bar ${bar.bar_id}, Round ${round}, Age ${ageGroup}: ` +
//           `Available = ${available}, This Round = ${roundCount}, ` +
//           `PeakSoFar = ${barMaxUsage[bar.bar_id].assigned}`
//         );
//       }
//     }
//   }

//   // After collecting all rounds, check deficits
//   for (const [barId, peak] of Object.entries(barMaxUsage)) {
//     if (peak.assigned > peak.available) {
//       deficits[barId] = {
//         needed: peak.assigned - peak.available,
//         byRound: {
//           ageGroup: peak.ageGroup,
//           round: peak.round,
//           total: peak.assigned,
//           available: peak.available
//         }
//       };
//     }
//   }

//   return deficits;
// }
// groupsAndRounds shape: { "<age_group>": { "<round>": [ { bar_id, groups: [ [team,...], ... ] }, ... ] } }
// bars shape: [ { _id: "<barId>", available_spots: 20 }, ... ]

function checkBarCapacities(groupsAndRounds, bars) {
  // Normalize bar capacities, using string keys
  const barMap = new Map(
    bars.map(b => {
      let cap = Number(b.available_spots);
      if (Number.isNaN(cap)) cap = 0;
      return [String(b._id), cap]; // ✅ ensure string key
    })
  );

  const barRoundUsage = {};

  // 1) accumulate usage per bar per round across age groups
  for (const [ageGroup, roundsObj] of Object.entries(groupsAndRounds)) {
    for (const [roundKey, barList] of Object.entries(roundsObj || {})) {
      for (const bar of barList) {
        const barId = String(bar.bar_id); // ✅ normalize to string
        if (!barRoundUsage[barId]) barRoundUsage[barId] = {};
        if (!barRoundUsage[barId][roundKey]) {
          barRoundUsage[barId][roundKey] = { total: 0, breakdown: {} };
        }

        let roundCount = 0;
        for (const group of (bar.groups || [])) {
          for (const team of (group || [])) {
            roundCount += Array.isArray(team.members) ? team.members.length : 0;
          }
        }

        barRoundUsage[barId][roundKey].total += roundCount;
        barRoundUsage[barId][roundKey].breakdown[ageGroup] =
          (barRoundUsage[barId][roundKey].breakdown[ageGroup] || 0) + roundCount;
      }
    }
  }

  // 2) compute peak per bar and deficits
  const deficits = {};
  for (const [barId, roundsObj] of Object.entries(barRoundUsage)) {
    const available = barMap.get(barId) ?? 0;
    let peakTotal = 0;
    let peakRoundKey = null;
    let peakBreakdown = null;

    for (const [roundKey, info] of Object.entries(roundsObj)) {
      if (info.total > peakTotal) {
        peakTotal = info.total;
        peakRoundKey = roundKey;
        peakBreakdown = info.breakdown;
      }
    }

    if (peakTotal > available) {
      deficits[barId] = {
        needed: peakTotal - available,
        peakAssigned: peakTotal,
        available,
        peakRound: peakRoundKey,
        breakdown: peakBreakdown,
        name: bars.filter((b) => String(b._id) === barId)?.[0]?.name
      };
    }
  }

  return { deficits, barRoundUsage };
}


// Optional helper: return the list of teams assigned to a given bar in a given round (with their age_group and members count)
function getTeamsForBarRound(groupsAndRounds, targetBarId, targetRound) {
  const teams = []; // { team_id, team_name, age_group, membersCount }

  for (const [ageGroup, roundsObj] of Object.entries(groupsAndRounds)) {
    const barList = (roundsObj || {})[String(targetRound)] || [];
    for (const bar of barList) {
      if (bar.bar_id !== targetBarId) continue;
      for (const group of (bar.groups || [])) {
        for (const team of (group || [])) {
          teams.push({
            team_id: team.team_id,
            team_name: team.team_name,
            age_group: ageGroup,
            membersCount: Array.isArray(team.members) ? team.members.length : 0
          });
        }
      }
    }
  }

  return teams;
}

function verifyGroups(groupsAndRounds) {
  const errors = [];
  const notes = {};

  for (const [ageGroup, rounds] of Object.entries(groupsAndRounds)) {
    const teamOpponents = new Map();

    for (const round of Object.values(rounds)) {
      // round is an array of bar objects
      for (const bar of round) {
        const groups = bar.groups || [];
        for (const group of groups) {
          const teamLabels = group.map(
            t => t?.name || t?.team_id || t?.id || "unknown"
          );

          // track opponents
          for (let i = 0; i < teamLabels.length; i++) {
            const team = teamLabels[i];
            if (!teamOpponents.has(team)) teamOpponents.set(team, new Set());

            for (let j = 0; j < teamLabels.length; j++) {
              if (i === j) continue;
              teamOpponents.get(team).add(teamLabels[j]);
            }
          }
        }
      }
    }

    // summarize
    const oppCounts = Array.from(teamOpponents.values()).map(s => s.size);
    const avg = oppCounts.reduce((a, b) => a + b, 0) / (oppCounts.length || 1);

    notes[ageGroup] = {
      totalTeams: oppCounts.length,
      avgOpponents: avg,
      minOpponents: Math.min(...oppCounts),
      maxOpponents: Math.max(...oppCounts),
    };

    let expected = Math.round(avg);
    for (const [team, oppSet] of teamOpponents.entries()) {
      if (oppSet.size !== expected) {
        errors.push(
          `Age group ${ageGroup}: Team ${team} has ${oppSet.size} unique opponents (expected ~${expected})`
        );
      }
    }
  }

  return { errors, notes };
}


function dedupeBalanceReport(report) {
  const result = {};

  for (let i = 0; i < report.length; i++) {
    const { age_group, team, unique_opponents } = report[i];
    const key = age_group + "-" + team;

    if (!result[key]) {
      result[key] = { age_group, team, unique_opponents: {} };
    }

    for (let j = 0; j < unique_opponents.length; j++) {
      result[key].unique_opponents[unique_opponents[j]] = true;
    }
  }

  return Object.values(result).map(r => ({
    age_group: r.age_group,
    team: r.team,
    unique_opponents: Object.keys(r.unique_opponents),
  }));
}


module.exports = {
    buildGroupsAndRoundsByAge: buildGroupsAndRounds,
    verifyGroups,
    dedupeBalanceReport,
    checkBarCapacities
  };
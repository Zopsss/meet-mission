/**
 * Main function to generate the group and bar-hopping plan for all age groups.
 *
 * When the distribution is uneven, for example: [4,4,3,3]
 * In such cases, duplicate pairs can appear. It is unavoidable.
 */
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
    const teamCount = teams.length;
    const participantCount = getParticipantCount(teams);

    // Cancellation Check 1: Not enough teams to form valid groups.
    if (teamCount < 6) {
      notes.push(
        `❌ Event canceled for ${age_group}: Too few teams (${teamCount} < 6).`
      );
      cancelledByRound[age_group] = {
        reason: "Not enough participants to form a valid event.",
        teams: teams,
      };
      continue;
    }

    // Determine Mode and Rounds based on PARTICIPANT count.
    let mode, rounds;
    if (participantCount >= 24) {
      mode = "A";
      rounds = 3;
    } else if (participantCount >= 18) {
      mode = "B";
      rounds = 2;
    } else {
      mode = "C";
      rounds = 2;
    }

    // Step 1: Calculate the ideal group structure.
    const distributionResult = calculateGroupDistribution(
      teamCount,
      teams,
      mode
    );

    // if (mode === "A") {
    console.log("distributionResult: ", distributionResult);
    console.log("teams: ", teams.length);
    // }

    if (distributionResult.error) {
      notes.push(
        `❌ Event canceled for ${age_group}: ${distributionResult.error}`
      );
      cancelledByRound[age_group] = {
        reason: distributionResult.error,
        teams: teams,
      };
      continue;
    }

    const { distribution } = distributionResult;

    // Step 2: Build Round 1 by assigning teams to bars.
    const round1Result = assignTeamsToBarsForRound1(
      teams,
      allBars,
      distribution
    );

    if (round1Result.error) {
      notes.push(`❌ Event canceled for ${age_group}: ${round1Result.error}`);
      cancelledByRound[age_group] = {
        reason: round1Result.error,
        teams: teams,
      };
      continue;
    }

    const round1Assignments = round1Result.roundAssignments;

    // Initialize team bar history tracking (NEW)
    const teamBarHistory = new Map();
    for (const group of round1Assignments) {
      for (const team of group.teams) {
        teamBarHistory.set(team.team_id, [group.bar_id]);
      }
    }

    const pairHistory = new Set();
    updatePairHistoryFromRound(round1Assignments, pairHistory);

    groupsAndRounds[age_group] = {
      1: round1Assignments,
    };

    if (rounds >= 2) {
      const round2Result = buildRound2(
        teams,
        allBars,
        round1Assignments,
        pairHistory,
        mode,
        distribution,
<<<<<<< Updated upstream
        teamBarHistory
=======
        teamBarHistory,
        barCapacityTracker,
        age_group
>>>>>>> Stashed changes
      );

      if (round2Result.error) {
        notes.push(`❌ ${age_group}: Round 2 failed - ${round2Result.error}`);
        cancelledByRound[age_group] = {
          reason: round2Result.error,
          teams: teams,
        };
        continue;
      }

      // Update pair history and bar history with Round 2
      updatePairHistoryFromRound(round2Result.roundAssignments, pairHistory);
      updateTeamBarHistory(round2Result.roundAssignments, teamBarHistory);
      notes.push(...round2Result.notes);

      groupsAndRounds[age_group][2] = round2Result.roundAssignments;
      const round2Assignments = round2Result.roundAssignments;

      if (mode === "A" && rounds === 3) {
        const round3Result = buildRound3ModeA(
          teams,
          allBars,
          round1Assignments,
          round2Assignments,
          pairHistory,
          teamBarHistory,
<<<<<<< Updated upstream
          notes
=======
          notes,
          barCapacityTracker,
          age_group
>>>>>>> Stashed changes
        );

        if (round3Result.error) {
          notes.push(`❌ ${age_group}: Round 3 failed - ${round3Result.error}`);
        } else {
          updatePairHistoryFromRound(
            round3Result.roundAssignments,
            pairHistory
          );
          updateTeamBarHistory(round3Result.roundAssignments, teamBarHistory);

          // Validate all sequences (NEW)
          const sequenceValidation = validateAllTeamSequences(
            teamBarHistory,
            mode
          );
          if (!sequenceValidation.valid) {
            notes.push(
              `⚠️ ${age_group}: Sequence validation warning - ${sequenceValidation.error}`
            );
          }

          groupsAndRounds[age_group][3] = round3Result.roundAssignments;
        }
      }
    }

    // Final validation for 2-round events
    if (rounds === 2) {
      const sequenceValidation = validateAllTeamSequences(teamBarHistory, mode);
      if (!sequenceValidation.valid) {
        notes.push(
          `⚠️ ${age_group}: Sequence validation warning - ${sequenceValidation.error}`
        );
      }
    }
  }

  return { groupsAndRounds, notes, cancelledByRound };
}

// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

// Helper to count total participants from a list of teams.
const getParticipantCount = (teams) =>
  teams.reduce((sum, team) => sum + team.members.length, 0);

function calculateGroupDistribution(totalTeams, teams = null, mode = null) {
  if (totalTeams < 6) {
    return { error: "Not enough teams to form valid groups." };
  }

  if (mode === "C") {
    const noOfParticipants = getParticipantCount(teams);

    switch (noOfParticipants) {
      case 12:
        return { numberOfGroups: 2, distribution: [3, 3] };
      case 13:
        return { numberOfGroups: 2, distribution: [3, 3] };
      case 14:
        return { numberOfGroups: 2, distribution: [4, 3] };
      case 15:
        return { numberOfGroups: 2, distribution: [4, 3] };
      case 16:
        return { numberOfGroups: 2, distribution: [4, 4] };
      case 17:
        return { numberOfGroups: 2, distribution: [4, 4] };
      default:
        throw new Error("Invalid participants for Mode C");
    }
  }

  if (mode === "B") {
    const noOfParticipants = getParticipantCount(teams);
    console.log("totalTeams: ", noOfParticipants, typeof noOfParticipants);
    switch (noOfParticipants) {
      case 18:
        return { numberOfGroups: 3, distribution: [3, 3, 3] };
      case 19:
        return { numberOfGroups: 3, distribution: [3, 3, 3] };
      case 20:
        return { numberOfGroups: 3, distribution: [4, 3, 3] };
      case 21:
        return { numberOfGroups: 3, distribution: [4, 3, 3] };
      case 22:
        return { numberOfGroups: 3, distribution: [4, 4, 3] };
      case 23:
        return { numberOfGroups: 3, distribution: [4, 4, 3] };
      default:
        throw new Error("Invalid participants for Mode B");
    }
  }

  // ------------ Mode A logic starts here ------------
  // Mode A only applies for >= 12 teams (per PDF it's for 24+ participants -> 12+ teams).
  if (totalTeams < 12) {
    return {
      error: `Mode A requires at least 12 teams (24 participants) but was ${totalTeams}.`,
    };
  }

  // allowable groups range given team size constraints (3..5 teams per group)
  const minGroups = Math.max(4, Math.ceil(totalTeams / 5)); // ALWAYS at least 4 groups in Mode A
  const maxGroups = Math.floor(totalTeams / 3);

  if (minGroups > maxGroups) {
    return {
      error:
        "Cannot form groups that satisfy the 3-5 teams per group constraints.",
    };
  }

  // choose best n (number of groups) by scanning allowed range and picking the valid one
  // that's closest to the ideal (totalTeams / 4 groups -> target ~4 teams per group).
  const idealN = totalTeams / 4;
  let bestCandidate = null;
  let bestScore = Infinity;

  for (let n = minGroups; n <= maxGroups; n++) {
    const base = Math.floor(totalTeams / n);
    const rem = totalTeams % n;
    // sizes will be `rem` groups of base+1 and (n-rem) groups of base
    const sizes = Array.from({ length: n }, (_, i) =>
      i < rem ? base + 1 : base
    );
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    // check constraints: sizes between 3 and 5, and difference at most 1
    if (minSize >= 3 && maxSize <= 5 && maxSize - minSize <= 1) {
      // score: prefer n close to idealN. tie-breaker: prefer sizes closer to 4 (target group size).
      const score =
        Math.abs(n - idealN) + Math.abs(base + (rem > 0 ? 1 : 0) - 4) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = { n, sizes };
      }
    }
  }

  if (!bestCandidate) {
    return { error: "No valid Mode A distribution found." };
  }

  // sort distribution descending so output matches the PDF style (largest group first)
  const distribution = bestCandidate.sizes.slice().sort((a, b) => b - a);
  const numberOfGroups = distribution.length;

  return { numberOfGroups, distribution };
}

/**
 * Assigns teams to the best available bars for Round 1 based on a calculated distribution.
 */
function assignTeamsToBarsForRound1(teams, availableBars, groupDistribution) {
  const numberOfGroups = groupDistribution.length;

  if (availableBars.length < numberOfGroups) {
    return {
      error: `Not enough bars available. Need ${numberOfGroups}, but only have ${availableBars.length}.`,
    };
  }

  const sortedBars = [...availableBars].sort(
    (a, b) => b.available_spots - a.available_spots
  );
  const selectedBars = sortedBars.slice(0, numberOfGroups);
  const sortedDistribution = [...groupDistribution].sort((a, b) => b - a);

  const round1Blueprint = [];
  const teamsCopy = [...teams];

  const threePersonTeamIndex = teamsCopy.findIndex(
    (t) => t.members.length === 3
  );
  let threePersonTeam = null;
  if (threePersonTeamIndex !== -1) {
    threePersonTeam = teamsCopy.splice(threePersonTeamIndex, 1)[0];
  }

  for (let i = 0; i < numberOfGroups; i++) {
    const bar = selectedBars[i];
    const targetTeamCount = sortedDistribution[i];
    let requiredSeats = targetTeamCount * 2;

    if (i === 0 && threePersonTeam) {
      requiredSeats++;
    }

    if (bar.available_spots < requiredSeats) {
      return {
        error: `Bar capacity issue. Bar '${bar.name}' has ${bar.available_spots} spots, but a group of ${targetTeamCount} teams requires ${requiredSeats} seats.`,
      };
    }

    round1Blueprint.push({
      bar: bar,
      target_team_count: targetTeamCount,
      assigned_teams: [],
    });
  }

  if (threePersonTeam) {
    round1Blueprint[0].assigned_teams.push(threePersonTeam);
  }

  for (const group of round1Blueprint) {
    while (group.assigned_teams.length < group.target_team_count) {
      const teamToAdd = teamsCopy.pop();
      if (teamToAdd) {
        group.assigned_teams.push(teamToAdd);
      } else {
        return {
          error:
            "Mismatch between total teams and available slots in group distribution.",
        };
      }
    }
  }

  return {
    success: true,
    roundAssignments: round1Blueprint.map((group) => ({
      group_id: `Round 1`,
      bar_id: group.bar._id,
      bar_name: group.bar.name,
      teams: group.assigned_teams,
    })),
  };
}

/**
 * Builds Round 2 assignments for all modes (A, B, C)
 */
function buildRound2(
  teams,
  allBars,
  round1Assignments,
  pairHistory,
  mode,
  round1Distribution,
<<<<<<< Updated upstream
  teamBarHistory
=======
  teamBarHistory,
  barCapacityTracker,
  age_group
>>>>>>> Stashed changes
) {
  const notes = [];

  if (mode === "C") {
    return buildRound2ModeC(
      teams,
      allBars,
      round1Assignments,
      pairHistory,
      notes,
<<<<<<< Updated upstream
      teamBarHistory
=======
      teamBarHistory,
      barCapacityTracker,
      age_group
>>>>>>> Stashed changes
    );
  } else if (mode === "B") {
    return buildRound2ModeB(
      teams,
      allBars,
      round1Assignments,
      pairHistory,
      notes,
<<<<<<< Updated upstream
      teamBarHistory
=======
      teamBarHistory,
      barCapacityTracker,
      age_group
>>>>>>> Stashed changes
    );
  } else if (mode === "A") {
    return buildRound2ModeA(
      teams,
      allBars,
      round1Assignments,
      pairHistory,
      round1Distribution,
      notes,
<<<<<<< Updated upstream
      teamBarHistory
=======
      teamBarHistory,
      barCapacityTracker,
      age_group
>>>>>>> Stashed changes
    );
  }

  return { error: "Unknown mode" };
}

/**
 * Mode C Round 2: 2 groups swap bars completely, but use two NEW bars (largest & 2nd largest).
 * Behavior: take index i from both groups; if i is even -> push both teams to round2Groups[0],
 *           if i is odd  -> push both teams to round2Groups[1].
 */
function buildRound2ModeC(
  teams,
  allBars,
  round1Assignments,
  pairHistory,
  notes,
<<<<<<< Updated upstream
  teamBarHistory
=======
  teamBarHistory,
  barCapacityTracker,
  age_group
>>>>>>> Stashed changes
) {
  const group1Teams = round1Assignments[0].teams || []; // e.g., Velvet
  const group2Teams = round1Assignments[1].teams || []; // e.g., Curtain
  const bar1 = round1Assignments[0].bar_id;
  const bar2 = round1Assignments[1].bar_id;

  // get the bars which were NOT used in round 1 (preserves allBars order)
  const barsNotUsedInRound1 = allBars.filter(
    (bar) => bar._id !== bar1 && bar._id !== bar2
  );

  if (barsNotUsedInRound1.length < 2) {
    return {
<<<<<<< Updated upstream
      error: `Violation in Round 2 Mode C: Need 2 new bars but only found ${barsNotUsedInRound1.length}.`,
=======
      error: `Violation in ${age_group} age group, Round 2: Need 2 new bars with capacity but only found ${barsNotUsedInRound1.length}.`,
>>>>>>> Stashed changes
    };
  }

  const largestBar = barsNotUsedInRound1[0];
  const secondLargestBar = barsNotUsedInRound1[1];

  const cap1 = largestBar.available_spots;
  const cap2 = secondLargestBar.available_spots;

  const totalTeams = teams.length;
  if (cap1 + cap2 < totalTeams) {
    return {
<<<<<<< Updated upstream
      error: `Violation in Round 2 Mode C: Combined capacity ${
=======
      error: `Violation in ${age_group} age group, Round 2: Combined remaining capacity ${
>>>>>>> Stashed changes
        cap1 + cap2
      } of ${largestBar._id} (${largestBar.available_spots}) and ${
        secondLargestBar._id
      } (${
        secondLargestBar.available_spots
      }) is less than total teams ${totalTeams}.`,
    };
  }

  // distribution (use your existing function)
  const distributionResult = calculateGroupDistribution(totalTeams, teams, "C");
  const newDistribution = distributionResult.distribution; // [nForFirstBar, nForSecondBar]

  const round2Groups = [
    { bar_id: largestBar._id, teams: [], target_size: newDistribution[0] }, // Panda
    {
      bar_id: secondLargestBar._id,
      teams: [],
      target_size: newDistribution[1],
    }, // Cat
  ];

  // sanity capacity checks
  if (cap1 < newDistribution[0]) {
    return {
<<<<<<< Updated upstream
      error: `Violation in Round 2 Mode C: ${largestBar._id} capacity (${cap1}) < required target (${newDistribution[0]}).`,
=======
      error: `Violation in ${age_group} age group, Round 2: ${largestBar._id} remaining capacity (${cap1}) < required target (${newDistribution[0]}).`,
>>>>>>> Stashed changes
    };
  }
  if (cap2 < newDistribution[1]) {
    return {
<<<<<<< Updated upstream
      error: `Violation in Round 2 Mode C: ${secondLargestBar._id} capacity (${cap2}) < required target (${newDistribution[1]}).`,
=======
      error: `Violation in ${age_group} age group, Round 2: ${secondLargestBar._id} remaining capacity (${cap2}) < required target (${newDistribution[1]}).`,
>>>>>>> Stashed changes
    };
  }

  // iterate indices and put both group1[i] and group2[i] into either group[0] or group[1]
  const maxLen = Math.max(group1Teams.length, group2Teams.length);
  for (let i = 0; i < maxLen; i++) {
    const destIdx = i % 2 === 0 ? 0 : 1; // even -> first new bar (Panda), odd -> second new bar (Cat)

    // helper to push with fallback if target full
    const pushOrFallback = (teamObj) => {
      if (!teamObj) return;
      if (
        round2Groups[destIdx].teams.length < round2Groups[destIdx].target_size
      ) {
        round2Groups[destIdx].teams.push(teamObj);
      } else {
        // try other group if space remains
        const other = 1 - destIdx;
        if (
          round2Groups[other].teams.length < round2Groups[other].target_size
        ) {
          round2Groups[other].teams.push(teamObj);
        } else {
          // both full (shouldn't happen if capacity checks passed), but handle gracefully
          round2Groups[destIdx].teams.push(teamObj); // still push to avoid dropping teams
        }
      }
    };

    pushOrFallback(group1Teams[i]);
    pushOrFallback(group2Teams[i]);
  }

  // verify that every team has been assigned (simple sanity)
  const assignedCount =
    round2Groups[0].teams.length + round2Groups[1].teams.length;
  if (assignedCount !== totalTeams) {
    // fallback: if some leftover (rare), try fill by scanning unassigned teams
    const assignedIds = new Set(
      round2Groups.flatMap((g) => g.teams.map((t) => t.team_id))
    );
    const leftovers = teams.filter((t) => !assignedIds.has(t.team_id));
    for (const team of leftovers) {
      if (round2Groups[0].teams.length < round2Groups[0].target_size)
        round2Groups[0].teams.push(team);
      else round2Groups[1].teams.push(team);
    }
  }

  const barMap = new Map(allBars.map((b) => [b._id, b]));

  return {
    success: true,
    roundAssignments: round2Groups.map((group, idx) => ({
      group_id: `Round 2`,
      bar_id: group.bar_id,
      bar_name: barMap.get(group.bar_id)?.name || `Bar ${idx + 1}`,
      teams: group.teams,
    })),
    notes,
  };
}

/**
 * Mode B Round 2 (3 new bars).
 * - Uses three bars from allBars not used in round1
 * - Distribution according to Mode B (9..11 teams -> 3 groups)
 * - Ideal assignment: each new group gets one team from each start group (A,B,C).
 *   We use a deterministic rotation: dest = (startGroupIndex + teamIndex) % 3
 * - After initial assignment, try to resolve pairHistory conflicts by pairwise swapping.
 */
function buildRound2ModeB(
  teams, // array of all teams (team objects, each should have team_id)
  allBars, // array of bar objects (with _id and available_spots)
  round1Assignments, // array length 3: { bar_id, teams: [...] }
  pairHistory, // structure with previous pairings (see pairExists helper)
  notes = [], // array for warnings/info
<<<<<<< Updated upstream
  teamBarHistory // Map(team_id -> [bar_ids...]) optional
=======
  teamBarHistory, // Map(team_id -> [bar_ids...]) optional
  barCapacityTracker,
  age_group
>>>>>>> Stashed changes
) {
  // --- basic extraction & validation ---
  const group1Teams = round1Assignments[0]?.teams || [];
  const group2Teams = round1Assignments[1]?.teams || [];
  const group3Teams = round1Assignments[2]?.teams || [];
  const bar1 = round1Assignments[0]?.bar_id;
  const bar2 = round1Assignments[1]?.bar_id;
  const bar3 = round1Assignments[2]?.bar_id;

  // remove bars used in round 1 (preserve order of allBars)
  const barsNotUsedInRound1 = allBars.filter(
    (b) => b._id !== bar1 && b._id !== bar2 && b._id !== bar3
  );

  if (barsNotUsedInRound1.length < 3) {
    return {
<<<<<<< Updated upstream
      error: `Violation in Round 2 Mode B: Need 3 new bars but only found ${barsNotUsedInRound1.length}.`,
=======
      error: `Violation in Round 2 ${age_group} age group Mode B: Need 3 new bars with capacity but only found ${barsNotUsedInRound1.length}.`,
>>>>>>> Stashed changes
    };
  }

  const [largestBar, secondLargestBar, thirdLargestBar] = barsNotUsedInRound1;

  const cap = (b) => b.available_spots ?? b.capacity ?? b.size ?? 0;
  const cap1 = cap(largestBar),
    cap2 = cap(secondLargestBar),
    cap3 = cap(thirdLargestBar);

  const totalTeams = teams.length;
  // Mode B only valid when teams count is 9..11
  if (totalTeams < 9 || totalTeams > 11) {
    return {
      error: `Violation in Round 2 ${age_group} age group, expected 9-11 teams Got ${totalTeams}.`,
    };
  }

  const newDistribution = calculateGroupDistribution(totalTeams, teams, "B"); // length 3
  if (cap1 + cap2 + cap3 < totalTeams) {
    return {
<<<<<<< Updated upstream
      error: `Violation in Round 2 Mode B: Combined capacity (${
=======
      error: `Violation in Round 2 ${age_group} age group: Combined remaining capacity (${
>>>>>>> Stashed changes
        cap1 + cap2 + cap3
      }) is less than total teams (${totalTeams}).`,
    };
  }

  // per-target capacity sanity
  if (cap1 < newDistribution[0])
    return {
      error: `Violation in Round 2 ${age_group} age group. Capacity ${cap1} of ${largestBar._id} < required ${newDistribution[0]}`,
    };
  if (cap2 < newDistribution[1])
    return {
      error: `Violation in Round 2 ${age_group} age group. Capacity ${cap2} of ${secondLargestBar._id} < required ${newDistribution[1]}`,
    };
  if (cap3 < newDistribution[2])
    return {
      error: `Violation in Round 2 ${age_group} age group. Capacity ${cap3} of ${thirdLargestBar._id} < required ${newDistribution[2]}`,
    };

  // prepare round2 groups
  const round2Groups = [
    { bar_id: largestBar._id, teams: [], target_size: newDistribution[0] },
    {
      bar_id: secondLargestBar._id,
      teams: [],
      target_size: newDistribution[1],
    },
    { bar_id: thirdLargestBar._id, teams: [], target_size: newDistribution[2] },
  ];

  // Start-group arrays (preserve order)
  const startGroups = [
    group1Teams.slice(),
    group2Teams.slice(),
    group3Teams.slice(),
  ];

  // --- Initial ideal assignment:
  // Use deterministic rotation: dest = (startIndex + teamIndex) % 3
  // This gives each new group one team from each start group when possible.
  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const queue = startGroups[sIdx];
    for (let tIdx = 0; tIdx < queue.length; tIdx++) {
      const teamObj = queue[tIdx];
      const destIdx = (sIdx + tIdx) % 3;
      // push only if target not exceeded; otherwise push to any group with space (respecting 3-team groups first)
      const pushToGroup = (gIdx) => {
        round2Groups[gIdx].teams.push(teamObj);
      };

      if (
        round2Groups[destIdx].teams.length < round2Groups[destIdx].target_size
      ) {
        pushToGroup(destIdx);
      } else {
        // try to find another group with space (prioritize groups with smaller target_size first: fill 3-team groups first)
        // Create an order: groups sorted by target_size ascending (3-team groups first)
        const order = [0, 1, 2].sort(
          (a, b) => round2Groups[a].target_size - round2Groups[b].target_size
        );
        let placed = false;
        for (const g of order) {
          if (round2Groups[g].teams.length < round2Groups[g].target_size) {
            pushToGroup(g);
            placed = true;
            break;
          }
        }
        // fallback: push into dest even if overflow (should be rare because we checked capacities)
        if (!placed) pushToGroup(destIdx);
      }
    }
  }

  // --- Conflict resolution: detect pair duplicates and try to resolve by swapping
  // Build quick lookup of team -> group index
  const teamToGroup = new Map();
  for (let gi = 0; gi < round2Groups.length; gi++) {
    for (const t of round2Groups[gi].teams) {
      teamToGroup.set(t.team_id, gi);
    }
  }

  const conflicts = []; // { groupIdx, a, b } pairs where pairExists true
  for (let gi = 0; gi < round2Groups.length; gi++) {
    const gTeams = round2Groups[gi].teams;
    for (let i = 0; i < gTeams.length; i++) {
      for (let j = i + 1; j < gTeams.length; j++) {
        if (pairExists(pairHistory, gTeams[i].team_id, gTeams[j].team_id)) {
          conflicts.push({ groupIdx: gi, a: gTeams[i], b: gTeams[j] });
        }
      }
    }
  }

  // Try to resolve each conflict by finding a swap partner in other groups
  const maxAttempts = 5; // keep it bounded
  let unresolved = 0;
  for (const conflict of conflicts) {
    let resolved = false;
    for (let attempt = 0; attempt < maxAttempts && !resolved; attempt++) {
      const { groupIdx, a } = conflict; // we will try to relocate 'a' (could try b similarly)
      // look for candidate teams in other groups to swap with
      for (
        let otherG = 0;
        otherG < round2Groups.length && !resolved;
        otherG++
      ) {
        if (otherG === groupIdx) continue;
        for (
          let ti = 0;
          ti < round2Groups[otherG].teams.length && !resolved;
          ti++
        ) {
          const candidate = round2Groups[otherG].teams[ti];

          // simulate swap: candidate -> groupIdx, a -> otherG
          const wouldConflictInDest = round2Groups[groupIdx].teams
            .filter((t) => t.team_id !== a.team_id) // exclude a itself
            .some((t) => pairExists(pairHistory, t.team_id, candidate.team_id));
          const wouldConflictInOther = round2Groups[otherG].teams
            .filter((t) => t.team_id !== candidate.team_id)
            .some((t) => pairExists(pairHistory, t.team_id, a.team_id));

          // also ensure swapping doesn't reintroduce a same-start-group duplicate rule:
          // (Mode B allows one start bar to appear twice only if necessary; we won't enforce extra constraints here)
          if (!wouldConflictInDest && !wouldConflictInOther) {
            // perform swap
            const idxA = round2Groups[groupIdx].teams.findIndex(
              (t) => t.team_id === a.team_id
            );
            const idxCand = ti;
            if (idxA >= 0 && idxCand >= 0) {
              round2Groups[groupIdx].teams[idxA] = candidate;
              round2Groups[otherG].teams[idxCand] = a;
              // update teamToGroup map
              teamToGroup.set(candidate.team_id, groupIdx);
              teamToGroup.set(a.team_id, otherG);
              resolved = true;
            }
          }
        }
      }
      // if not resolved in this pass, try the other member of the conflict (b) in next attempt
      if (!resolved && attempt === 2 && conflict.b) {
        conflict.a = conflict.b; // try swapping the other team next iterations
      }
    }

    if (!resolved) unresolved++;
  }

  if (unresolved > 0) {
    notes.push(
      `Violation in ${age_group} age group Round 2 Mode B: ${unresolved} pairing conflict(s) could not be auto-resolved; please inspect pairHistory or consider manual swaps.`
    );
  }

  // final sanity: assign any leftover unassigned teams (shouldn't happen) to groups with space
  const assignedIds = new Set(
    round2Groups.flatMap((g) => g.teams.map((t) => t.team_id))
  );
  const leftovers = teams.filter((t) => !assignedIds.has(t.team_id));
  for (const team of leftovers) {
    // find first group with space
    const spaceIdx = round2Groups.findIndex(
      (g) => g.teams.length < g.target_size
    );
    if (spaceIdx >= 0) round2Groups[spaceIdx].teams.push(team);
    else round2Groups[0].teams.push(team); // last resort
  }

  // Update teamBarHistory if provided
  if (teamBarHistory && typeof teamBarHistory.set === "function") {
    for (const g of round2Groups) {
      for (const t of g.teams) {
        if (!teamBarHistory.has(t.team_id)) teamBarHistory.set(t.team_id, []);
        teamBarHistory.get(t.team_id).push(g.bar_id);
      }
    }
  }

  // return same shaped assignment as earlier functions
  const barMap = new Map(allBars.map((b) => [b._id, b]));
  return {
    success: true,
    roundAssignments: round2Groups.map((group, idx) => ({
      group_id: `Round 2`,
      bar_id: group.bar_id,
      bar_name: barMap.get(group.bar_id)?.name || `Bar ${idx + 1}`,
      teams: group.teams,
    })),
    notes,
  };
}

function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Helper: flexible pair-existence check against pairHistory
function pairExists(pairHistory, a, b) {
  if (!pairHistory) return false;
  const key = pairKey(a, b);

  // If it's a Set or Map-like
  if (typeof pairHistory.has === "function") {
    if (pairHistory.has(key)) return true;
    // maybe set stored arrays of pairs like ["a","b"]
    if (pairHistory.has(JSON.stringify([a, b]))) return true;
  }

  // If it's an array of pairs
  if (Array.isArray(pairHistory)) {
    for (const p of pairHistory) {
      if (!p) continue;
      if (
        typeof p === "string" &&
        (p === key || p === `${a},${b}` || p === `${b},${a}`)
      )
        return true;
      if (
        Array.isArray(p) &&
        ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a))
      )
        return true;
      if (p.key && p.key === key) return true;
    }
  }

  // If it's an object map { "a|b": true }
  if (typeof pairHistory === "object") {
    if (pairHistory[key]) return true;
  }

  return false;
}

function teamSeatCount(team) {
  return (team && team.members && team.members.length) || 2;
}

/**
 * Compute balanced team counts for `totalTeams` into `numGroups`.
 * Ensures each group count is between minTeams and maxTeams (inclusive)
 * and difference between min/max is at most 1.
 * Returns { error } on impossible.
 */
function computeBalancedCounts(
  totalTeams,
  numGroups,
  minTeams = 3,
  maxTeams = 5
) {
  if (numGroups <= 0) return { error: "numGroups must be > 0" };
  if (totalTeams < numGroups * minTeams || totalTeams > numGroups * maxTeams) {
    return {
      error: `Cannot distribute ${totalTeams} teams into ${numGroups} groups of ${minTeams}-${maxTeams} teams each.`,
    };
  }
  const base = Math.floor(totalTeams / numGroups);
  const rem = totalTeams % numGroups;
  const dist = [];
  for (let i = 0; i < numGroups; i++) {
    dist.push(base + (i < rem ? 1 : 0));
  }
  // sanity check
  const min = Math.min(...dist);
  const max = Math.max(...dist);
  if (min < minTeams || max > maxTeams) {
    return {
      error: `Distribution produced groups outside [${minTeams},${maxTeams}] range.`,
    };
  }
  return { distribution: dist };
}

/**
 * Split array `items` into balanced arrays according to `counts` array.
 * Returns list-of-arrays.
 */
function splitArrayByCounts(items, counts) {
  const out = [];
  let idx = 0;
  for (let c of counts) {
    out.push(items.slice(idx, idx + c));
    idx += c;
  }
  return out;
}

/**
 * Given N teams at a bar, compute number of subgroups needed (minimize #groups,
 * each group <= maxTeams). Then return a balanced counts array (each 3..5).
 */
function computeSubgroupCountsForBar(N, minTeams = 3, maxTeams = 5) {
  // smallest number of groups such that N <= groups * maxTeams
  let groups = Math.ceil(N / maxTeams);
  // but also ensure N >= groups * minTeams
  while (groups <= N && N < groups * minTeams) {
    groups += 1;
  }
  // now compute balanced distribution
  return computeBalancedCounts(N, groups, minTeams, maxTeams);
}

/**
 * Build Round 2 for Mode A.
 *
 * - Uses round1Distribution as target counts for round2 groups.
 * - Ensures at least one team from each start group moves to a different bar if possible.
 * - Enforces max one team from the same start bar per new group (Mode A rule).
 * - Respects seat capacities.
 */
function buildRound2ModeA(
  teams,
  allBars,
  round1Assignments,
  pairHistory,
  round1Distribution,
  notes = [],
  teamBarHistory
) {
  const numStartGroups = round1Assignments.length;
  const totalTeams = teams.length;

  if (totalTeams < 12) {
    return { error: `Age Group ${age_group}: Mode A requires at least 12 teams; got ${totalTeams}.` };
  }
  if (numStartGroups < 4) {
    notes.push(
      `Age Group ${age_group}: Mode A ideally expects at least 4 start groups; got ${numStartGroups}.`
    );
  }

  // Desired counts for Round 2 — prefer the same distribution as round1 (keeps groups balanced)
  const desiredCounts = Array.isArray(round1Distribution)
    ? round1Distribution.slice(0, numStartGroups)
    : computeBalancedCounts(totalTeams, numStartGroups, 3, 5).distribution;

  // normalize desiredCounts length
  while (desiredCounts.length < numStartGroups) desiredCounts.push(3);

  // Build candidate bars for round 2 (prefer bars not used in round1)
  const startBarIds = round1Assignments.map((g) => g.bar_id);
  const barsNotUsedInRound1 = allBars.filter(
    (b) => !startBarIds.includes(b._id)
  );

  const round2Bars = [];
  // prefer new bars
  for (const b of barsNotUsedInRound1) {
    round2Bars.push(b);
    if (round2Bars.length === numStartGroups) break;
  }
  // then start bars with more seats (if still missing)
  if (round2Bars.length < numStartGroups) {
    const startBarObjs = startBarIds
      .map((id) => allBars.find((b) => b._id === id))
      .filter(Boolean)
      .sort((a, b) => (b.available_spots || 0) - (a.available_spots || 0));
    for (const sb of startBarObjs) {
      if (!round2Bars.find((rb) => rb._id === sb._id)) {
        round2Bars.push(sb);
      }
      if (round2Bars.length === numStartGroups) break;
    }
  }
  // finally fill with any bar
  if (round2Bars.length < numStartGroups) {
    for (const b of allBars) {
      if (!round2Bars.find((rb) => rb._id === b._id)) {
        round2Bars.push(b);
      }
      if (round2Bars.length === numStartGroups) break;
    }
  }

  // final sanity: we must have at least numStartGroups bars to build round2 groups
  if (round2Bars.length < numStartGroups) {
    return {
<<<<<<< Updated upstream
      error: `Insufficient distinct bars for round 2 (need ${numStartGroups}).`,
=======
      error: `Violation in Age Group ${age_group}, Mode A: Insufficient distinct bars with available capacity for round 2 (need ${numStartGroups}).`,
>>>>>>> Stashed changes
    };
  }

  // Build target buckets
  const round2Groups = round2Bars.slice(0, numStartGroups).map((b, i) => ({
    bar_id: b._id,
    bar_obj: b,
    teams: [],
    target_team_count: desiredCounts[i] || 3,
    startOwners: new Set(), // which start-group indices have contributed here (enforce max one)
  }));

  // quick seat feasibility check
  const minimalSeatsNeeded = teams.reduce((s, t) => s + teamSeatCount(t), 0);
  const chosenSeats = round2Groups.reduce(
    (s, g) => s + (g.bar_obj.available_spots || 0),
    0
  );
  if (chosenSeats < minimalSeatsNeeded) {
    return {
<<<<<<< Updated upstream
      error: `Not enough seats in chosen round-2 bars (${chosenSeats}) for ${minimalSeatsNeeded} participant seats.`,
=======
      error: `Violation in Age Group ${age_group}, Mode A: Not enough remaining seats in chosen round-2 bars (${chosenSeats}) for ${minimalSeatsNeeded} participant seats.`,
>>>>>>> Stashed changes
    };
  }

  // Start groups as queues preserving order
  const startGroups = round1Assignments.map((g) => (g.teams || []).slice());

  // helper to compute seats used in a group
  const seatsUsedIn = (g) => g.teams.reduce((s, t) => s + teamSeatCount(t), 0);

  // helper to find a round2 group that is NOT the start group's own bar (if possible),
  // has space (teams < target), has seat capacity, and doesn't already contain a team from this startGroup
  function findDifferentGroupWithSpace(excludeBarId, startIndex, seatsNeeded) {
    // prefer groups with smallest fill ratio to balance counts
    const candidates = round2Groups
      .map((g, idx) => ({ g, idx }))
      .filter(
        ({ g }) =>
          g.bar_id !== excludeBarId &&
          g.teams.length < g.target_team_count &&
          seatsUsedIn(g) + seatsNeeded <= (g.bar_obj.available_spots || 0) &&
          !g.startOwners.has(startIndex)
      )
      .sort(
        (a, b) =>
          a.g.teams.length / Math.max(1, a.g.target_team_count) -
          b.g.teams.length / Math.max(1, b.g.target_team_count)
      );
    return candidates.length ? candidates[0].idx : -1;
  }

  // First pass: ensure at least one team from each start group moves (attempt earliest team)
  for (let sIdx = 0; sIdx < startGroups.length; sIdx++) {
    const queue = startGroups[sIdx];
    const startBarId = round1Assignments[sIdx].bar_id;
    let moved = false;
    for (let pickIdx = 0; pickIdx < queue.length && !moved; pickIdx++) {
      const teamObj = queue[pickIdx];
      const seats = teamSeatCount(teamObj);
      const candidateIdx = findDifferentGroupWithSpace(startBarId, sIdx, seats);
      if (candidateIdx >= 0) {
        const g = round2Groups[candidateIdx];
        g.teams.push(teamObj);
        g.startOwners.add(sIdx);
        queue.splice(pickIdx, 1);
        moved = true;
      }
    }
    if (!moved) {
      // we will try to balance later — note but don't fail immediately
      notes.push(
        `Violation in Age Group ${age_group}, Mode A: Could not move any team from start-group ${sIdx} away from its original bar in Round 2 (will attempt to balance otherwise).`
      );
    }
  }

  // Second pass: assign all remaining teams preserving start-group order
  for (let sIdx = 0; sIdx < startGroups.length; sIdx++) {
    const queue = startGroups[sIdx];
    const startBarId = round1Assignments[sIdx].bar_id;
    for (const teamObj of queue) {
      const seats = teamSeatCount(teamObj);

      // prefer groups not from same start bar and not already having a team from this start group
      round2Groups.sort(
        (a, b) =>
          a.teams.length / Math.max(1, a.target_team_count) -
          b.teams.length / Math.max(1, b.target_team_count)
      );

      let placed = false;
      // try strict candidates first
      for (let gi = 0; gi < round2Groups.length; gi++) {
        const g = round2Groups[gi];
        if (
          g.bar_id !== startBarId &&
          g.teams.length < g.target_team_count &&
          seatsUsedIn(g) + seats <= (g.bar_obj.available_spots || 0) &&
          !g.startOwners.has(sIdx)
        ) {
          g.teams.push(teamObj);
          g.startOwners.add(sIdx);
          placed = true;
          break;
        }
      }

      if (!placed) {
        // fallback: allow placement into any group that has seat capacity and target not exceeded,
        // even if it's the start-bar group. But still enforce not more than one from same start in a group.
        for (let gi = 0; gi < round2Groups.length && !placed; gi++) {
          const g = round2Groups[gi];
          if (
            g.teams.length < g.target_team_count &&
            seatsUsedIn(g) + seats <= (g.bar_obj.available_spots || 0) &&
            !g.startOwners.has(sIdx)
          ) {
            g.teams.push(teamObj);
            g.startOwners.add(sIdx);
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        // hard fallback: try any group with seat capacity even if it already has a team from this start (rare)
        for (let gi = 0; gi < round2Groups.length && !placed; gi++) {
          const g = round2Groups[gi];
          if (
            seatsUsedIn(g) + seats <= (g.bar_obj.available_spots || 0) &&
            g.teams.length < 5 // respect hard cap 5
          ) {
            g.teams.push(teamObj);
            // do not change startOwners here (will break Mode A rule) but we allow as last resort
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        return {
          error: `Violation in Age Group ${age_group}, Mode A: Unable to place team ${teamObj.team_id} in round 2 without breaking seat or group-size constraints. Consider adding bars or seats.`,
        };
      }
    }
  }

  // Final validation: groups sizes 3..5, difference <=1
  const counts = round2Groups.map((g) => g.teams.length);
  const minC = Math.min(...counts);
  const maxC = Math.max(...counts);
  if (minC < 3 || maxC > 5 || maxC - minC > 1) {
    return {
      error: `Violation in Age Group ${age_group}, Mode A: Round 2 group-size constraints violated: groups sizes ${counts.join(
        ", "
      )}. Expected 3-5 and difference ≤1.`,
    };
  }
  // seat checks
  for (const g of round2Groups) {
    const seatsUsed = g.teams.reduce((s, t) => s + teamSeatCount(t), 0);
    if (seatsUsed > (g.bar_obj.available_spots || 0)) {
      return {
        error: `Violation in Age Group ${age_group}, Mode A: Bar ${
          g.bar_obj._id
<<<<<<< Updated upstream
        } over capacity in round 2: requires ${seatsUsed} seats but has ${
          g.bar_obj.available_spots || 0
        }.`,
=======
        } over remaining capacity in round 2, requires ${seatsUsed} seats but has ${remainingCapacity} remaining.`,
>>>>>>> Stashed changes
      };
    }
  }

  // Update teamBarHistory
  if (teamBarHistory && typeof teamBarHistory.set === "function") {
    for (const g of round2Groups) {
      for (const t of g.teams) {
        if (!teamBarHistory.has(t.team_id)) teamBarHistory.set(t.team_id, []);
        teamBarHistory.get(t.team_id).push(g.bar_id);
      }
    }
  }

  const barMap = new Map(allBars.map((b) => [b._id, b]));
  return {
    success: true,
    roundAssignments: round2Groups.map((g, idx) => ({
      group_id: `Round 2`,
      bar_id: g.bar_id,
      bar_name: barMap.get(g.bar_id)?.name || `Bar ${idx + 1}`,
      teams: g.teams,
    })),
    notes,
  };
}

/**
 * Rewritten buildRound3ModeAMain according to user's A->B->C seeding + placement algorithm.
 *
 * Assumptions:
 * - `teams` is an array of team objects with at least `team_id`.
 * - `allBars` is an array of bars with `_id`, `name`, and `available_spots` (number).
 * - `round1Assignments` and `round2Assignments` are arrays of { bar_id, teams: [{team_id,...}, ...] }.
 * - `pairHistory` is in the same shape you used previously (seenPair helper handles multiple shapes).
 * - `teamSeatCount(team)` is available; a fallback is provided.
 *
 * Behavior:
 * - compute distribution (if not provided externally) for Mode A: minimum 4 groups, sizes 3..5,
 *   balanced so max-min <= 1.
 * - prefer unused bars; if not enough, include other bars (including r2 bars) sorted by capacity.
 * - seed each target bar with one suitable team (from round2 column-major order),
 *   then place remaining teams while avoiding prior-bar visits and pair duplicates.
 * - check seats; run conflict-resolution swaps inside each bar; return an error if constraints can't be met.
 */
function buildRound3ModeA(
  teams,
  allBars,
  round1Assignments,
  round2Assignments,
  pairHistory,
  teamBarHistory,
<<<<<<< Updated upstream
  notes = []
=======
  notes = [],
  barCapacityTracker,
  age_group
>>>>>>> Stashed changes
) {
  // --- helpers & fallbacks ---
  const barMap = new Map(allBars.map((b) => [b._id, b]));
  const getCapacity = (b) => b?.available_spots ?? b?.capacity ?? 0;
  const teamSeatCount = (t) => t.seats ?? t.size ?? (t.members ? t.members.length : 1);

  const makePairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const seenPair = (a, b) =>
    !!(
      pairHistory?.has?.(makePairKey(a, b)) ||
      pairHistory?.[makePairKey(a, b)] ||
      (Array.isArray(pairHistory) &&
        pairHistory.some(
          (p) =>
            Array.isArray(p) &&
            ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a))
        ))
    );

  // build r1/r2 history map
  const history = new Map();
  for (const r1 of round1Assignments || []) {
    for (const t of r1.teams || []) {
      if (!history.has(t.team_id)) history.set(t.team_id, {});
      history.get(t.team_id).r1 = r1.bar_id;
    }
  }
  for (const r2 of round2Assignments || []) {
    for (const t of r2.teams || []) {
      if (!history.has(t.team_id)) history.set(t.team_id, {});
      history.get(t.team_id).r2 = r2.bar_id;
    }
  }

  // --- distribution helper (Mode A: min 4 groups, balanced 3..5) ---
  function computeDistribution(totalTeams, minGroups = 4) {
    const maxGroups = Math.min(Math.floor(totalTeams / 3), totalTeams);
    for (let g = minGroups; g <= Math.max(minGroups, maxGroups); g++) {
      const base = Math.floor(totalTeams / g);
      const rem = totalTeams % g;
      const sizes = Array.from({ length: g }, (_, i) => (i < rem ? base + 1 : base));
      const minS = Math.min(...sizes);
      const maxS = Math.max(...sizes);
      if (minS >= 3 && maxS <= 5 && maxS - minS <= 1) return { distribution: sizes, groups: g };
    }
    // fallback attempt (looser)
    for (let g = Math.max(4, Math.floor(totalTeams / 5)); g <= Math.floor(totalTeams / 3); g++) {
      const base = Math.floor(totalTeams / g);
      const rem = totalTeams % g;
      const sizes = Array.from({ length: g }, (_, i) => (i < rem ? base + 1 : base));
      const minS = Math.min(...sizes);
      const maxS = Math.max(...sizes);
      if (minS >= 3 && maxS <= 5 && maxS - minS <= 1) return { distribution: sizes, groups: g };
    }
    return { error: `Violation in Age Group ${age_group}, Round 3 Mode A: Cannot compute a valid distribution for ${totalTeams} teams.` };
  }

  const totalTeams = teams.length;
  const distResult = computeDistribution(totalTeams, 4);
  if (distResult.error) return { error: distResult.error };

  const distribution = distResult.distribution; // e.g. [4,4,3,3]
  const neededGroups = distResult.groups;

  // --- sort bars desc by capacity ---
  const barsByCapacity = [...allBars].sort((a, b) => getCapacity(b) - getCapacity(a));
  // used bars set (from history)
  const usedBarIds = new Set();
  for (const h of history.values()) {
    if (h.r1) usedBarIds.add(h.r1);
    if (h.r2) usedBarIds.add(h.r2);
  }
  const unusedBars = barsByCapacity.filter((b) => !usedBarIds.has(b._id));
  const r2BarSet = new Set((round2Assignments || []).map((r) => r.bar_id));
  const r2Bars = barsByCapacity.filter((b) => r2BarSet.has(b._id));

  // Candidate bar lists (try in order): unused-only, unused+round2, all bars
  const candidateBarLists = [];
  if (unusedBars.length >= neededGroups) candidateBarLists.push(unusedBars.slice(0, neededGroups));
  const unusedThenR2 = [...unusedBars, ...r2Bars.filter((b) => !unusedBars.includes(b))].slice(0, neededGroups);
  if (unusedThenR2.length >= neededGroups) candidateBarLists.push(unusedThenR2);
  candidateBarLists.push(barsByCapacity.slice(0, Math.min(barsByCapacity.length, neededGroups)));

  // Build round2 groups into column-major flattened queue (as you specified)
  const r2Groups = (round2Assignments || []).slice(0, neededGroups).map((r) => r.teams || []);
  while (r2Groups.length < neededGroups) r2Groups.push([]);
  const maxR2Len = Math.max(...r2Groups.map((g) => g.length), 0);
  const flattened = [];
  for (let pos = 0; pos < maxR2Len; pos++) {
    for (let gi = 0; gi < r2Groups.length; gi++) {
      if (r2Groups[gi][pos]) flattened.push({ ...r2Groups[gi][pos] });
    }
  }
  // append any teams not in flattened
  const seen = new Set(flattened.map((t) => t.team_id));
  for (const t of teams) if (!seen.has(t.team_id)) flattened.push({ ...t });

  // preferNoPair: returns true if placing team in barTeamsArray creates no pairHistory conflicts
  function preferNoPair(team, barTeamsArray) {
    for (const existing of barTeamsArray) if (seenPair(team.team_id, existing.team_id)) return false;
    return true;
  }

  // can't place if target bar is equal to team's r1 (forbid return to r1)
  function canPlaceTeam(team, barTeamsArray, targetBarId) {
    const h = history.get(team.team_id) || {};
    if (h.r1 === targetBarId) return false; // never return to r1
    // seat and pair checks are done externally or as soft preference
    return true;
  }

  // Attempt each candidate bar set
  for (const candidateBars of candidateBarLists) {
    if (!candidateBars || candidateBars.length < neededGroups) continue;

    // Build targetBar objects in order (use largest bars first; distribution maps to indices)
    const targetBars = candidateBars.slice(0, neededGroups).map((b, idx) => ({
      bar_id: b._id,
      bar_name: b.name || `Bar ${b._id}`,
      desiredTeams: distribution[idx] ?? distribution[distribution.length - 1],
      teams: [],
    }));

    // Quick capacity pre-check (sum of smallest possible seats per group <= capacity)
    // compute total seats required
    const seatsRequired = teams.reduce((s, t) => s + teamSeatCount(t), 0);
    const totalCandidateSeats = targetBars.reduce((s, tb) => s + (getCapacity(barMap.get(tb.bar_id)) || 0), 0);
    if (totalCandidateSeats < seatsRequired) {
      // insufficient seats for this candidate set
      continue;
    }

    // Copy queue
    const queue = [...flattened];

    // Seeding pass: give each bar one team (column-major ordering from queue),
    // pick earliest team that can be placed (not r1 and fits seats).
    let seedFailed = false;
    for (let bi = 0; bi < targetBars.length; bi++) {
      const tb = targetBars[bi];
      let placed = false;
      for (let qi = 0; qi < queue.length; qi++) {
        const candidateTeam = queue[qi];
        if (!canPlaceTeam(candidateTeam, tb.teams, tb.bar_id)) continue;
        const barObj = barMap.get(tb.bar_id);
        const seatsUsed = tb.teams.reduce((s, t) => s + teamSeatCount(t), 0);
        if ((getCapacity(barObj) || 0) < seatsUsed + teamSeatCount(candidateTeam)) continue;
        // prefer teams that avoid pair conflicts if possible (soft)
        tb.teams.push(candidateTeam);
        queue.splice(qi, 1);
        placed = true;
        break;
      }
      if (!placed) {
        seedFailed = true;
        break;
      }
    }
    if (seedFailed) continue;

    // Main placement: fill each bar up to desiredTeams.
    // Two-pass per team: try bars without pair conflicts first; if none, allow with conflicts.
    let progress = true;
    let safety = 0;
    while (queue.length > 0 && progress && safety++ < 20000) {
      progress = false;
      for (let qi = 0; qi < queue.length; ) {
        const t = queue[qi];
        let placed = false;

        // First pass: try bars that have room AND no pair conflicts
        for (let bi = 0; bi < targetBars.length; bi++) {
          const tb = targetBars[bi];
          if (tb.teams.length >= tb.desiredTeams) continue;
          if (!canPlaceTeam(t, tb.teams, tb.bar_id)) continue;
          if (!preferNoPair(t, tb.teams)) continue; // skip if would create immediate pair conflict
          const barObj = barMap.get(tb.bar_id);
          const seatsUsed = tb.teams.reduce((s, tm) => s + teamSeatCount(tm), 0);
          if ((getCapacity(barObj) || 0) < seatsUsed + teamSeatCount(t)) continue;
          tb.teams.push(t);
          queue.splice(qi, 1);
          placed = true;
          progress = true;
          break;
        }
        if (placed) continue;

        // Second pass: allow bars even with pair conflicts (soft permit), still obey r1 forbid & seats
        for (let bi = 0; bi < targetBars.length; bi++) {
          const tb = targetBars[bi];
          if (tb.teams.length >= tb.desiredTeams) continue;
          if (!canPlaceTeam(t, tb.teams, tb.bar_id)) continue;
          const barObj = barMap.get(tb.bar_id);
          const seatsUsed = tb.teams.reduce((s, tm) => s + teamSeatCount(tm), 0);
          if ((getCapacity(barObj) || 0) < seatsUsed + teamSeatCount(t)) continue;
          tb.teams.push(t);
          queue.splice(qi, 1);
          placed = true;
          progress = true;
          break;
        }

        if (!placed) qi++; // move to next team in queue
      } // end for each queue snapshot
    } // end while

    // If after placement there are still unplaced teams, try relaxing desiredTeams constraints:
    if (queue.length > 0) {
      // allow any bar with seats (still not r1)
      for (let qi = 0; qi < queue.length; ) {
        const t = queue[qi];
        let placed = false;
        for (let bi = 0; bi < targetBars.length; bi++) {
          const tb = targetBars[bi];
          if (!canPlaceTeam(t, tb.teams, tb.bar_id)) continue;
          const barObj = barMap.get(tb.bar_id);
          const seatsUsed = tb.teams.reduce((s, tm) => s + teamSeatCount(tm), 0);
          if ((getCapacity(barObj) || 0) < seatsUsed + teamSeatCount(t)) continue;
          tb.teams.push(t);
          queue.splice(qi, 1);
          placed = true;
          break;
        }
        if (!placed) qi++;
      }
    }

    // If still unplaced, this candidate set fails
    if (queue.length > 0) continue;

    // Now ensure each target bar matches distribution sizes; if some bars are under/over, do small re-balancing:
    // If total teams match, we can move teams from bars with surplus to bars with deficit provided seat constraints permit.
    const totalAssigned = targetBars.reduce((s, tb) => s + tb.teams.length, 0);
    if (totalAssigned !== totalTeams) {
      // sanity check; this shouldn't happen, but fail this candidate
      continue;
    }

    // Rebalance to exact distribution (move from bars with >desired to bars with <desired)
    let rebalSafety = 0;
    while (rebalSafety++ < 1000) {
      let moved = false;
      for (let i = 0; i < targetBars.length; i++) {
        const from = targetBars[i];
        if (from.teams.length <= from.desiredTeams) continue;
        for (let j = 0; j < targetBars.length; j++) {
          const to = targetBars[j];
          if (to.teams.length >= to.desiredTeams) continue;
          // try to move a team from 'from' to 'to' that doesn't violate r1 and seats; prefer no-pair move
          let movedIdx = -1;
          for (let k = 0; k < from.teams.length; k++) {
            const candidate = from.teams[k];
            if (!canPlaceTeam(candidate, to.teams, to.bar_id)) continue;
            const barObjTo = barMap.get(to.bar_id);
            const seatsUsedTo = to.teams.reduce((s, tm) => s + teamSeatCount(tm), 0);
            if ((getCapacity(barObjTo) || 0) < seatsUsedTo + teamSeatCount(candidate)) continue;
            // prefer moving candidate that doesn't create pair conflicts in 'to' bar
            if (preferNoPair(candidate, to.teams)) {
              movedIdx = k;
              break;
            }
            if (movedIdx === -1) movedIdx = k; // fallback any movable
          }
          if (movedIdx !== -1) {
            const [movedTeam] = from.teams.splice(movedIdx, 1);
            to.teams.push(movedTeam);
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
      if (!moved) break;
    }

    // Final verification: sizes within 3..5 and no bar over capacity and no team returned to r1
    let finalBad = false;
    for (const tb of targetBars) {
      const size = tb.teams.length;
      if (size < 3 || size > 5) finalBad = true;
      const cap = getCapacity(barMap.get(tb.bar_id)) || 0;
      const seatsUsed = tb.teams.reduce((s, tm) => s + teamSeatCount(tm), 0);
      if (seatsUsed > cap) finalBad = true;
      for (const t of tb.teams) {
        const h = history.get(t.team_id) || {};
        if (h.r1 === tb.bar_id) finalBad = true; // strict forbid
      }
      // (pair conflicts are allowed if unavoidable)
    }
    if (finalBad) continue;

    // Build final assignments (keep subGroups field similar to your original function)
    const finalAssignments = [];
    for (let i = 0; i < targetBars.length; i++) {
      const tb = targetBars[i];
      finalAssignments.push({
        group_id: `Round 3`,
        bar_id: tb.bar_id,
        bar_name: tb.bar_name,
        teams: tb.teams,
        subGroups: [tb.teams], // single subgroup per bar (you can split later if needed)
      });
    }

    return { success: true, roundAssignments: finalAssignments, notes };
  }

  // if all candidate sets failed:
  return {
    error:
      `Violation in Age Group ${age_group}, Round 3, Mode A: Unable to build assignments under constraints (no team may return to its round-1 bar) with current bars/seats. Consider increasing available bars or seats, or accept looser distribution.`,
  };
}


/**
 * Pre-check capacity by matching groups to bars
 */
function matchGroupsToBarsByCapacity(groupSizes, bars, teams) {
  const groupsWithSeats = groupSizes
    .map((size, idx) => {
      // Find if any group has a 3-person team
      const has3PersonTeam = teams.some((t) => t.members.length === 3);
      const requiredSeats = size * 2 + (idx === 0 && has3PersonTeam ? 1 : 0);

      return {
        index: idx,
        target_size: size,
        requiredSeats,
      };
    })
    .sort((a, b) => b.requiredSeats - a.requiredSeats);

  const sortedBars = [...bars].sort(
    (a, b) => b.available_spots - a.available_spots
  );

  const assignments = [];
  for (let i = 0; i < groupsWithSeats.length; i++) {
    const group = groupsWithSeats[i];
    const bar = sortedBars[i];

    if (bar.available_spots < group.requiredSeats) {
      return {
        error: `Bar '${bar.name}' has ${bar.available_spots} spots but needs ${group.requiredSeats} for a ${group.target_size}-team group.`,
      };
    }

    assignments.push({
      bar,
      target_size: group.target_size,
      requiredSeats: group.requiredSeats,
    });
  }

  return { success: true, assignments };
}

/**
 * Helper: Distribute teams into groups avoiding conflicts
 */
function distributeTeamsWithoutConflicts(allTeams, groups, pairHistory, notes) {
  const shuffled = [...allTeams].sort(() => Math.random() - 0.5);

  for (const team of shuffled) {
    let placed = false;

    for (const group of groups) {
      if (group.teams.length < group.target_size) {
        const hasConflict = group.teams.some((existingTeam) => {
          const key = [team.team_id, existingTeam.team_id].sort().join("|");
          return pairHistory.has(key);
        });

        if (!hasConflict) {
          group.teams.push(team);
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      // Place anyway, conflicts will be resolved later
      const targetGroup = groups.find((g) => g.teams.length < g.target_size);
      if (targetGroup) {
        targetGroup.teams.push(team);
      }
    }
  }

  return { success: true, groups };
}

/**
 * Helper: Resolve conflicts by swapping teams between groups
 */
function resolveConflictsInGroups(groups, pairHistory, notes) {
  const maxAttempts = 100;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    let foundConflict = false;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      for (let t1 = 0; t1 < group.teams.length; t1++) {
        for (let t2 = t1 + 1; t2 < group.teams.length; t2++) {
          const key = [group.teams[t1].team_id, group.teams[t2].team_id]
            .sort()
            .join("|");

          if (pairHistory.has(key)) {
            foundConflict = true;

            for (let j = 0; j < groups.length; j++) {
              if (i !== j) {
                const otherGroup = groups[j];

                for (let k = 0; k < otherGroup.teams.length; k++) {
                  const swapSuccessful = attemptSwap(
                    group,
                    t1,
                    otherGroup,
                    k,
                    pairHistory
                  );

                  if (swapSuccessful) {
                    foundConflict = false;
                    break;
                  }
                }

                if (!foundConflict) break;
              }
            }

            if (foundConflict) break;
          }
        }
        if (foundConflict) break;
      }
      if (foundConflict) break;
    }

    if (!foundConflict) {
      return true;
    }
  }

  return false;
}

/**
 * Helper: Attempt to swap two teams between groups
 */
function attemptSwap(group1, idx1, group2, idx2, pairHistory) {
  const team1 = group1.teams[idx1];
  const team2 = group2.teams[idx2];

  const group1Conflicts = group1.teams.some((t, i) => {
    if (i === idx1) return false;
    const key = [team2.team_id, t.team_id].sort().join("|");
    return pairHistory.has(key);
  });

  const group2Conflicts = group2.teams.some((t, i) => {
    if (i === idx2) return false;
    const key = [team1.team_id, t.team_id].sort().join("|");
    return pairHistory.has(key);
  });

  if (!group1Conflicts && !group2Conflicts) {
    group1.teams[idx1] = team2;
    group2.teams[idx2] = team1;
    return true;
  }

  return false;
}

/** Update team bar history after each round */
function updateTeamBarHistory(roundAssignments, teamBarHistory) {
  if (
    !roundAssignments ||
    typeof roundAssignments[Symbol.iterator] !== "function"
  )
    return;
  for (const group of roundAssignments) {
    if (!group || !Array.isArray(group.teams)) continue;
    for (const team of group.teams) {
      if (!team || !team.team_id) continue;
      if (!teamBarHistory.has(team.team_id)) {
        teamBarHistory.set(team.team_id, []);
      }
      teamBarHistory.get(team.team_id).push(group.bar_id);
    }
  }
}

/**
 * Validate bar sequences for all teams
 */
function validateAllTeamSequences(teamBarHistory, mode) {
  const errors = [];
  
  console.log("teamBarHistory: ", teamBarHistory);

  for (const [teamId, barSequence] of teamBarHistory.entries()) {
    const validation = validateBarSequence(barSequence, mode);
    if (!validation.valid) {
      errors.push(`Team ${teamId}: ${validation.error}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join("; ") };
  }

  return { valid: true };
}

/**
 * Validate a single team's bar sequence
 */
function validateBarSequence(barSequence, mode) {
  if (mode === "B" || mode === "C") {
    if (barSequence[0] === barSequence[1]) {
      console.log("barSequence[0]: ", barSequence[0]);
      console.log("barSequence[1]: ", barSequence[1]);
      return {
        valid: false,
        error: "A→A pattern forbidden in 2-round events (must be A→B)",
      };
    }
  }

  if (mode === "A" && barSequence.length === 3) {
    const [r1, r2, r3] = barSequence;

    // Forbidden: A → B → A (returning to start bar)
    if (r1 === r3 && r1 !== r2) {
      return {
        valid: false,
        error: "Forbidden pattern A→B→A (cannot return to starting bar)",
      };
    }

    // Check if it matches any allowed pattern
    const isABC = r1 !== r2 && r2 !== r3 && r1 !== r3; // A→B→C (all different)
    const isAAB = r1 === r2 && r2 !== r3; // A→A→B (stay then switch)
    const isABB = r1 !== r2 && r2 === r3; // A→B→B (switch then stay)

    if (!isABC && !isAAB && !isABB) {
      return {
        valid: false,
        error: `Invalid sequence ${r1}→${r2}→${r3}. Allowed: A→B→C, A→A→B, A→B→B`,
      };
    }
  }

  return { valid: true };
}

/**
 * Update pair history from a round's assignments.
 * Accepts roundAssignments (array) and pairHistory (Set or object).
 */
function updatePairHistoryFromRound(roundAssignments, pairHistory) {
  if (
    !roundAssignments ||
    typeof roundAssignments[Symbol.iterator] !== "function"
  ) {
    // nothing to update
    return;
  }

  const makeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const group of roundAssignments) {
    if (!group || !Array.isArray(group.teams)) continue;
    const teams = group.teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const a = teams[i]?.team_id;
        const b = teams[j]?.team_id;
        if (!a || !b) continue;
        const key = makeKey(a, b);
        if (pairHistory instanceof Set) pairHistory.add(key);
        else if (pairHistory && typeof pairHistory === "object")
          pairHistory[key] = true;
      }
    }
  }
}

function checkBarCapacities(groupsAndRounds, bars) {
  const barMap = new Map(
    bars.map((b) => {
      let cap = Number(b.available_spots);
      if (Number.isNaN(cap)) cap = 0;
      return [String(b._id), cap];
    })
  );

  const barRoundUsage = {};

  for (const [ageGroup, roundsObj] of Object.entries(groupsAndRounds)) {
    for (const [roundKey, barList] of Object.entries(roundsObj || {})) {
      for (const bar of barList) {
        const barId = String(bar.bar_id);
        if (!barRoundUsage[barId]) barRoundUsage[barId] = {};
        if (!barRoundUsage[barId][roundKey]) {
          barRoundUsage[barId][roundKey] = { total: 0, breakdown: {} };
        }

        let roundCount = 0;
        for (const group of bar.groups || []) {
          for (const team of group || []) {
            roundCount += Array.isArray(team.members) ? team.members.length : 0;
          }
        }

        barRoundUsage[barId][roundKey].total += roundCount;
        barRoundUsage[barId][roundKey].breakdown[ageGroup] =
          (barRoundUsage[barId][roundKey].breakdown[ageGroup] || 0) +
          roundCount;
      }
    }
  }

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
        name: bars.filter((b) => String(b._id) === barId)?.[0]?.name,
      };
    }
  }

  return { deficits, barRoundUsage };
}

function verifyGroups(groupsAndRounds) {
  const errors = [];
  const notes = {};

  for (const [ageGroup, rounds] of Object.entries(groupsAndRounds)) {
    const teamOpponents = new Map();

    for (const round of Object.values(rounds)) {
      for (const bar of round) {
        const groups = bar.groups || [];
        for (const group of groups) {
          const teamLabels = group.map(
            (t) => t?.name || t?.team_id || t?.id || "unknown"
          );

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

    const oppCounts = Array.from(teamOpponents.values()).map((s) => s.size);
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

  return Object.values(result).map((r) => ({
    age_group: r.age_group,
    team: r.team,
    unique_opponents: Object.keys(r.unique_opponents),
  }));
}

module.exports = {
  buildGroupsAndRoundsByAge: buildGroupsAndRounds,
  verifyGroups,
  dedupeBalanceReport,
  checkBarCapacities,
};

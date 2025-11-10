const uuidv4 = require("uuid");

const AGE_GROUPS = [
  { label: "20-30", min: 20, max: 30 },
  { label: "31-40", min: 31, max: 40 },
  { label: "41-50", min: 41, max: 50 },
  { label: "50+", min: 51, max: null },
];

// ✅ calculate age from DOB
function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--; // birthday not yet reached this year
  }
  return age;
}

// ✅ determine group from age
function getAgeGroup(age) {
  for (const g of AGE_GROUPS) {
    if (g.max === null) {
      if (age >= g.min) return g.label;
    } else if (age >= g.min && age <= g.max) {
      return g.label;
    }
  }
  return null;
}

function getId(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;
  const raw = obj.user_id || obj.id || obj._id;
  return raw ? raw.toString() : null;
}

function memberShape(p) {
  const id = getId(p);
  return {
    id,
    user_id: id,
    age: p.age,
    gender: p.gender || null,
    email: p.email || null,
    first_name: p.first_name || null,
    last_name: p.last_name || null,
  };
}

function formTeams(input) {
  // console.log("-----------------------------------");
  // console.log("forming team...");
  const participants = input.participants || [];
  const notes = [];
  const teams = [];
  const used = new Set();

  // Buckets by age_group
  const byAge = new Map();
  AGE_GROUPS.forEach((g) => byAge.set(g.label, []));
  // console.log("byAge: ", byAge);
  // console.log("participants: ", participants);

  function createTeam(members, age_group, already_registered_together = false) {
    teams.push({
      team_id: uuidv4.v4(),
      team_name: `Team ${teams.length + 1}`,
      age_group,
      members: members.map(memberShape),
      already_registered_together,
    });
  }

  // Step 1: handle main + invited_user_id pairs
  for (const main of participants) {
    const mainId = getId(main);
    if (!mainId || used.has(mainId)) continue;

    const group = getAgeGroup(main.age);
    if (!group) {
      notes.push(
        `Excluded ${main.first_name} (${main.age}) — outside supported groups.`
      );
      continue;
    }

    let partner = null;
    if (main.invited_user_id) {
      const inv = main.invited_user_id;
      const invId = getId(inv);
      if (typeof inv === "object") {
        partner = { ...inv, user_id: invId }; // full object
      }
    }

    if (partner && getAgeGroup(partner.age) === group) {
      // lock duo
      createTeam([main, partner], group, true);
      used.add(mainId);
      used.add(getId(partner));
    } else {
      byAge.get(group).push(main);
    }
  }

  // Step 2: form teams with minimum age gap
  for (const [age_group, people] of byAge) {
    const pool = people.filter((p) => !used.has(getId(p)));

    // Separate males and females
    const males = pool
      .filter((p) => p.gender === "male")
      .sort((a, b) => a.age - b.age);
    const females = pool
      .filter((p) => p.gender === "female")
      .sort((a, b) => a.age - b.age);

    const numberOfPairs = Math.min(males.length, females.length);

    for (let i = 0; i < numberOfPairs; i++) {
      const male = males[i];
      const female = females[i];

      createTeam([male, female], age_group);

      // We only need to update the main 'used' set
      used.add(getId(male));
      used.add(getId(female));
    }

    // Handle leftovers and pair same gender by closest age
    const maleLeftovers = males.filter((m) => !used.has(getId(m)));
    const femaleLeftovers = females.filter((f) => !used.has(getId(f)));

    const leftovers = maleLeftovers.length > 0 ? maleLeftovers : femaleLeftovers;

    for (let i = 0; i < leftovers.length - 1; i += 2) {
      const personA = leftovers[i];
      const personB = leftovers[i + 1];
      createTeam([personA, personB], age_group);
      used.add(getId(personA));
      used.add(getId(personB));
    }

    let finalLeftOver = null;
    if (maleLeftovers.length % 2 !== 0) {
        finalLeftOver = maleLeftovers[maleLeftovers.length - 1];
    } else if (femaleLeftovers.length % 2 !== 0) {
        finalLeftOver = femaleLeftovers[femaleLeftovers.length - 1];
    }

    if (finalLeftOver) {
      // find teams in this age_group that can accept a 3rd member
      const eligibleTeams = teams.filter(
        (t) =>
          // ensure that the team was not pre-registered together
          !t.already_registered_together &&
          t.age_group === age_group &&
          // make sure it's a 2-person team
          t.members.length === 2 &&
          // ensure it's not already all same gender as the leftover
          !t.members.every((m) => m.gender === finalLeftOver.gender)
      );

      if (eligibleTeams.length > 0) {
        // find team whose avg age is closest to unpaired's age
        let closestTeam = null;
        let smallestDiff = Infinity;

        for (const team of eligibleTeams) {
          const avgAge =
            team.members.reduce((sum, m) => sum + m.age, 0) /
            team.members.length;
          const diff = Math.abs(avgAge - finalLeftOver.age);

          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestTeam = team;
          }
        }

        // add unpaired to the closest eligible team
        if (closestTeam) {
          closestTeam.members.push(memberShape(finalLeftOver));
          used.add(getId(finalLeftOver));
        }
      } else {
        // if no suitable team found, optionally just skip or note it
        notes.push(
          `Unpaired ${finalLeftOver.first_name} ${finalLeftOver.last_name} (${finalLeftOver.gender}, ${finalLeftOver.age}) in ${age_group} had no suitable 3-person team.`
        );
      }
    }
  }

  return { teams, notes };
}

// ---- Helpers ----
function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function detectMode(teamCount) {
  if (teamCount < 12) return "CANCEL";
  if (teamCount >= 12 && teamCount <= 17) return "C";
  if (teamCount >= 18 && teamCount <= 23) return "B";
  return "A";
}

// Track team encounters across rounds (to avoid duplicates)
function makeEncounterTracker() {
  const seen = new Set();
  return {
    hasConflict(teamA, teamB) {
      const key = [teamA.team_id, teamB.team_id].sort().join("-");
      return seen.has(key);
    },
    addGroup(group) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = [group[i].team_id, group[j].team_id].sort().join("-");
          seen.add(key);
        }
      }
    }
  };
}

// Assign groups to bars with capacity check
function assignGroupsToBars(groups, bars, slot, ageGroup, notes) {
  console.log(groups[0], bars[0], slot, ageGroup, 'assignGroupsToBars');

  return groups.map((g, i) => {
    const bar = bars[i % bars.length];
    const neededSeats = g.reduce((acc, t) => acc + t.members.length, 0);
    if (neededSeats > bar.capacity) {
      notes.push(
        `Blocker: Bar ${bar.name} has ${bar.capacity} seats, but ${neededSeats} needed.`
      );
    }
    return {
      group_id: uid("group"),
      group_name: `Group ${i + 1}`,
      slot,
      bar_id: bar._id,
      bar_name: bar.name,
      age_group: ageGroup,
      teams: g
    };
  });
}

// ---- Mode A: ≥24 participants (≥12 teams), 3 rounds ----
function buildModeA(teams, bars, ageGroup) {
  const notes = [];
  const tracker = makeEncounterTracker();
  const results = [];

  const groupSize = 4;
  const rounds = 3;

  for (let round = 1; round <= rounds; round++) {
    let shuffled = shuffle(teams);
    const groups = [];

    for (let i = 0; i < shuffled.length; i += groupSize) {
      groups.push(shuffled.slice(i, i + groupSize));
    }

    // fix leftovers <3
    if (groups.length > 1 && groups[groups.length - 1].length < 3) {
      groups[groups.length - 2] = groups[groups.length - 2].concat(groups.pop());
    }

    // avoid duplicates
    groups.forEach(g => {
      const clean = [];
      g.forEach(t => {
        const conflict = clean.some(other => tracker.hasConflict(t, other));
        if (!conflict) clean.push(t);
        else clean.push(t); // fallback
      });
      tracker.addGroup(clean);
    });

    results.push(...assignGroupsToBars(groups, bars, round, ageGroup, notes));
  }

  return results;
}

// ---- Mode B: 18–23 participants (9–11 teams), 2 rounds, 3 groups ----
function buildModeB(teams, bars, ageGroup) {
  const notes = [];
  const tracker = makeEncounterTracker();
  const results = [];

  // Round 1
  let shuffled = shuffle(teams);
  let groups = [];
  for (let i = 0; i < 3; i++) groups.push([]);
  shuffled.forEach((t, i) => groups[i % 3].push(t));

  tracker.addGroup(groups.flat());

  results.push(...assignGroupsToBars(groups, bars, 1, ageGroup, notes));

  // Round 2: mix teams (ideally one from each start group)
  let round2 = [[], [], []];
  groups.forEach((g, gi) => {
    g.forEach((t, ti) => {
      round2[(gi + ti) % 3].push(t);
    });
  });

  // duplicate check
  round2.forEach(g => {
    const clean = [];
    g.forEach(t => {
      const conflict = clean.some(other => tracker.hasConflict(t, other));
      if (!conflict) clean.push(t);
      else clean.push(t);
    });
    tracker.addGroup(clean);
  });

  results.push(...assignGroupsToBars(round2, bars, 2, ageGroup, notes));

  return results;
}

// ---- Mode C: 12–17 participants (6–8 teams), 2 rounds, 2 groups ----
function buildModeC(teams, bars, ageGroup) {
  const notes = [];
  const tracker = makeEncounterTracker();
  const results = [];

  // Round 1
  let shuffled = shuffle(teams);
  const g1 = shuffled.slice(0, Math.ceil(shuffled.length / 2));
  const g2 = shuffled.slice(Math.ceil(shuffled.length / 2));

  tracker.addGroup(g1);
  tracker.addGroup(g2);

  results.push(...assignGroupsToBars([g1, g2], bars, 1, ageGroup, notes));

  // Round 2: reshuffle
  let shuffled2 = shuffle(teams);
  const h1 = shuffled2.slice(0, Math.ceil(shuffled2.length / 2));
  const h2 = shuffled2.slice(Math.ceil(shuffled2.length / 2));

  // enforce no duplicate pairs
  [h1, h2].forEach(g => {
    const clean = [];
    g.forEach(t => {
      const conflict = clean.some(other => tracker.hasConflict(t, other));
      if (!conflict) clean.push(t);
      else clean.push(t);
    });
    tracker.addGroup(clean);
  });

  results.push(...assignGroupsToBars([h1, h2], bars, 2, ageGroup, notes));

  return results;
}

// ---- Main Entry ----
function detectModeByParticipants(count) {
  if (count < 12) return "CANCEL";
  if (count >= 12 && count <= 17) return "C"; // 2 rounds
  if (count >= 18 && count <= 23) return "B"; // 2 rounds
  return "A"; // 24+ → 3 rounds
}

function genderCountsForTeams(teamArray) {
  let males = 0, females = 0;
  for (const t of teamArray) {
    for (const m of (t.members || [])) {
      if (m.gender === "male") males++;
      else if (m.gender === "female") females++;
    }
  }
  return { males, females, total: males + females };
}

function genderRatioOk(groupTeams) {
  const { males, females, total } = genderCountsForTeams(groupTeams);
  if (total === 0) return true;
  const mr = males / total;
  const fr = females / total;
  return mr <= 0.6 && fr <= 0.6;
}

// Distribute number of teams into groupCount buckets with min..max per bucket.
// Returns array of sizes or null if impossible.
function distributeGroupSizes(totalTeams, groupCount, minSize, maxSize) {
  // quick infeasible checks
  if (groupCount * minSize > totalTeams) return null;
  if (groupCount * maxSize < totalTeams) return null;

  const sizes = Array(groupCount).fill(minSize);
  let rem = totalTeams - minSize * groupCount;

  // Greedily fill groups up to maxSize distributing remainder
  for (let i = 0; i < groupCount && rem > 0; i++) {
    const canAdd = Math.min(maxSize - sizes[i], Math.ceil(rem / (groupCount - i)));
    sizes[i] += canAdd;
    rem -= canAdd;
  }

  if (rem !== 0) return null;
  return sizes;
}

// Build groups trying to keep gender ratio balanced per group.
// Returns { success: true, groups: [ [team,...], ... ] } or { success: false, reason }
function makeBalancedGroups(teams, groupCount, minSize, maxSize) {
  const totalTeams = teams.length;
  const sizes = distributeGroupSizes(totalTeams, groupCount, minSize, maxSize);
  if (!sizes) return { success: false, reason: "cannot distribute teams into groups with min/max constraints" };

  const remaining = teams.slice(); // shallow copy
  const groups = Array.from({ length: groupCount }, () => []);

  // For each group, pick teams to minimize |maleRatio - 0.5| while never exceeding 60% when possible.
  for (let gi = 0; gi < groupCount; gi++) {
    while (groups[gi].length < sizes[gi]) {
      let bestIdx = -1;
      let bestScore = Infinity;
      // try to find candidate that keeps ratio <= 0.6
      for (let idx = 0; idx < remaining.length; idx++) {
        const candidate = remaining[idx];
        const trialGroup = groups[gi].concat([candidate]);
        const { males, females, total } = genderCountsForTeams(trialGroup);
        const mr = total === 0 ? 0.5 : males / total;
        // if it already exceeds 60%, deprioritize
        const violates = total > 0 && (mr > 0.6 || (1 - mr) > 0.6);
        const score = Math.abs(mr - 0.5) + (violates ? 1000 : 0); // penalize violations heavily
        if (score < bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      }

      if (bestIdx === -1) {
        return { success: false, reason: "no candidate found to place into group" };
      }

      // if the best candidate still violates 60/40 (score penalty applied), we must fail strictly:
      const pick = remaining[bestIdx];
      const trial = groups[gi].concat([pick]);
      const counts = genderCountsForTeams(trial);
      if (counts.total > 0) {
        const mr = counts.males / counts.total;
        const fr = counts.females / counts.total;
        if (mr > 0.6 || fr > 0.6) {
          // cannot place any team without violating — fail
          return { success: false, reason: `would exceed 60/40 in group ${gi + 1}` };
        }
      }

      // commit selection
      groups[gi].push(pick);
      remaining.splice(bestIdx, 1);
    }
  }

  return { success: true, groups };
}

// Try to resolve duplicate team pairs across roundGroups using swaps.
// pairHistory is a Set of sorted "teamA-teamB" keys seen in previous rounds.
// Mutates roundGroups in place. Returns true if resolved, false if not.
function resolveDuplicates(roundGroups, pairHistory, notes) {
  // helper to check duplicates in a group
  const groupPairs = (group) => {
    const pairs = [];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pairs.push([group[i].team_id, group[j].team_id].sort().join("-"));
      }
    }
    return pairs;
  };

  // find any duplicate
  let foundDup = true;
  const maxIterations = 500;
  let iter = 0;

  while (foundDup && iter++ < maxIterations) {
    foundDup = false;

    for (let gi = 0; gi < roundGroups.length; gi++) {
      const g = roundGroups[gi];
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const key = [g[i].team_id, g[j].team_id].sort().join("-");
          if (pairHistory.has(key)) {
            foundDup = true;
            // try to swap g[j] with some team in other groups so that:
            // - swaps remove duplicate
            // - both affected groups keep gender ratio OK
            let swapped = false;
            for (let gj = 0; gj < roundGroups.length && !swapped; gj++) {
              if (gj === gi) continue;
              const other = roundGroups[gj];
              for (let k = 0; k < other.length && !swapped; k++) {
                // attempt swap g[j] <-> other[k]
                const newA = g.slice(); newA[j] = other[k];
                const newB = other.slice(); newB[k] = g[j];
                if (genderRatioOk(newA) && genderRatioOk(newB)) {
                  // apply swap
                  roundGroups[gi][j] = other[k];
                  roundGroups[gj][k] = g[j];
                  swapped = true;
                  notes.push(`🔁 Swapped teams to remove duplicate pair ${key}`);
                }
              }
            }

            if (!swapped) {
              // attempt another approach: try swapping g[i] instead of g[j]
              let swapped2 = false;
              for (let gj = 0; gj < roundGroups.length && !swapped2; gj++) {
                if (gj === gi) continue;
                const other = roundGroups[gj];
                for (let k = 0; k < other.length && !swapped2; k++) {
                  const newA = g.slice(); newA[i] = other[k];
                  const newB = other.slice(); newB[k] = g[i];
                  if (genderRatioOk(newA) && genderRatioOk(newB)) {
                    roundGroups[gi][i] = other[k];
                    roundGroups[gj][k] = g[i];
                    swapped2 = true;
                    notes.push(`🔁 Swapped teams to remove duplicate pair ${key}`);
                  }
                }
              }
              if (!swapped2) {
                // cannot resolve this duplicate via swaps
                return false;
              }
            }
          }
          if (!foundDup) break;
        }
        if (foundDup) break;
      }
      if (foundDup) break;
    }
  }

  // If we exit loop w/out resolving all duplicates, fail
  if (iter >= maxIterations) return false;
  return true;
}

// Assign groups to bars allowing multiple groups per bar as long as capacity holds.
// bars: array of { _id, name, capacity }
// groups: array of groups { teams: [...] }
// Returns { success: true, assignedGroups: [ { group, bar } ... ] } or success:false
function assignGroupsToBars(roundGroups, bars, notes) {
  // compute group sizes (people)
  const groupSizes = roundGroups.map(g => g.reduce((acc, t) => acc + (t.members?.length || 0), 0));

  // make bar free capacities
  const barCaps = bars.map(b => ({ ...b, free: b.capacity }));

  // sort groups descending by size (greedy fit)
  const idxs = groupSizes.map((_, i) => i).sort((a, b) => groupSizes[b] - groupSizes[a]);

  const assignment = Array(roundGroups.length).fill(null);

  for (const gi of idxs) {
    const size = groupSizes[gi];
    // pick bar with enough free capacity, prefer smallest that fits (best-fit)
    let chosenIdx = -1;
    let bestRemain = Infinity;
    for (let bi = 0; bi < barCaps.length; bi++) {
      if (barCaps[bi].free >= size) {
        const remain = barCaps[bi].free - size;
        if (remain < bestRemain) {
          bestRemain = remain;
          chosenIdx = bi;
        }
      }
    }
    if (chosenIdx === -1) {
      // cannot place group
      notes.push(`❌ Cannot place group of ${size} people into any bar (insufficient capacity).`);
      return { success: false };
    }
    assignment[gi] = barCaps[chosenIdx];
    barCaps[chosenIdx].free -= size;
  }

  // create result list
  const result = roundGroups.map((g, i) => ({
    group: g,
    bar: assignment[i]
  }));

  return { success: true, assigned: result };
}


// Main function ---------------------------------------------------

function initBars(bars) {
  // fresh copy for each round with capacity tracking
  return bars.map(b => ({
    ...b,
    remaining_spots: b.available_spots
  }));
}

function assignGroupsToSharedBars(groups, bars, notes, round, age_group) {
  const assigned = [];
  const unassignedTeams = [];

  for (const group of groups) {
    let leftovers = [...group]; // start with all teams

    for (const bar of bars) {
      if (leftovers.length === 0) break; // all placed already

      const groupInBar = [];
      const stillLeft = [];

      for (const team of leftovers) {
        const teamSize = team.members.length;
        if (bar.available_spots >= teamSize) {
          bar.available_spots -= teamSize;
          groupInBar.push(team);
        } else {
          stillLeft.push(team);
        }
      }

      if (groupInBar.length > 0) {
        assigned.push({ bar, group: groupInBar });
      }

      leftovers = stillLeft; // try remaining teams in next bar
    }

    // ❌ whatever is left after checking all bars = unassigned
    if (leftovers.length > 0) {
      leftovers.forEach(team => {
        unassignedTeams.push({
          ...team,
          reason: "No bar capacity",
          round,
          age_group
        });
      });
      notes.push(
        `⚠️ Teams ${leftovers.map(t => t.team_id).join(", ")} from ${age_group} round ${round} skipped (no bar capacity).`
      );
    }
  }

  return { success: true, assigned, unassignedTeams };
}


function buildGroupsAndRoundsByAge(allTeams, allBars = []) {
  const groupsAndRounds = [];
  const notes = [];
  const cancelledTeams = []; // ✅ collect canceled teams here

  // 1) group teams by age_group
  const byAge = new Map();
  for (const t of allTeams) {
    if (!byAge.has(t.age_group)) byAge.set(t.age_group, []);
    byAge.get(t.age_group).push(t);
  }

  // 2) per age group
  for (const [age_group, teams] of byAge.entries()) {
    const teamCount = teams.length;
    if (teamCount < 6) {
      notes.push(`❌ Event canceled for ${age_group} (<6 teams / <12 participants).`);
      cancelledTeams.push(...teams.map(t => ({ ...t, reason: "Too few teams" })));
      continue;
    }

    const global = genderCountsForTeams(teams);
    if (global.total > 0) {
      const maleRatio = global.males / global.total;
      const femaleRatio = global.females / global.total;
      if (maleRatio > 0.6 || femaleRatio > 0.6) {
        notes.push(`❌ Cannot satisfy 60/40 globally for ${age_group} (male:${global.males}, female:${global.females}). Canceling age group.`);
        cancelledTeams.push(...teams.map(t => ({ ...t, reason: "Global gender imbalance" })));
        continue;
      }
    }

    let mode, rounds, desiredGroupCount;
    if (teamCount >= 12) { mode = "A"; rounds = 3; desiredGroupCount = Math.max(4, Math.floor(teamCount / 3)); }
    else if (teamCount >= 9) { mode = "B"; rounds = 2; desiredGroupCount = 3; }
    else { mode = "C"; rounds = 2; desiredGroupCount = 2; }

    const tempRounds = [];
    const pairHistory = new Set();
    let canceledAgeGroup = false;

    for (let r = 0; r < rounds && !canceledAgeGroup; r++) {
      const minTeamsPerGroup = 3;
      const maxTeamsPerGroup = (mode === "A") ? 5 : 4;

      const makeResult = makeBalancedGroups(teams, desiredGroupCount, minTeamsPerGroup, maxTeamsPerGroup);
      if (!makeResult.success) {
        notes.push(`❌ Failed to form balanced groups for ${age_group}, round ${r+1}: ${makeResult.reason}.`);
        cancelledTeams.push(...teams.map(t => ({ ...t, reason: "Failed balanced grouping" })));
        canceledAgeGroup = true;
        break;
      }
      let roundGroups = makeResult.groups;

      const dupResolved = resolveDuplicates(roundGroups, pairHistory, notes);
      if (!dupResolved) {
        notes.push(`❌ Could not resolve duplicate meetings for ${age_group}, round ${r+1}.`);
        // Instead of cancelling whole age group:
        const badGroups = roundGroups.filter(grp => !isUnique(grp, pairHistory));
        cancelledTeams.push(...badGroups.flat().map(t => ({
          ...t,
          reason: "Duplicate meetings",
          round: r+1,
          age_group
        })));
        canceledAgeGroup = true;
        break;
      }

      // gender ratio check
      let violated = false;
      for (let gi = 0; gi < roundGroups.length; gi++) {
        if (!genderRatioOk(roundGroups[gi])) {
          violated = true;
          notes.push(`❌ Group ${gi+1} in ${age_group} round ${r+1} violates 60/40.`);
        }
      }
      if (violated) {
        cancelledTeams.push(...teams.map(t => ({ ...t, reason: "Gender ratio violation" })));
        canceledAgeGroup = true;
        break;
      }

      // ✅ bar assignment (shared capacity)
      const bars = initBars(allBars);
      const assignResult = assignGroupsToSharedBars(roundGroups, bars, notes, r+1, age_group);

      if (assignResult.unassignedTeams.length > 0) {
        notes.push(`⚠️ Some teams could not be assigned to bars in ${age_group}, round ${r+1}.`);
        cancelledTeams.push(...assignResult.unassignedTeams); // collect only unassigned
      }

      const groupsOut = assignResult.assigned.map((slot, gi) => {
        const groupId = `${age_group}-R${r+1}-G${gi+1}`;
        return {
          group_id: groupId,
          bar_id: slot.bar._id,
          bar_name: slot.bar.name,
          teams: slot.group
        };
      });

      // update pairHistory
      for (const grp of roundGroups) {
        for (let i = 0; i < grp.length; i++) {
          for (let j = i + 1; j < grp.length; j++) {
            const key = [grp[i].team_id, grp[j].team_id].sort().join("-");
            pairHistory.add(key);
          }
        }
      }

      tempRounds.push({
        age_group,
        mode,
        round: r + 1,
        groups: groupsOut
      });
    }

    if (!canceledAgeGroup) {
      groupsAndRounds.push(...tempRounds);
    }
  }

  return { groupsAndRounds, notes, cancelledTeams };
}


// function buildGroupsAndRounds(teams, bars) {
//   const results = [];
//   const notes = [];

//   const byAgeGroup = {};
//   teams.forEach(team => {
//     if (!byAgeGroup[team.age_group]) byAgeGroup[team.age_group] = [];
//     byAgeGroup[team.age_group].push(team);
//   });

//   Object.keys(byAgeGroup).forEach(ageGroup => {
//     const groupTeams = byAgeGroup[ageGroup];
//     const mode = detectMode(groupTeams.length);

//     if (mode === "CANCEL") {
//       notes.push(`${ageGroup}: Not enough teams (<12), event canceled.`);
//       return;
//     }

//     if (mode === "A") {
//       results.push(...buildModeA(groupTeams, bars, ageGroup));
//     } else if (mode === "B") {
//       results.push(...buildModeB(groupTeams, bars, ageGroup));
//     } else if (mode === "C") {
//       results.push(...buildModeC(groupTeams, bars, ageGroup));
//     }
//   });

//   return { results, notes };
// }

function summarizeSlots(input) {
  const groupsAndRounds = Array.isArray(input)
    ? input
    : Array.isArray(input?.results)
      ? input.results
      : [input];

  const summary = [];
  let maxSlot = 0;

  (groupsAndRounds || []).forEach(roundSet => {
    const age_group = roundSet.age_group || "unknown";
    const round = roundSet.round || 1;

    if (round > maxSlot) maxSlot = round;

    const groupSummaries = (roundSet.groups || []).map((group, groupIdx) => {
      const teams = (group.teams || []).map(team => {
        const members = Array.isArray(team.members) ? team.members : [];
        return {
          team_id: team.team_id,
          team_name: team.team_name,
          participant_count: members.length,
          members
        };
      });

      const totalParticipants = teams.reduce((sum, t) => sum + t.participant_count, 0);

      return {
        group_id: group.group_id || `${age_group}_round${round}_group${groupIdx + 1}`,
        group_name: `Group ${groupIdx + 1}`,
        age_group,
        bar_id: group.bar_id,
        bar_name: group.bar_name,
        team_count: teams.length,
        participant_count: totalParticipants,
        teams
      };
    });

    summary.push({
      slot: round,
      age_group,
      group_count: groupSummaries.length,
      participant_count: groupSummaries.reduce((sum, g) => sum + g.participant_count, 0),
      groups: groupSummaries
    });
  });

  return {
    total_slots: maxSlot,
    slots: summary
  };
}


module.exports = {
    // getAgeGroup,
    formTeams,
    summarizeSlots,
    AGE_GROUPS,
    buildGroupsAndRoundsByAge
  };

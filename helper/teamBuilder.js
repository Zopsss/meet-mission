// =========================
// CONFIG
// =========================
const CONFIG = {
  teamAgeGapStages: [5, 7, 10, 12], // T0..T3
  groupAgeSpreadTarget: 10,
  groupAgeSpreadMax: 12,
  minOrientationConnectivityPerTeam: 2, // inside each group
  localSwapIterations: 12,
  // scoring weights (group quality)
  W: {
    ageSpread: -1.0,                // smaller spread is better (negative weight)
    orientationDensity: 1.0,        // more mutual-orientation edges between teams
    avgInterTeamSoft: 1.0,          // average soft score between teams
    kidsHomogeneityBonus: 0.5       // if relationship-heavy & kids status homogeneous
  }
};

// =========================
// UTIL: trait mapping & scores
// =========================
function mapFeel(v){ return ({ introvert:0, ambivert:0.5, extrovert:1 })[v]; }
function mapSpend(v){ return ({ closeness_seeker:0, both_seeker:0.5, activity_seeker:1 })[v]; }
function mapStructured(v){ return ({ free_spirited:0, structured:1 })[v]; }
function mapRole(v){ return ({ harmony:0, dominance:1 })[v]; }

function softVector(p){
  return [
    mapFeel(p.feel_around_new_people),
    mapSpend(p.prefer_spending_time),
    mapStructured(p.describe_you_better),
    mapRole(p.describe_role_in_relationship),
  ];
}

function l1Distance01(vecA, vecB){
  const d = vecA.reduce((s, a, i) => s + Math.abs(a - vecB[i]), 0);
  return d / 4.0; // normalized [0..1]
}

function prefScore(a, b){
  const va = softVector(a), vb = softVector(b);
  const dist = l1Distance01(va, vb);
  const lens = (p) => (p.kind_of_person === 'similar') ? (1 - dist) : dist;
  return (lens(a) + lens(b)) / 2;
}

// =========================
// UTIL: orientation logic
// =========================
function wants(p, gender){
  if (p.looking_for === 'both') return true;
  if (gender === 'diverse') {
    // conservative: only match diverse if counterpart is 'both'
    return p.looking_for === 'both';
  }
  return p.looking_for === gender;
}

function mutualOrientation(a, b){
  return wants(a, b.gender) && wants(b, a.gender);
}

const AGE_BUCKETS = ["18-30", "31-40", "41-50+"];

function getAgeGroup(age) {
  if (age >= 18 && age <= 30) return "18-30";
  if (age >= 31 && age <= 40) return "31-40";
  return "41-50+";
}

/**
 * Accepts either:
 *  - an object with .teams (array of teams), or
 *  - directly an array of teams
 * Returns a strict label if all members share the same bucket, else "mixed".
 */
function assignAgeGroupToGroup(groupOrTeams) {
  const teams = Array.isArray(groupOrTeams) ? groupOrTeams : (groupOrTeams?.teams ?? []);
  const allGroups = teams.flatMap(t => t.members.map(m => getAgeGroup(m.age)));
  const uniq = [...new Set(allGroups)];
  return uniq.length === 1 ? uniq[0] : "mixed";
}

// --- Age mixing guard: forbid 18-30 with 41-50+ in the SAME group ---
function maxBucketSpan(teams) {
  // collect bucket indices for ALL members across provided teams
  const idxs = teams.flatMap(t => t.members.map(m => AGE_BUCKETS.indexOf(getAgeGroup(m.age))));
  if (!idxs.length) return 0;
  return Math.max(...idxs) - Math.min(...idxs);
}
function isExtremeMix(teams) {
  // span >= 2 means we have 18-30 and 41-50+ together -> forbid
  return maxBucketSpan(teams) >= 2;
}

// =========================
// STEP 1: TEAMS
// - fixed duos placed first
// - singles matched T0..T3 (age ladder) with soft-score maximization
// =========================
function buildTeams(participants) {
  // Normalize ids to strings to avoid ObjectId object refs in equality checks
  const norm = (id) => (id && id.toString ? id.toString() : String(id));
  const byId = new Map(participants.map(p => [norm(p.user_id), p]));

  const fixedTeams = [];
  const seenInFixed = new Set();

  // Helper: age group assignment
  function getAgeGroup(age) {
    if (age <= 30) return "18-30";
    if (age <= 40) return "31-40";
    return "41-50+";
  }

  // Build fixed duos by invited_user_id (if present, they must be in the same team)
  for (const p of participants) {
    const pid = norm(p.user_id);
    if (seenInFixed.has(pid)) continue;
    if (p.invited_user_id && p.invited_user_id.user_id) {
      const qid = norm(p.invited_user_id.user_id);
      const q = byId.get(qid);
      if (q) {
        seenInFixed.add(pid);
        seenInFixed.add(qid);

        fixedTeams.push({
          team_name: `Team ${fixedTeams.length + 1}`,
          age_group: getAgeGroup(Math.round((p.age + q.age) / 2)), // use average
          members: [
            { id: pid, age: p.age, gender: p.gender, looking_for: p.looking_for, relationship_goal: p.relationship_goal, children: p.children, _raw: p },
            { id: qid, age: q.age, gender: q.gender, looking_for: q.looking_for, relationship_goal: q.relationship_goal, children: q.children, _raw: q }
          ]
        });
      }
    }
  }

  // Singles pool (not in a fixed duo)
  const singles = participants.filter(p => !seenInFixed.has(norm(p.user_id)));

  // Helper: hard compatibility up to stage age gap
  function hardCompatible(a, b, maxGap) {
    if (Math.abs(a.age - b.age) > maxGap) return false;

    // 🚫 Avoid pairing 18-30 with 41-50+
    const agA = getAgeGroup(a.age);
    const agB = getAgeGroup(b.age);
    if ((agA === "18-30" && agB === "41-50+") || (agB === "18-30" && agA === "41-50+")) {
      return false;
    }

    if (a.relationship_goal !== b.relationship_goal) return false;
    if (a.relationship_goal === 'relationship' && a.children !== b.children) return false;
    if (!mutualOrientation(a, b)) return false;
    return true;
  }

  // Greedy per stage: for each person, pick highest soft-score partner satisfying hard rules
  const matched = new Set();
  const teams = [...fixedTeams];

  for (const maxGap of CONFIG.teamAgeGapStages) {
    for (let i = 0; i < singles.length; i++) {
      const A = singles[i];
      const aid = norm(A.user_id);
      if (matched.has(aid)) continue;
      let best = null;
      let bestScore = -Infinity;

      for (let j = i + 1; j < singles.length; j++) {
        const B = singles[j];
        const bid = norm(B.user_id);
        if (matched.has(bid)) continue;
        if (!hardCompatible(A, B, maxGap)) continue;

        const s = prefScore(A, B);
        if (s > bestScore) {
          bestScore = s;
          best = B;
        }
      }

      if (best) {
        const bid = norm(best.user_id);
        matched.add(aid);
        matched.add(bid);

        teams.push({
          team_name: `Team ${teams.length + 1}`,
          age_group: getAgeGroup(Math.round((A.age + best.age) / 2)),
          members: [
            { id: aid, age: A.age, gender: A.gender, looking_for: A.looking_for, relationship_goal: A.relationship_goal, children: A.children, _raw: A },
            { id: bid, age: best.age, gender: best.gender, looking_for: best.looking_for, relationship_goal: best.relationship_goal, children: best.children, _raw: best }
          ]
        });
      }
    }
  }

  // Leftovers (if any): LAST RESORT small relax — pair arbitrarily to avoid dropouts.
  const leftovers = singles.filter(p => !matched.has(norm(p.user_id)));
  for (let i = 0; i + 1 < leftovers.length; i += 2) {
    const A = leftovers[i], B = leftovers[i + 1];
    teams.push({
      team_name: `Team ${teams.length + 1}`,
      age_group: getAgeGroup(Math.round((A.age + B.age) / 2)),
      members: [
        { id: norm(A.user_id), age: A.age, gender: A.gender, looking_for: A.looking_for, relationship_goal: A.relationship_goal, children: A.children, _raw: A },
        { id: norm(B.user_id), age: B.age, gender: B.gender, looking_for: B.looking_for, relationship_goal: B.relationship_goal, children: B.children, _raw: B }
      ]
    });
  }

  return teams;
}


// =========================
// STEP 2: GROUPS
// - 4 teams per group
// - control age spread and orientation connectivity
// - local 2-team swap improvements
// =========================
function teamAvgAge(team){
  const ages = team.members.map(m => m.age);
  return ages.reduce((a,b)=>a+b,0)/ages.length;
}
function groupAgeSpread(teamList){
  const ages = teamList.flatMap(t => t.members.map(m => m.age));
  return Math.max(...ages) - Math.min(...ages);
}
function teamToTeamSoftScore(teamA, teamB){
  let total = 0, count = 0;
  for (const a of teamA.members) for (const b of teamB.members) {
    total += prefScore(a._raw ?? a, b._raw ?? b);
    count++;
  }
  return count ? total / count : 0;
}
function teamConnectivityCount(team, others){
  // Count how many distinct other teams have at least one mutual-orientation edge with this team
  let connected = 0;
  for (const other of others) {
    let ok = false;
    outer: for (const a of team.members) {
      for (const b of other.members) {
        if (mutualOrientation(a, b)) { ok = true; break outer; }
      }
    }
    if (ok) connected += 1;
  }
  return connected;
}
function groupOrientationDensity(teams){
  // fraction of (team,otherTeam) pairs that have at least one mutual-orientation edge
  let edges = 0, possible = 0;
  for (let i=0;i<teams.length;i++){
    for (let j=i+1;j<teams.length;j++){
      possible++;
      let ok = false;
      outer: for (const a of teams[i].members) for (const b of teams[j].members) {
        if (mutualOrientation(a,b)) { ok = true; break outer; }
      }
      if (ok) edges++;
    }
  }
  return possible ? edges / possible : 0;
}
function groupAvgInterTeamSoft(teams){
  let total = 0, count = 0;
  for (let i=0;i<teams.length;i++){
    for (let j=i+1;j<teams.length;j++){
      total += teamToTeamSoftScore(teams[i], teams[j]);
      count++;
    }
  }
  return count ? total / count : 0;
}
function kidsHomogeneityBonus(teams){
  // If relationship-heavy (≥ 3 teams where all members goal=relationship), and those teams share same kids status -> bonus
  const relTeams = teams.filter(t => t.members.every(m => m.relationship_goal === 'relationship'));
  if (relTeams.length < 3) return 0;
  const kidsSets = relTeams.map(t => t.members.every(m => m.children === true) ? 'all_true'
                    : t.members.every(m => m.children === false) ? 'all_false'
                    : 'mixed');
  const allSame = kidsSets.every(k => k === kidsSets[0]) && kidsSets[0] !== 'mixed';
  return allSame ? 1 : 0;
}
function groupQualityScore(teams){
  const spread = groupAgeSpread(teams);
  const density = groupOrientationDensity(teams);
  const avgSoft = groupAvgInterTeamSoft(teams);
  const bonusKids = kidsHomogeneityBonus(teams);

  const w = CONFIG.W;
  return (
    w.ageSpread * spread +
    w.orientationDensity * density +
    w.avgInterTeamSoft * avgSoft +
    w.kidsHomogeneityBonus * bonusKids
  );
}
function validGroupHard(teams){
  if (teams.length !== 4) return false;
  if (isExtremeMix(teams)) return false;                 // NEW: forbid 18-30 with 41-50+
  const spread = groupAgeSpread(teams);
  if (spread > CONFIG.groupAgeSpreadMax) return false;
  // per-team connectivity at least 2
  for (const t of teams) {
    const others = teams.filter(x => x !== t);
    const c = teamConnectivityCount(t, others);
    if (c < CONFIG.minOrientationConnectivityPerTeam) return false;
  }
  return true;
}

function formGroups(teams){
  const sorted = [...teams].sort((a,b)=>teamAvgAge(a)-teamAvgAge(b));
  const groups = [];

  while (sorted.length){
    const group = [sorted.shift()];
    while (group.length < 4 && sorted.length){
      let idxBest = -1, bestDelta = -Infinity;
      for (let i=0;i<sorted.length;i++){
        const tryGroup = [...group, sorted[i]];
        if (isExtremeMix(tryGroup)) continue;                        // NEW: block far age mix
        const spread = groupAgeSpread(tryGroup);
        if (spread > CONFIG.groupAgeSpreadMax) continue;
        const delta = groupQualityScore(tryGroup) - groupQualityScore(group);
        if (delta > bestDelta) { bestDelta = delta; idxBest = i; }
      }
      if (idxBest === -1) {
        // fallback: keep going, but still avoid extreme mix if possible
        let fallbackIndex = -1;
        for (let i=0;i<sorted.length;i++){
          const tryGroup = [...group, sorted[i]];
          if (!isExtremeMix(tryGroup)) { fallbackIndex = i; break; }
        }
        if (fallbackIndex === -1) fallbackIndex = 0; // truly stuck, take anything and fix later with swaps
        group.push(sorted.splice(fallbackIndex,1)[0]);
      } else {
        group.push(sorted.splice(idxBest,1)[0]);
      }
    }
    if (group.length < 4 && groups.length){
      const need = 4 - group.length;
      for (let k=0;k<need;k++){
        const donor = groups[groups.length-1];
        group.push(donor.pop());
      }
    }
    groups.push(group);
  }

  // Local improvements via 2-team swaps between groups
  for (let it=0; it<CONFIG.localSwapIterations; it++){
    let improved = false;
    for (let g1=0; g1<groups.length; g1++){
      for (let g2=g1+1; g2<groups.length; g2++){
        const G1 = groups[g1], G2 = groups[g2];
        for (let i=0;i<G1.length;i++){
          for (let j=0;j<G2.length;j++){
            const t1 = G1[i], t2 = G2[j];
            const newG1 = [...G1.slice(0,i), t2, ...G1.slice(i+1)];
            const newG2 = [...G2.slice(0,j), t1, ...G2.slice(j+1)];
            if (!validGroupHard(newG1) || !validGroupHard(newG2)) continue;

            const oldTotal = groupQualityScore(G1) + groupQualityScore(G2);
            const newTotal = groupQualityScore(newG1) + groupQualityScore(newG2);
            if (newTotal > oldTotal) {
              groups[g1] = newG1;
              groups[g2] = newG2;
              improved = true;
            }
          }
        }
      }
    }
    if (!improved) break;
  }

  // If any group violated hard constraints (rare), try a quick neighbor swap fix
  for (let g=0; g<groups.length; g++){
    if (!validGroupHard(groups[g])) {
      // attempt any single swap with neighbor to fix
      const h = (g+1) % groups.length;
      const G1 = groups[g], G2 = groups[h];
      outer:
      for (let i=0;i<G1.length;i++){
        for (let j=0;j<G2.length;j++){
          const newG1 = [...G1.slice(0,i), G2[j], ...G1.slice(i+1)];
          const newG2 = [...G2.slice(0,j), G1[i], ...G2.slice(j+1)];
          if (validGroupHard(newG1) && validGroupHard(newG2)) {
            groups[g]=newG1; groups[h]=newG2; break outer;
          }
        }
      }
    }
  }

  // Name groups and return
  return groups.map((teams, idx) => ({
    group_id: `Group ${idx+1}`,
    age_group: assignAgeGroupToGroup(teams),   // FIX: compute from all members
    teams
  }));
}

// =========================
// STEP 3: SCHEDULING (3 rounds, no repeat encounters)
// Simple round-robin on group IDs
// =========================
function scheduleRounds(groupIds){
  const ids = [...groupIds];
  const G = ids.length;
  if (G < 2) return [[[ids[0], null]]];

  // standard round-robin (circle method)
  const rounds = [];
  let rotation = ids.map((_, i) => i); // indices 0..G-1
  for (let r = 0; r < G - 1; r++) {
    const matches = [];
    for (let i = 0; i < Math.floor(G / 2); i++) {
      const a = rotation[i];
      const b = rotation[G - 1 - i];
      matches.push([ids[a], ids[b]]);
    }
    // rotate (keep first fixed)
    rotation = [rotation[0], rotation[G - 1], ...rotation.slice(1, G - 1)];
    rounds.push(matches);
    if (rounds.length === 3) break; // only need 3 rounds
  }
  // If G is odd, one group sits out each round; you can add a "joker" later if needed.
  return rounds;
}

// =========================
// STEP 4: BAR ASSIGNMENT PER ROUND
// Distribute groups to bars respecting capacity (available_spots / 8 people per group)
// =========================
function assignBarsPerRound(groups, rounds, bars){
  const groupPeople = new Map(groups.map(g => [g.group_id, g.teams.reduce((s,t)=>s+t.members.length,0)]));
  const barCaps = bars.map(b => ({
    bar_id: String(b._id ?? b.bar_id ?? b.id ?? 'bar_unknown'),
    groupsCapacity: Math.floor((b.available_spots ?? 0) / 8)
  }));
  if (!barCaps.length) barCaps.push({ bar_id: 'bar_default', groupsCapacity: 999 });

  const result = [];
  rounds.forEach((matchups, roundIdx) => {
    const appearing = new Set();
    for (const [g1, g2] of matchups) {
      if (g1) appearing.add(g1);
      if (g2) appearing.add(g2);
    }
    const appearList = Array.from(appearing);
    const capLeft = barCaps.map(b => ({...b}));
    let barPtr = 0;

    for (const gid of appearList) {
      let tries = 0;
      while (tries < capLeft.length && capLeft[barPtr].groupsCapacity <= 0) {
        barPtr = (barPtr + 1) % capLeft.length;
        tries++;
      }
      const bar_id = capLeft[barPtr].bar_id;
      capLeft[barPtr].groupsCapacity -= 1;

      const group = groups.find(x => x.group_id === gid);
      result.push({
        group_name: gid,
        slot: roundIdx + 1,
        bar_id,
        age_group: group.age_group,                                        // FIX
        teams: group.teams.map(t => ({
          team_name: t.team_name,
          age_group: t.age_group,                                          // FIX
          members: t.members.map(m => ({ id: String(m.id), age: m.age }))
        }))
      });

      barPtr = (barPtr + 1) % capLeft.length;
    }
  });

  return result;
}

function determineAgeGroup(members) {
  // Extract ages from members
  const ages = members?.map(m => m.age).filter(Boolean);

  if (ages.length === 0) return "unknown";

  // Use average or min/max depending on your grouping logic
  const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;

  if (avgAge >= 18 && avgAge <= 30) return "18-30";
  if (avgAge >= 31 && avgAge <= 40) return "31-40";
  if (avgAge >= 41) return "41-50+";

  return "unknown";
}

function wrapTeams(rawTeams, groupName, slotIdx) {
  return rawTeams.map((members, idx) => {
    const age_group = determineAgeGroup(members); // your function to categorize by age
    return {
      team_name: `${groupName}-Slot${slotIdx}-Team${idx + 1}`,
      age_group,
      members
    };
  });
}

// Assign bars per SLOT (not per round-robin)
function assignBarsForSlotGroups(groupsBySlot, bars) {
  const barCapsBase = (bars?.length ? bars : [{ _id: 'bar_default', available_spots: 9999 }])
    .map(b => ({
      bar_id: String(b._id ?? b.bar_id ?? b.id ?? 'bar_unknown'),
      groupsCapacity: Math.floor((b.available_spots ?? 0) / 8)
    }));

  const out = [];
  const slots = Math.max(...groupsBySlot.map(g => g.slot));

  for (let s = 1; s <= slots; s++) {
    // flatten to actual groups inside this slot
    let slotGroups = groupsBySlot
      .filter(g => g.slot === s);


    // console.log(JSON.stringify(slotGroups), 'slotgroup');
    
    const totalCap = barCapsBase.reduce((sum, b) => sum + b.groupsCapacity, 0);
    const numMiniSlots = Math.ceil(slotGroups.length / totalCap);

    let miniSlotIdx = 0;
    while (slotGroups.length) {
      const groupsThisMiniSlot = slotGroups.splice(0, totalCap);
      const cap = barCapsBase.map(x => ({ ...x }));
      let ptr = 0;

      for (const g of groupsThisMiniSlot) {
        let tries = 0;
        while (tries < cap.length && cap[ptr].groupsCapacity <= 0) {
          ptr = (ptr + 1) % cap.length;
          tries++;
        }

        let bar_id;
        if (cap[ptr].groupsCapacity <= 0) {
          bar_id = 'bar_default';
        } else {
          bar_id = cap[ptr].bar_id;
          cap[ptr].groupsCapacity -= 1;
        }
        console.log(JSON.stringify(g.groups), 'g');
        
        g.groups.map((m) => { out.push({
          group_name: m.group_name,
          slot: s, // ✅ always use the outer slot number
          bar_id,
          age_group: m.age_group,
          teams: m.teams && wrapTeams(m.teams, m.group_name, s)
          // teams: g.teams.map(t => ({
          //   team_name: t.team_name,
          //   age_group: t.age_group,
          //   members: t.members.map(m => ({ id: m.id, age: m.age }))
          // }))
        })})
        ;

        ptr = (ptr + 1) % cap.length;
      }

      miniSlotIdx++;
    }
  }

  return out;
}

function createSchedule(teams, slots) {
  const perSlot = [];
  const seenPairs = new Set();

  for (let slot = 1; slot <= slots; slot++) {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const groups = [];

    while (shuffled.length > 0) {
      // pick between 2 and 4 teams for this group
      const groupSize = Math.min(
        Math.max(2, Math.floor(Math.random() * 3) + 2), // random 2–4
        shuffled.length
      );

      const groupTeams = [shuffled.shift()];
      while (groupTeams.length < groupSize && shuffled.length > 0) {
        // pick a candidate that minimizes repeats
        let idx = shuffled.findIndex(candidate =>
          groupTeams.every(
            existing => {
              const pairKey = [existing.team_name, candidate.team_name].sort().join("-");
              return !seenPairs.has(pairKey);
            }
          )
        );

        // if none available, take the next one anyway
        if (idx === -1) idx = 0;

        groupTeams.push(shuffled.splice(idx, 1)[0]);
      }

      // record all pairs inside this group
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const pairKey = [groupTeams[i].team_name, groupTeams[j].team_name].sort().join("-");
          seenPairs.add(pairKey);
        }
      }

      groups.push({
        group_name: `Slot${slot}-Group${groups.length + 1}`,
        age_group: determineAgeGroup(groupTeams.flatMap(t => t.members)),
        teams: groupTeams
      });
    }

    perSlot.push({ slot, groups });
  }

  return perSlot;
}

// function createSchedule(teams, totalSlots = 3) {
//   const seenPairs = new Set();

//   // helper: check bad age match
//   const isBadAgeMatch = (t1, t2) =>
//     (t1.age_group === "18-30" && (t2.age_group === "41-50+" || t2.age_group === "51+")) ||
//     (t2.age_group === "18-30" && (t1.age_group === "41-50+" || t1.age_group === "51+"));

//   const pairKey = (t1, t2) =>
//     [t1.team_name, t2.team_name].sort().join("-");

//   const slots = [];

//   for (let slot = 1; slot <= totalSlots; slot++) {
//     const used = new Set();
//     const groups = [];

//     while (used.size < teams?.length) {
//       const groupTeams = [];

//       // pick up to 4 teams for this group
//       for (let i = 0; i < teams.length && groupTeams.length < 4; i++) {
//         if (used.has(i)) continue;
//         groupTeams.push(teams[i]);
//         used.add(i);
//       }

//       if (groupTeams.length === 0) break;

//       // register pairings inside this group
//       for (let i = 0; i < groupTeams.length; i++) {
//         for (let j = i + 1; j < groupTeams.length; j++) {
//           const t1 = groupTeams[i];
//           const t2 = groupTeams[j];
//           const key = pairKey(t1, t2);
//           seenPairs.add(key);
//         }
//       }
//       // console.log(groupTeams, 'jhbjhb');
      
//       groups.push({
//         group_name: `Slot${slot}-Group${groups.length + 1}`,
//         age_group:
//           groupTeams?.every((t) => t.age_group === groupTeams[0].age_group)
//             ? groupTeams[0].age_group
//             : "mixed",
//         teams: groupTeams?.map((l) => {
//           return l.members.map((m) => {
//             return {
//               id: m.id,
//               age: m.age
//             }
//           })
//         }),
//       });
//     }

//     slots.push({ slot, groups });
//   }

//   return slots;
// }


// =========================
// MAIN PIPELINE
// participants -> teams -> groups -> rounds -> bar assignment -> output[]
// =========================
function assignEvent(participants, event){
  const teams = buildTeams(participants);

  const SLOTS = 3;
  const history = new Set();
  const perSlot = createSchedule(teams, SLOTS);
  // const seenPairs = new Set();

  // for (let slot = 1; slot <= SLOTS; slot++) {
  //   const slotGroups = formGroupsForSlot(teams, seenPairs);
  //   perSlot.push({ slot, groups: slotGroups });
  // }

  // console.log(JSON.stringify(perSlot), 'perslot');
return
  return assignBarsForSlotGroups(
    perSlot,
    event.bars.length ? event.bars : [{ _id: 'bar_default', available_spots: 9999 }]
  );
}


// =========================
// EXPORT (CommonJS style)
// =========================
module.exports = {
  assignEvent,
  // (optionally export internals for testing)
  buildTeams,
  formGroups,
  scheduleRounds,
  assignBarsPerRound
};

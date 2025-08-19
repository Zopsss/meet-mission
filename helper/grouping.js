// function determineAgeGroup(age) {
//   if (age >= 18 && age <= 30) return "18-30";
//   if (age >= 31 && age <= 40) return "31-40";
//   return "41+";
// }

// function formTeams(users) {
//   const teams = [];
//   const used = new Set();
//   let teamCounter = 1;

//   // 1️⃣ Handle invited_user_id first
//   users.forEach(user => {
//     if (user.invited_user_id && !used.has(user.user_id)) {
//       const partner = users.find(u => u.user_id === user.invited_user_id);
//       if (partner && !used.has(partner.user_id)) {
//         teams.push({
//           team_name: `Team ${teamCounter++}`,
//           members: [
//             { id: user.user_id, age: user.age },
//             { id: partner.user_id, age: partner.age }
//           ]
//         });
//         used.add(user.user_id);
//         used.add(partner.user_id);
//       }
//     }
//   });

//   // 2️⃣ Group remaining users by age group
//   const groups = {};
//   users.forEach(user => {
//     if (!used.has(user.user_id)) {
//       const group = determineAgeGroup(user.age);
//       if (!groups[group]) groups[group] = [];
//       groups[group].push(user);
//     }
//   });

//   // 3️⃣ Pair users inside each age group
//   Object.values(groups).forEach(groupUsers => {
//     while (groupUsers.length >= 2) {
//       const u1 = groupUsers.pop();
//       const u2 = groupUsers.pop();
//       teams.push({
//         team_name: `Team ${teamCounter++}`,
//         members: [
//           { id: u1.user_id, age: u1.age },
//           { id: u2.user_id, age: u2.age }
//         ]
//       });
//       used.add(u1.user_id);
//       used.add(u2.user_id);
//     }
//   });

//   // 4️⃣ Handle leftovers (if odd number)
//   const leftovers = users.filter(u => !used.has(u.user_id));
//   leftovers.forEach(u => {
//     teams.push({
//       team_name: `Team ${teamCounter++}`,
//       members: [{ id: u.user_id, age: u.age }]
//     });
//   });

//   return teams;
// }

// function getTeamAgeGroup(team) {
//   const avgAge = team.members.reduce((a, m) => a + m.age, 0) / team.members.length;
//   if (avgAge <= 30) return "18-30";
//   if (avgAge <= 40) return "31-40";
//   return "41+";
// }

// function compatibleGroups(ageGroup1, ageGroup2) {
//   if (ageGroup1 === ageGroup2) return true;
//   if ((ageGroup1 === "18-30" && ageGroup2 === "31-40") || 
//       (ageGroup1 === "31-40" && ageGroup2 === "18-30")) return true;
//   if ((ageGroup1 === "31-40" && ageGroup2 === "41+") || 
//       (ageGroup1 === "41+" && ageGroup2 === "31-40")) return true;
//   return false;
// }

// function formSlotGroups(teams, bars, slotCount = 3) {
//   const results = [];
//   const barsQueue = [...bars]; // round robin assignment
//   let groupCounter = 1;

//   // Pre-calc team age groups
//   teams.forEach(t => t.age_group = getTeamAgeGroup(t));

//   for (let slot = 1; slot <= slotCount; slot++) {
//     const shuffled = [...teams].sort(() => Math.random() - 0.5);
//     const used = new Set();

//     for (let i = 0; i < shuffled.length; i++) {
//       if (used.has(shuffled[i].team_name)) continue;
//       const group = [shuffled[i]];
//       used.add(shuffled[i].team_name);

//       // Try to add compatible teams (max 4)
//       for (let j = i + 1; j < shuffled.length && group.length < 4; j++) {
//         if (!used.has(shuffled[j].team_name) &&
//             compatibleGroups(group[0].age_group, shuffled[j].age_group)) {
//           group.push(shuffled[j]);
//           used.add(shuffled[j].team_name);
//         }
//       }

//       // Ensure group has at least 2 teams
//       if (group.length < 2) {
//         // fallback: pair with next available
//         for (let k = i + 1; k < shuffled.length; k++) {
//           if (!used.has(shuffled[k].team_name)) {
//             group.push(shuffled[k]);
//             used.add(shuffled[k].team_name);
//             break;
//           }
//         }
//       }

//       // Assign bar (round robin, check capacity)
//         let bar = null;
//         for (let b = 0; b < barsQueue.length; b++) {
//         const candidate = barsQueue.shift();
//         const participantsCount = group.reduce((sum, t) => sum + t.members.length, 0);

//         console.log("Checking group of", participantsCount, "against bar", candidate._id, "cap:", candidate.available_spots);

//         if (participantsCount <= Number(candidate.available_spots)) {
//             bar = candidate;
//             barsQueue.push(candidate); // keep it rotating
//             break;
//         }
//         barsQueue.push(candidate); // put back in queue
//         }

//         if (!bar) {
//         console.warn("⚠️ No bar matched. Assigning fallback.");
//         bar = bars.reduce((max, b) =>
//             Number(b.available_spots) > Number(max.available_spots) ? b : max,
//             bars[0]
//         );
//         }


//         console.log(bar, 'bar');
        

//       results.push({
//         group_name: `Group ${groupCounter++}`,
//         slot,
//         bar_id: bar ? bar._id : null,
//         age_group: group[0].age_group,
//         teams: group
//       });
//     }
//   }
//   return results;
// }

// Helper: determine team age group
function getTeamAgeGroup(team) {
  const ages = team.members.map(m => m.age);
  const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
  if (avg <= 30) return "18-30";
  if (avg <= 40) return "31-40";
  return "41+";
}

// Soft similarity / contrast scoring
function softScore(a, b) {
  let score = 0;

  function axisScore(val1, val2, ambiVal) {
    if (val1 === val2) return 1;
    if ((val1 === ambiVal && val2 !== ambiVal) || (val2 === ambiVal && val1 !== ambiVal)) return 0.5;
    return 0;
  }

  score += axisScore(a.feel_around_new_people, b.feel_around_new_people, "ambivert") * 0.3;
  score += axisScore(a.prefer_spending_time, b.prefer_spending_time, "both_seeker") * 0.3;
  score += axisScore(a.describe_you_better, b.describe_you_better, "free_spirited") * 0.2;
  score += axisScore(a.describe_role_in_relationship, b.describe_role_in_relationship, "harmony") * 0.2;

  return score; // between 0 and 1
}

// Hard compatibility check for two participants
function isCompatible(a, b) {
  // orientation
  if (!a.looking_for.includes(b.gender) || !b.looking_for.includes(a.gender) || !(a.looking_for === 'both' || b.looking_for === 'both')) return false;
  // relationship goal
  if (a.relationship_goal !== b.relationship_goal) return false;
  // kids rule for relationships
  if (a.relationship_goal === "relationship" && a.children !== b.children) return false;
  // age gap limit (adjustable)
  if (Math.abs(a.age - b.age) > 10) return false;
  return true;
}

// Build teams deterministically
function formTeams(participants) {
  const unpaired = [...participants];
  const teams = [];

  // First pass: fixed duos
  unpaired.forEach((p, i) => {
    if (p.invited_user_id) {
      const partnerIdx = unpaired.findIndex(u => u.user_id === p.invited_user_id);
      if (partnerIdx !== -1) {
        teams.push({
          team_name: `Team ${teams.length + 1}`,
          members: [p, unpaired[partnerIdx]],
        });
        unpaired.splice(Math.max(i, partnerIdx), 1);
        unpaired.splice(Math.min(i, partnerIdx), 1);
      }
    }
  });

  // Remaining: greedy pairing by soft score + compatibility
  while (unpaired.length >= 2) {
    let bestPair = [0, 1];
    let bestScore = -1;
    for (let i = 0; i < unpaired.length; i++) {
      for (let j = i + 1; j < unpaired.length; j++) {
        if (!isCompatible(unpaired[i], unpaired[j])) continue;
        const s = softScore(unpaired[i], unpaired[j]);
        if (s > bestScore) {
          bestScore = s;
          bestPair = [i, j];
        }
      }
    }
    teams.push({
      team_name: `Team ${teams.length + 1}`,
      members: [unpaired[bestPair[0]], unpaired[bestPair[1]]],
    });
    // remove paired
    const [i, j] = bestPair.sort((a, b) => b - a);
    unpaired.splice(i, 1);
    unpaired.splice(j, 1);
  }

  // If odd participant remains, pair with closest age team (or make last group 3-team group)
  if (unpaired.length === 1) {
    teams.push({
      team_name: `Team ${teams.length + 1}`,
      members: [unpaired[0]],
    });
  }

  // Assign age group
  teams.forEach(t => t.age_group = getTeamAgeGroup(t));

  return teams;
}

function simplifyTeams(teams) {
  return teams.map(team => (team.team_name));
}

// Group formation per slot
function formSlotGroups(teams, bars, slotCount = 3) {
  const results = [];
  const barsQueue = [...bars]; // round-robin
  let groupCounter = 1;

  for (let slot = 1; slot <= slotCount; slot++) {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const used = new Set();

    for (let i = 0; i < shuffled.length; i++) {
      if (used.has(shuffled[i].team_name)) continue;
      const group = [shuffled[i]];
      used.add(shuffled[i].team_name);

      // Add compatible teams (max 4)
      for (let j = i + 1; j < shuffled.length && group.length < 4; j++) {
        if (!used.has(shuffled[j].team_name) &&
            compatibleGroups(shuffled[i].age_group, shuffled[j].age_group)) {
          group.push(shuffled[j]);
          used.add(shuffled[j].team_name);
        }
      }

      // Ensure group has at least 2 teams
      if (group.length < 2) {
        for (let k = i + 1; k < shuffled.length; k++) {
          if (!used.has(shuffled[k].team_name)) {
            group.push(shuffled[k]);
            used.add(shuffled[k].team_name);
            break;
          }
        }
      }

      // Assign bar
      let bar = null;
      const participantsCount = group.reduce((sum, t) => sum + t.members.length, 0);
      for (let b = 0; b < barsQueue.length; b++) {
        const candidate = barsQueue.shift();
        const capacity = Number(candidate.available_spots || candidate.available_slots || 0);
        if (participantsCount <= capacity) {
          bar = candidate;
          barsQueue.push(candidate);
          break;
        }
        barsQueue.push(candidate);
      }
      if (!bar) {
        // fallback
        bar = bars.reduce((max, b) => (Number(b.available_spots || b.available_slots || 0) > Number(max.available_spots || max.available_slots || 0) ? b : max), bars[0]);
      }
      
      results.push({
        group_name: `Group ${groupCounter++}`,
        slot,
        bar_id: bar._id,
        age_group: group[0].age_group,
        teams: simplifyTeams(group)
      });
    }
  }

  return results;
}

// Simple age compatibility for grouping
function compatibleGroups(age1, age2) {
  if (age1 === age2) return true;
  if (age1 === "18 - 30" && age2 === "31 - 40") return true;
  if (age1 === "31 - 40" && (age2 === "18 - 30" || age2 === "41+")) return true;
  if (age1 === "41+" && age2 === "31 - 40") return true;
  return false;
}

// --- Usage example ---

// participants = [{user_id, name, age, gender, pref_set, relationship_goal, children, ...}, ...]
// bars = [{_id, available_spots}, ...]

// 1️⃣ Build teams
// const teams = buildTeams(participants);

// 2️⃣ Form slot groups
// const slotGroups = formSlotGroups(teams, bars, 3);

// console.log(JSON.stringify(slotGroups, null, 2));


module.exports = {
  formTeams,
  formSlotGroups
};
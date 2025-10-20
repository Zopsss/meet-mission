// MEETLOCAL – Team & Group Formation Engine (JavaScript)
// Rules encoded from the "MEETLOCAL Rulebook – Group Formation and Process"
// Plain JavaScript version (no TypeScript)

// Utilities
const uid = (() => {
  let c = 0;
  return (p = 'id') => `${p}_${Date.now().toString(36)}_${(c++).toString(36)}`;
})();

const AGE_GROUPS = [
  { label: '20-30', min: 20, max: 30 },
  { label: '31-40', min: 31, max: 40 },
  { label: '41-50', min: 41, max: 50 },
  { label: '50+',  min: 51, max: null },
];

function getAgeGroup(age) {
  for (const g of AGE_GROUPS) {
    if (g.max === null) {
      if (age >= g.min) return g.label;
    } else if (age >= g.min && age <= g.max) return g.label;
  }
  return null;
}

// // Team formation
// function formTeams(input) {
//   const participants = input.participants || [];
//   const notes = [];

//   // Bucket by age group
//   const byAge = new Map();
//   AGE_GROUPS.forEach(g => byAge.set(g.label, []));

//   const duoMap = new Map();
//   const participantIndex = new Map();

//   participants.forEach(p => {
//     const group = getAgeGroup(p.age);
//     if (!group) {
//       notes.push(`Excluded ${p.name} (${p.age}) – outside supported age groups.`);
//       return;
//     }
//     byAge.get(group).push(p);
//     participantIndex.set(p.user_id, p);
//     if (p.invited_user_id) {
//       duoMap.set(p.user_id, p.invited_user_id);
//       duoMap.set(p.invited_user_id, p.user_id);
//     }
//   });

//   const teams = [];

//   function createTeam(members, age_group) {
//     teams.push({
//       team_id: uid('team'),
//       team_name: `Team ${teams.length + 1}`,
//       age_group,
//       members: members.map(m => ({ id: m.user_id, age: m.age, gender: m.gender }))
//     });
//   }

//   for (const [age_group, people] of byAge) {
//     const pool = [...people];
//     const used = new Set();

//     // 1) Lock duos
//     for (const p of pool) {
//       if (used.has(p.user_id)) continue;
//       const partnerId = duoMap.get(p.user_id);
//       if (partnerId) {
//         const partner = pool.find(x => x.user_id === partnerId);
//         if (partner && getAgeGroup(partner.age) === age_group) {
//           createTeam([p, partner], age_group);
//           used.add(p.user_id); used.add(partner.user_id);
//         }
//       }
//     }

//     // 2) Pair remaining singles (male+female preferred)
//     const singles = pool.filter(p => !used.has(p.user_id));
//     const males = singles.filter(p => p.gender === 'male');
//     const females = singles.filter(p => p.gender === 'female');
//     const others = singles.filter(p => p.gender !== 'male' && p.gender !== 'female');

//     while (males.length && females.length) {
//       const m = males.shift(); const f = females.shift();
//       createTeam([m, f], age_group);
//       used.add(m.user_id); used.add(f.user_id);
//     }

//     const remainder = [...males, ...females, ...others].filter(p => !used.has(p.user_id));
//     while (remainder.length >= 2) {
//       const a = remainder.shift(); const b = remainder.shift();
//       createTeam([a, b], age_group);
//       used.add(a.user_id); used.add(b.user_id);
//     }

//     // Handle leftover single -> try to make exactly one team of three
//     if (remainder.length === 1) {
//       const leftover = remainder.shift();
//       const candidate = teams.find(t => t.age_group === age_group && t.members.length === 2);
//       if (candidate) {
//         candidate.members.push({ id: leftover.user_id, age: leftover.age, gender: leftover.gender });
//         notes.push(`Formed one team of three in ${age_group} due to odd count.`);
//       } else {
//         const anyInGroup = pool.find(p => used.has(p.user_id));
//         if (anyInGroup) {
//           const t = teams.find(t => t.age_group === age_group && t.members.some(m => m.id === anyInGroup.user_id));
//           if (t && t.members.length === 2) {
//             t.members.push({ id: leftover.user_id, age: leftover.age, gender: leftover.gender });
//             notes.push(`Adjusted an existing duo to a trio to absorb leftover in ${age_group}.`);
//           } else {
//             createTeam([leftover], age_group);
//             notes.push(`Warning: singleton team created in ${age_group} (should be avoided).`);
//           }
//         } else {
//           createTeam([leftover], age_group);
//           notes.push(`Warning: singleton team created in ${age_group} (should be avoided).`);
//         }
//       }
//     }
//   }

//   return { teams, notes };
// }

// Helper to normalise participant -> member object (keeps gender)
function memberFromParticipant(p) {
  return {
    id: p.user_id ?? p.id ?? null,
    age: typeof p.age === 'number' ? p.age : (p.age ? Number(p.age) : null),
    gender: (p.gender === undefined) ? null : p.gender
  };
}

// Team formation
function formTeams(input) {
  const participants = input.participants || [];
  const notes = [];

  // Bucket by age group
  const byAge = new Map();
  AGE_GROUPS.forEach(g => byAge.set(g.label, []));

  const duoMap = new Map();
  const participantIndex = new Map();

  participants.forEach(p => {
    const group = getAgeGroup(p.age);
    if (!group) {
      notes.push(`Excluded ${p.name} (${p.age}) – outside supported age groups.`);
      return;
    }
    byAge.get(group).push(p);
    participantIndex.set(p.user_id, p);
    if (p.invited_user_id) {
      duoMap.set(p.user_id, p.invited_user_id);
      duoMap.set(p.invited_user_id, p.user_id);
    }
  });

  const teams = [];

  function createTeam(members, age_group) {
    teams.push({
      team_id: uid('team'),
      team_name: `Team ${teams.length + 1}`,
      age_group,
      // use the helper so gender is always present (or null)
      members: members.map(m => memberFromParticipant(m))
    });
  }

  for (const [age_group, people] of byAge) {
    const pool = [...people];
    const used = new Set();

    // 1) Lock duos
    for (const p of pool) {
      if (used.has(p.user_id)) continue;
      const partnerId = duoMap.get(p.user_id);
      if (partnerId) {
        const partner = pool.find(x => x.user_id === partnerId);
        if (partner && getAgeGroup(partner.age) === age_group) {
          createTeam([p, partner], age_group);
          used.add(p.user_id); used.add(partner.user_id);
        }
      }
    }

    // 2) Pair remaining singles (male+female preferred)
    const singles = pool.filter(p => !used.has(p.user_id));
    const males = singles.filter(p => p.gender === 'male');
    const females = singles.filter(p => p.gender === 'female');
    const others = singles.filter(p => p.gender !== 'male' && p.gender !== 'female');

    while (males.length && females.length) {
      const m = males.shift(); const f = females.shift();
      createTeam([m, f], age_group);
      used.add(m.user_id); used.add(f.user_id);
    }

    const remainder = [...males, ...females, ...others].filter(p => !used.has(p.user_id));
    while (remainder.length >= 2) {
      const a = remainder.shift(); const b = remainder.shift();
      createTeam([a, b], age_group);
      used.add(a.user_id); used.add(b.user_id);
    }

    // Handle leftover single -> try to make exactly one team of three
    if (remainder.length === 1) {
      const leftover = remainder.shift();
      const candidate = teams.find(t => t.age_group === age_group && t.members.length === 2);
      if (candidate) {
        // push a normalized member (keeps gender)
        candidate.members.push(memberFromParticipant(leftover));
        notes.push(`Formed one team of three in ${age_group} due to odd count.`);
      } else {
        const anyInGroup = pool.find(p => used.has(p.user_id));
        if (anyInGroup) {
          const t = teams.find(t => t.age_group === age_group && t.members.some(m => m.id === (anyInGroup.user_id ?? anyInGroup.id)));
          if (t && t.members.length === 2) {
            t.members.push(memberFromParticipant(leftover));
            notes.push(`Adjusted an existing duo to a trio to absorb leftover in ${age_group}.`);
          } else {
            createTeam([leftover], age_group);
            notes.push(`Warning: singleton team created in ${age_group} (should be avoided).`);
          }
        } else {
          createTeam([leftover], age_group);
          notes.push(`Warning: singleton team created in ${age_group} (should be avoided).`);
        }
      }
    }
  }

  return { teams, notes };
}

// Export (include gender)
function exportTeamsForApi(teams) {
  return teams.map(t => ({
    team_name: t.team_name,
    age_group: t.age_group,
    members: t.members.map(m => ({
      id: m.id,
      age: m.age,
      gender: m.gender ?? null // now preserved
    }))
  }));
}


// Group formation
function groupTeamsIntoGroups(teams) {
  const notes = [];
  const groups = [];

  AGE_GROUPS.map(x => x.label).forEach(g => {
    const bucket = teams.filter(t => t.age_group === g);
    if (bucket.length === 0) return;
    const total = bucket.length;
    if (total < 12) {
      notes.push(`${g}: Only ${total} teams (<12) – event not possible for this age group.`);
      return;
    }

    let groupCount = Math.max(4, Math.floor(total / 4));
    const fit = n => {
      const sizes = Array(n).fill(0);
      for (let i = 0; i < total; i++) sizes[i % n]++;
      return sizes.every(s => s >= 3 && s <= 5);
    };

    while (!fit(groupCount)) groupCount++;

    const buckets = Array.from({ length: groupCount }, () => []);
    bucket.forEach((t, i) => buckets[i % groupCount].push(t));

    buckets.forEach((bt, idx) => {
      groups.push({ group_id: uid('group'), age_group: g, team_ids: bt.map(t => t.team_id) });
      const s = bt.length;
      if (s < 3 || s > 5) notes.push(`${g} Group ${idx + 1} has ${s} teams (violates 3–5).`);
    });
  });

  return { groups, notes };
}

// Bar feasibility
function checkBarsFeasibility(groups, event) {
  const sizeByGroup = groups.map(g => g.team_ids.length);
  const maxSize = sizeByGroup.length ? Math.max(...sizeByGroup) : 0;
  const requiredBars = maxSize;
  const availableBars = (event && event.bars) ? event.bars.length : 0;
  const ok = availableBars >= requiredBars;
  return { ok, requiredBars, availableBars };
}

function buildGroupsAndRounds(teams, bars) {
  if (teams.length < 12) {
    throw new Error("Not enough teams. Need at least 12 teams.");
  }

  const groupSize = 4; // ideal group size
  const rounds = 3;
  const results = [];

  // --- Step 1: Partition by age_group
  const byAgeGroup = {};
  teams.forEach(team => {
    if (!byAgeGroup[team.age_group]) byAgeGroup[team.age_group] = [];
    byAgeGroup[team.age_group].push(team);
  });

  // Shuffle helper
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  // Encounter tracker
  const prevEncounters = new Map();
  function trackEncounters(groups) {
    groups.forEach(group => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = [group[i].team_name, group[j].team_name].sort().join("-");
          prevEncounters.set(key, true);
        }
      }
    });
  }

  // Assign groups to bars
  function assignToBars(groups, slot, ageGroup) {
    return groups.map((g, i) => ({
      group_name: `Group ${i + 1}`,
      slot,
      bar_id: bars[i % bars.length]._id || `bar_${i + 1}`,
      age_group: ageGroup,
      teams: g
    }));
  }

  // Create rounds per age group
  Object.keys(byAgeGroup).forEach(ageGroup => {
    const groupTeams = byAgeGroup[ageGroup];
    const groupsRound1 = [];

    // --- Round 1: Split sequentially
    for (let i = 0; i < groupTeams.length; i += groupSize) {
      groupsRound1.push(groupTeams.slice(i, i + groupSize));
    }

    // Fix small leftovers (<3)
    groupsRound1.forEach((g, idx) => {
      if (g.length < 3 && idx > 0) {
        groupsRound1[idx - 1] = groupsRound1[idx - 1].concat(g);
        groupsRound1.pop();
      }
    });

    results.push(...assignToBars(groupsRound1, 1, ageGroup));
    trackEncounters(groupsRound1);

    // --- Round 2 & 3: reshuffle avoiding repeats
    function makeNewRound(slot) {
      let shuffled = shuffle(groupTeams);
      let newGroups = [];
      for (let i = 0; i < shuffled.length; i += groupSize) {
        newGroups.push(shuffled.slice(i, i + groupSize));
      }

      // Fix small leftovers
      newGroups.forEach((g, idx) => {
        if (g.length < 3 && idx > 0) {
          newGroups[idx - 1] = newGroups[idx - 1].concat(g);
          newGroups.pop();
        }
      });

      // Avoid duplicates (basic swap method)
      newGroups = newGroups.map(group => {
        let safeGroup = [];
        group.forEach(team => {
          const hasConflict = safeGroup.some(other => {
            const key = [team.team_name, other.team_name].sort().join("-");
            return prevEncounters.has(key);
          });
          if (!hasConflict) {
            safeGroup.push(team);
          } else {
            // conflict: just push anyway (fallback)
            safeGroup.push(team);
          }
        });
        return safeGroup;
      });

      trackEncounters(newGroups);
      return assignToBars(newGroups, slot, ageGroup);
    }

    results.push(...makeNewRound(2));
    results.push(...makeNewRound(3));
  });

  return results;
}


// Expose for Node/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAgeGroup,
    formTeams,
    groupTeamsIntoGroups,
    checkBarsFeasibility,
    exportTeamsForApi,
    AGE_GROUPS,
    buildGroupsAndRounds
  };
}

// Usage example (run in your app):
// const { formTeams, groupTeamsIntoGroups, exportTeamsForApi } = require('./meetlocal');
// const { teams, notes } = formTeams({ participants: yourArray });
// const json = exportTeamsForApi(teams);
// console.log(JSON.stringify(json, null, 2));

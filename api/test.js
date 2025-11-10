const express = require("express");
const api = express.Router();

// Assuming formTeams is Function 1 (the correct one)
const { formTeams } = require("../helper/finalTeamBuilder");
// const { formTeams: newFormTeams } = require("../helper/newTeamBuilder");

function simplifyTeamsOutput(teams) {
  return teams.map((team) => ({
    team_id: team.team_id,
    team_name: team.team_name,
    age_group: team.age_group,
    members: team.members.map((member) => {
      // Combine first_name and last_name, filtering out null/undefined
      const fullName = [member.first_name, member.last_name]
        .filter(Boolean)
        .join(" ");

      return {
        name: fullName + ` (age: ${member.age})` + `(Gender: ${member.gender})`,
      };
    }),
  }));
}

const mockParticipants1 = [
  // -----------------------------------------------------------------
  // T3: Pre-Registered Duo (Must be fixed) - 20-30 Age Group
  // Expected: Team 1 (AliceDuo, BobDuo)
  // -----------------------------------------------------------------
  {
    _id: "user01",
    first_name: "Alice",
    last_name: "Duo",
    age: 25,
    gender: "female",
    invited_user_id: { _id: "user02" },
  },
  {
    _id: "user02",
    first_name: "Bob",
    last_name: "Duo",
    age: 26,
    gender: "male",
  },

  // -----------------------------------------------------------------
  // T4: Age Proximity (Male + Female) - 20-30 Age Group
  // Expected: Team 2 (Alex 20, Bella 21) and Team 3 (Charles 30, Denise 29)
  // -----------------------------------------------------------------
  { _id: "user03", first_name: "Alex", age: 20, gender: "male" },
  { _id: "user04", first_name: "Bella", age: 21, gender: "female" },
  { _id: "user05", first_name: "Charles", age: 30, gender: "male" },
  { _id: "user06", first_name: "Denise", age: 29, gender: "female" },

  // -----------------------------------------------------------------
  // T5: Same-Gender Proximity (The critical test for Function 1) - 20-30 Age Group
  // Expected: Team 4 (Emily 22, Hannah 23) and Team 5 (Grace 28, Iris 30)
  // -----------------------------------------------------------------
  { _id: "user07", first_name: "Emily", age: 22, gender: "female" },
  { _id: "user08", first_name: "Grace", age: 28, gender: "female" },
  { _id: "user09", first_name: "Hannah", age: 23, gender: "female" },
  { _id: "user10", first_name: "Iris", age: 30, gender: "female" },

  // -----------------------------------------------------------------
  // T8: Leftover Trio Placement (Age Priority) - 20-30 Age Group
  // Leftover Noah (25) joins Team B (Avg 29) because |25-29|=4 is < |25-20|=5.
  // -----------------------------------------------------------------
  { _id: "user11", first_name: "Jack", age: 20, gender: "male" },
  { _id: "user12", first_name: "Kelly", age: 20, gender: "female" }, // Team A Avg 20
  { _id: "user13", first_name: "Liam", age: 29, gender: "male" },
  { _id: "user14", first_name: "Mia", age: 29, gender: "female" }, // Team B Avg 29
  { _id: "user15", first_name: "Noah", age: 25, gender: "male" }, // Leftover

  // -----------------------------------------------------------------
  // T9: Age Group Separation - 31-40 Age Group
  // Expected: Team 7 (Owen 35, Penny 35) - must be separate from all others
  // -----------------------------------------------------------------
  { _id: "user16", first_name: "Owen", age: 35, gender: "male" },
  { _id: "user17", first_name: "Penny", age: 35, gender: "female" },
];

// Test Case: Even Number of Participants, Perfect Gender Balance
// Expected Outcome: 4 teams of (male, female).
const mockParticipants2 = [
  { _id: "p1", first_name: "John", age: 28, gender: "male" },
  { _id: "p2", first_name: "Jane", age: 26, gender: "female" },
  { _id: "p3", first_name: "Peter", age: 30, gender: "male" },
  { _id: "p4", first_name: "Mary", age: 29, gender: "female" },
  { _id: "p5", first_name: "Paul", age: 25, gender: "male" },
  { _id: "p6", first_name: "Patricia", age: 27, gender: "female" },
  { _id: "p7", first_name: "Robert", age: 31, gender: "male" },
  { _id: "p8", first_name: "Jennifer", age: 32, gender: "female" },
];

// Test Case: Odd Number of Participants
// Expected Outcome: 2 teams of (male, female) and 1 three-person team (2 males, 1 female or 1 male, 2 females).
const mockParticipants3 = [
  { _id: "p9", first_name: "Michael", age: 42, gender: "male" },
  { _id: "p10", first_name: "Linda", age: 45, gender: "female" },
  { _id: "p11", first_name: "William", age: 48, gender: "male" },
  { _id: "p12", first_name: "Elizabeth", age: 41, gender: "female" },
  { _id: "p13", first_name: "David", age: 50, gender: "male" },
  { _id: "p14", first_name: "Susan", age: 46, gender: "female" },
  { _id: "p15", first_name: "Richard", age: 44, gender: "male" },
];

// Test Case: Uneven Gender Ratio (but within the 60/40 tolerance)
// Expected Outcome: 4 teams of (male, female) and 1 team of (male, male).
const mockParticipants4 = [
  { _id: "p16", first_name: "James", age: 33, gender: "male" },
  { _id: "p17", first_name: "Karen", age: 35, gender: "female" },
  { _id: "p18", first_name: "Joseph", age: 38, gender: "male" },
  { _id: "p19", first_name: "Nancy", age: 34, gender: "female" },
  { _id: "p20", first_name: "Charles", age: 39, gender: "male" },
  { _id: "p21", first_name: "Lisa", age: 36, gender: "female" },
  { _id: "p22", first_name: "Daniel", age: 37, gender: "male" },
  { _id: "p23", first_name: "Matthew", age: 33, gender: "male" },
  { _id: "p24", first_name: "Betty", age: 39, gender: "female" },
  { _id: "p25", first_name: "Donald", age: 40, gender: "male" },
];

// Test Case: Considering Age Proximity
// Expected Outcome: The pairing should prioritize closer ages.
// Ideal Pairing: (Mark, 22) with (Ashley, 23), (Steven, 21) with (Sandra, 29) or (Kimberly, 28)
// and so on, to minimize the age gap within teams. A simple sort might pair Mark & Ashley, Steven & Kimberly, Andrew & Sandra.
const mockParticipants5 = [
  { _id: "p26", first_name: "Mark", age: 22, gender: "male" },
  { _id: "p27", first_name: "Sandra", age: 29, gender: "female" },
  { _id: "p28", first_name: "Steven", age: 21, gender: "male" },
  { _id: "p29", first_name: "Ashley", age: 23, gender: "female" },
  { _id: "p30", first_name: "Andrew", age: 30, gender: "male" },
  { _id: "p31", first_name: "Kimberly", age: 28, gender: "female" },
];

const AGE_GROUPS = [
  { label: "20-30", min: 20, max: 30 },
  { label: "31-40", min: 31, max: 40 },
  { label: "41-50", min: 41, max: 50 },
  { label: "50+", min: 51, max: null },
];

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

const GERMAN_MALE_FIRST_NAMES = [
  "Maximilian",
  "Alexander",
  "Paul",
  "Leon",
  "Ben",
  "Elias",
  "Noah",
  "Felix",
  "Jonas",
  "Lukas",
];
const GERMAN_FEMALE_FIRST_NAMES = [
  "Sophia",
  "Emma",
  "Hannah",
  "Mia",
  "Anna",
  "Lea",
  "Emilia",
  "Lina",
  "Marie",
  "Lena",
];
const GERMAN_LAST_NAMES = [
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Schulz",
  "Hoffmann",
];

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const calculateAge = (dobString) =>
  Math.abs(
    new Date(Date.now() - new Date(dobString).getTime()).getUTCFullYear() - 1970
  );

const generateRandomDOB = () => {
  const year = getRandomInt(
    new Date().getFullYear() - 65,
    new Date().getFullYear() - 20
  );
  return `${year}-${String(getRandomInt(1, 12)).padStart(2, "0")}-${String(
    getRandomInt(1, 28)
  ).padStart(2, "0")}`;
};

/**
 * Generates a full dataset of participants, including pre-registered pairs.
 *
 * @param {number} totalParticipants - The total number of participants to create.
 * @returns {Array<Object>} A list of participant objects ready for `formTeams`.
 */
function generateTestData(totalParticipants) {
  let participants = [];
  const participantsByAgeGroup = {};
  AGE_GROUPS.forEach(
    (g) => (participantsByAgeGroup[g.label] = { males: 0, females: 0 })
  );

  // Step 1: Generate the raw participant objects, respecting the 60/40 gender ratio per group
  for (let i = 0; i < totalParticipants; i++) {
    const dob = generateRandomDOB();
    const age = calculateAge(dob);
    const ageGroup = getAgeGroup(age);

    if (!ageGroup) continue; // Skip if somehow outside the age ranges

    let gender;
    const groupCounts = participantsByAgeGroup[ageGroup];
    const totalInGroup = groupCounts.males + groupCounts.females;

    // Enforce 60/40 ratio
    if (totalInGroup < 10) {
      // For the first 10 participants, allow any gender randomly
      gender = Math.random() < 0.5 ? "male" : "female";
    } else if ((groupCounts.males + 1) / (totalInGroup + 1) > 0.6) {
      gender = "female";
    } else if ((groupCounts.females + 1) / (totalInGroup + 1) > 0.6) {
      gender = "male";
    } else {
      gender = Math.random() < 0.5 ? "male" : "female";
    }

    if (gender === "male") groupCounts.males++;
    else groupCounts.females++;

    participants.push({
      _id: `user_${i + 1}`,
      first_name:
        gender === "male"
          ? GERMAN_MALE_FIRST_NAMES[
              getRandomInt(0, GERMAN_MALE_FIRST_NAMES.length - 1)
            ]
          : GERMAN_FEMALE_FIRST_NAMES[
              getRandomInt(0, GERMAN_FEMALE_FIRST_NAMES.length - 1)
            ],
      last_name:
        GERMAN_LAST_NAMES[getRandomInt(0, GERMAN_LAST_NAMES.length - 1)],
      gender,
      age,
      email: `user${i + 1}@test.com`,
      date_of_birth: dob,
      invited_user_id: null, // This will be populated next
    });
  }

  // Step 2: Create pre-registered, same-gender duos.
  // This populates the `invited_user_id` field which `formTeams` uses.
  const pairedParticipants = new Set();
  const percentToPair = getRandomInt(25, 33) / 100;
  const numToPair = Math.floor(participants.length * percentToPair);

  // Create a shuffled list to pick from randomly
  const shuffled = [...participants].sort(() => 0.5 - Math.random());

  for (let i = 0; i < shuffled.length; i++) {
    if (pairedParticipants.size >= numToPair) break;

    const main = shuffled[i];
    const mainId = getId(main);

    if (pairedParticipants.has(mainId)) continue;

    // Find a suitable partner (same gender, same age group, not already paired)
    let partner = null;
    for (let j = i + 1; j < shuffled.length; j++) {
      const potentialPartner = shuffled[j];
      if (
        !pairedParticipants.has(getId(potentialPartner)) &&
        potentialPartner.gender === main.gender &&
        getAgeGroup(potentialPartner.age) === getAgeGroup(main.age)
      ) {
        partner = potentialPartner;
        break;
      }
    }

    if (partner) {
      main.invited_user_id = partner;

      // Mark both as paired so they can't be used again.
      pairedParticipants.add(mainId);
      pairedParticipants.add(getId(partner));
    }
  }

  // Step 3: Generate summary stats
  const summary = {};

  const cancelledAgeGroups = new Set();
  const notes = [];

  for (const [groupLabel, counts] of Object.entries(participantsByAgeGroup)) {
    const { males, females } = counts;
    const total = males + females;

    const maleRatio = total > 0 ? ((males / total) * 100).toFixed(1) : 0;
    const femaleRatio = total > 0 ? ((females / total) * 100).toFixed(1) : 0;
    const isValidRatio = maleRatio >= 40 && maleRatio <= 60 && femaleRatio >= 40 && femaleRatio <= 60;

    if (!isValidRatio) {
      notes.push(`Gender ratio out of bounds in age group ${groupLabel}: Males ${maleRatio}%, Females ${femaleRatio}%. Teams couldn't be formed for it.`);
      cancelledAgeGroups.add(groupLabel);
    }

    summary[groupLabel] = {
      males,
      females,
      total,
      maleRatio: `${maleRatio}%`,
      femaleRatio: `${femaleRatio}%`,
    };
  }

  if (cancelledAgeGroups.size > 0) {
    participants = participants.filter(
      (p) => !cancelledAgeGroups.has(getAgeGroup(p.age))
    );
  }

  return { participants, summary, notes };
}

api.post("/api/test/test-formTeams", (req, res) => {
  try {
    const { noOfParticipants } = req.body;

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

    // Generate random dataset
    const { participants, summary, notes: cancelledNotes } = generateTestData(noOfParticipants);

    const { teams, notes } = formTeams({ participants });

    if (cancelledNotes.length > 0) {
      notes.unshift(...cancelledNotes);
    }

    const simplifiedTeams = teams.map((team) => ({
      team_id: team.team_id,
      age_group: team.age_group,
      members: team.members.map(
        (m) => `${m.first_name} (${m.gender}, ${m.age})`
      ),
    }));

    res.status(200).json({
      message: `Successfully formed ${teams.length} teams from ${participants.length} generated participants.`,
      notes: notes,
      generatedData: {
        totalParticipants: participants.length,
        preRegisteredDuos: participants.filter((p) => p.invited_user_id).length,
        summary
      },
      generaredParticipants: participants,
      teams: teams,
    });
  } catch (error) {
    console.error("--- [TEST] FAILED ---", error);
    res.status(500).json({
      message: "An error occurred while testing formTeams.",
      error: error.message,
    });
  }
});

module.exports = api;

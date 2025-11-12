/**
 * This file is only for testing endpoints, it helps us to generate dummy data.
 */

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
const BAR_NAMES = [
  "The Golden Lion",
  "The Red Hart",
  "The Drunken Pony",
  "Whiskey & Words",
  "The Alchemist's Brew",
  "Starlight Lounge",
  "The Velvet Curtain",
  "Neon Dreams",
  "The Hidden Gem",
  "Oasis Bar",
];

const AGE_GROUPS = [
  { label: "20-30", min: 20, max: 30 },
  { label: "31-40", min: 31, max: 40 },
  { label: "41-50", min: 41, max: 50 },
  { label: "50+", min: 51, max: null },
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

/**
 * Generates a full dataset of participants, including pre-registered pairs.
 */
function generateParticipantData(totalParticipants) {
  let participants = [];
  const participantsByAgeGroup = {};
  AGE_GROUPS.forEach(
    (g) => (participantsByAgeGroup[g.label] = { males: 0, females: 0 })
  );

  for (let i = 0; i < totalParticipants; i++) {
    const dob = generateRandomDOB();
    const age = calculateAge(dob);
    const ageGroup = getAgeGroup(age);
    if (!ageGroup) continue;

    let gender;
    const groupCounts = participantsByAgeGroup[ageGroup];
    const totalInGroup = groupCounts.males + groupCounts.females;

    // Calculate what the ratio would be if we add male or female
    const maleRatioIfMale = (groupCounts.males + 1) / (totalInGroup + 1);
    const femaleRatioIfFemale = (groupCounts.females + 1) / (totalInGroup + 1);

    // Check if adding a male would exceed the 60% limit
    const canAddMale = maleRatioIfMale <= 0.6;
    // Check if adding a female would exceed the 60% limit
    const canAddFemale = femaleRatioIfFemale <= 0.6;

    if (canAddMale && canAddFemale) {
      // Both genders are within limits, choose randomly
      gender = Math.random() < 0.5 ? "male" : "female";
    } else if (canAddMale && !canAddFemale) {
      // Only male is within limits
      gender = "male";
    } else if (!canAddMale && canAddFemale) {
      // Only female is within limits
      gender = "female";
    } else {
      // This should theoretically never happen if logic is correct
      // But as a fallback, choose randomly
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
      invited_user_id: null,
    });
  }

  const pairedParticipants = new Set();
  const percentToPair = getRandomInt(25, 33) / 100;
  const numToPair = Math.floor(participants.length * percentToPair);
  const shuffled = [...participants].sort(() => 0.5 - Math.random());

  for (let i = 0; i < shuffled.length; i++) {
    if (pairedParticipants.size >= numToPair) break;
    const main = shuffled[i];
    const mainId = getId(main);
    if (pairedParticipants.has(mainId)) continue;

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
      pairedParticipants.add(mainId);
      pairedParticipants.add(getId(partner));
    }
  }

  const summary = {};
  const cancelledAgeGroups = new Set();

  for (const [groupLabel, counts] of Object.entries(participantsByAgeGroup)) {
    const { males, females } = counts;
    const total = males + females;

    const maleRatio = total > 0 ? ((males / total) * 100).toFixed(1) : 0;
    const femaleRatio = total > 0 ? ((females / total) * 100).toFixed(1) : 0;
    const isValidRatio =
      maleRatio >= 40 &&
      maleRatio <= 60 &&
      femaleRatio >= 40 &&
      femaleRatio <= 60;
      
      
    let status;
    if (total >= 24) {
      status = "A";
    } else if (total >= 18) {
      status = "B";
    } else {
      status = "C";
    }

    if (!isValidRatio) {
      cancelledAgeGroups.add(groupLabel);
      status = "Cancelled";
    }

    summary[groupLabel] = {
      males,
      females,
      total,
      maleRatio: `${maleRatio}%`,
      femaleRatio: `${femaleRatio}%`,
      status
    };
  }

  if (cancelledAgeGroups.size > 0) {
    participants = participants.filter(
      (p) => !cancelledAgeGroups.has(getAgeGroup(p.age))
    );
  }

  return { participants, summary };
}

/**
 * Generates a list of mock bar objects from user-defined inputs.
 * It assigns unique names to each bar.
 *
 * @param {Array<{capacity: number}>} barInputs - An array of objects, each specifying a bar's capacity.
 * @returns {Array<Object>} A full list of bar objects with IDs, names, and capacities.
 */
function generateBarData(barInputs) {
  const bars = [];
  // Shuffle the names to ensure variety on each generation
  const shuffledNames = [...BAR_NAMES].sort(() => 0.5 - Math.random());

  for (let i = 0; i < barInputs.length; i++) {
    const input = barInputs[i];
    // Use a shuffled name, with a fallback if we run out of unique names
    const barName =
      shuffledNames[i] ||
      `${BAR_NAMES[i % BAR_NAMES.length]} #${
        Math.floor(i / BAR_NAMES.length) + 1
      }`;

    bars.push({
      _id: `bar_${i + 1}`,
      name: barName + ` ${Math.floor(Math.random() * i * 100)}`, // Append random number to ensure uniqueness
      available_spots: Number(input.capacity) || 20, // Default to 20 if capacity is invalid
    });
  }
  return bars;
}

module.exports = {
  generateParticipantData,
  generateBarData,
};

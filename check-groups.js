// run: node check-groups.js
require('dotenv').config();
const { schema } = require('./model/group');
const team = require('./model/team');
const user = require('./model/user');
const mongoose = require("mongoose");

const mongo = require('./model/mongo');

// 4. Fetch Groups with Populated Teams + Members
async function run() {
  try {
    await mongo.connect();
    const eventId = "689f0e8752af0a442871cddc";

    const groups = await schema.find({ event_id: eventId })
    .populate({
        path: "team_ids",
        model: "Team",
        populate: {
        path: "members",
        model: "User",
        select:
            "id name email gender date_of_birth profession looking_for relationship_goal children kind_of_person feel_around_new_people prefer_spending_time describe_you_better describe_role_in_relationship",
        },
    })
    .exec();

    // 🔹 Group by slot
    const groupedBySlot = groups.reduce((acc, group) => {
    const slotKey = group.slot.toString(); // use string keys "1","2","3"
    if (!acc[slotKey]) {
        acc[slotKey] = [];
    }
    acc[slotKey].push(group);
    return acc;
    }, {});

    // Print result
    console.log(JSON.stringify(groupedBySlot, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

run();
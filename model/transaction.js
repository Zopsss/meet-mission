const mongoose = require('mongoose');
const utility = require('../helper/utility');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participant_id: { type: Schema.Types.ObjectId, ref: 'RegisteredParticipant' },
  sub_participant_id: { type: [Schema.Types.ObjectId], ref: 'RegisteredParticipant', default: null },
  invited_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: ['Buy Hearts', 'Register Event'],
    required: true,
  },
  amount: { type: Number, required: true },
  event_id: { type: Schema.Types.ObjectId, ref: 'EventManagement' },
  status: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  quantity: { type: Number, default: 1 },
}, { versionKey: false, timestamps: true });


const Transaction = mongoose.model('Transaction', TransactionSchema, 'transactions');
exports.schema = Transaction;

function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/*
* transaction.getById()
*/
exports.getByUserId = async function ({ user_id }) {
  let data = await Transaction
    .find({ user_id });

  if (data?.length){
    data = data.map((dt) => {
      return {
        date: utility.formatDateString(dt.createdAt),
        item: dt.type,
        amount: dt.amount,
        quantity: dt.quantity,
        payment_status: dt.status,
        id: dt._id
      }
    })
  }

  return data;
};

/*
* transaction.getByEventId()
*/
exports.getByEventId = async function ({ event_id }) {
  let data = await Transaction
    .find({ event_id })
    .populate('user_id', 'first_name last_name id date_of_birth name')
    .populate('invited_user_id', 'first_name last_name id date_of_birth name')
    .sort({ createdAt: -1 });

  return data;
};

/*
* transaction.getByEventIdCron()
*/
exports.getByEventIdCron = async function ({ event_id }) {
  let data = await Transaction
    .find({ event_id, status: 'paid' })
    .populate('user_id', '_id date_of_birth name')
    .populate('invited_user_id', '_id date_of_birth name');;

  return data;
};

/*
* transaction.getParticipantsCron()
*/
exports.getParticipantsCron = async function ({ event_id }) {
  let data = await Transaction
    .find({ event_id, status: 'paid' })
    .populate('user_id', `
      _id name gender date_of_birth looking_for relationship_goal 
      children kind_of_person feel_around_new_people 
      prefer_spending_time describe_you_better describe_role_in_relationship
    `)
    .populate('invited_user_id', `
      _id name gender date_of_birth looking_for relationship_goal 
      children kind_of_person feel_around_new_people 
      prefer_spending_time describe_you_better describe_role_in_relationship
    `)
    .lean(); // ensures plain JS objects

  // Return only the populated user data
  return data.map(item => ({
    user_id: item.user_id?._id,
    name: item.user_id?.name,
    gender: item.user_id?.gender,
    age: calculateAge(item.user_id?.date_of_birth),
    looking_for: item.user_id?.looking_for,
    relationship_goal: item.user_id?.relationship_goal,
    children: item.user_id?.children,
    kind_of_person: item.user_id?.kind_of_person,
    feel_around_new_people: item.user_id?.feel_around_new_people,
    prefer_spending_time: item.user_id?.prefer_spending_time,
    describe_you_better: item.user_id?.describe_you_better,
    describe_role_in_relationship: item.user_id?.describe_role_in_relationship,
    invited_user_id: item.invited_user_id && {
      ...item.invited_user_id,
      age: calculateAge(item.invited_user_id?.date_of_birth),
      user_id: item.invited_user_id._id
    }
  }));
};

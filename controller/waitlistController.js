const Waitlist = require("../model/waitlist");
const RegisteredParticipant = require("../model/registered-participant");
const Transaction = require("../model/transaction");
const mail = require("../helper/mail");
const utility = require("../helper/utility");
const mongoose = require("mongoose");

const CHECK_FOR_THRESHOLD_START = process.env.CHECK_FOR_THRESHOLD_START || 11;
const MAXIMUM_ALLOWED_GENDER_RATIO = 60;

const checkGenderRatio = async (mainUser, friend, eventId, age_group, session) => {
  const eventParticipants = await RegisteredParticipant.schema.find({
    event_id: eventId,
    status: "registered",
    age_group: age_group
  }).session(session ? session : null);

  let threshold = CHECK_FOR_THRESHOLD_START - 1
  if (friend && friend.email) {
    threshold = CHECK_FOR_THRESHOLD_START - 2
  }

  if (eventParticipants.length < threshold) {
    return true
  }

  let maleParticipantsCount = eventParticipants.filter(participant => participant.gender === "male").length
  let femaleParticipantsCount = eventParticipants.filter(participant => participant.gender === "female").length

  let isRegisteringMale = false

  if (mainUser.gender == "male") {
    maleParticipantsCount++
    isRegisteringMale = true
  }
  else if (mainUser.gender == "female") {
    femaleParticipantsCount++
    isRegisteringMale = false
  }

  if (friend && friend.email) {
    if (friend.gender == "male") {
      maleParticipantsCount++
    }
    else if (friend.gender == "female") {
      femaleParticipantsCount++
    }
  }

  const totalParticipants = maleParticipantsCount + femaleParticipantsCount

  const maleRatio = (maleParticipantsCount / totalParticipants) * 100
  const femaleRatio = (femaleParticipantsCount / totalParticipants) * 100

  if (isRegisteringMale && maleRatio > MAXIMUM_ALLOWED_GENDER_RATIO) {
    return false
  }
  else if (!isRegisteringMale && femaleRatio > MAXIMUM_ALLOWED_GENDER_RATIO) {
    return false
  }
  return true
}

/*
 * waitlist.sendMassEmail()
 */
exports.sendMassEmail = async function (req, res) {
  const id = req.params.id; // Event ID
  const { age_group } = req.body;
  
  utility.assert(id, "No Event Id provided");
  utility.assert(age_group, "No Age Group provided");

  try {
     const waitlistedParticipants = await Waitlist.schema.find({
      event_id: id,
      age_group: age_group
    }).populate("user_id", "email first_name locale")

    console.log(`Checking ${waitlistedParticipants.length} waitlisted paricipants for email trigger...`);

    let sentCount = 0;

    for (const participant of waitlistedParticipants) {
        const registeredPart = await RegisteredParticipant.schema.findOne(participant.participant_id);
        if (!registeredPart) continue;

        const mainUserObj = {
            gender: registeredPart.gender,
            _id: participant.user_id._id,
            email: participant.user_id.email
        };

        const isAllowed = await checkGenderRatio(mainUserObj, null, participant.event_id, participant.age_group, null);

        if (!isAllowed) {
            console.log(`Skipping ${participant.user_id.email} (Ratio blocked)`);
            continue;
        }

        await Waitlist.schema.findByIdAndUpdate(participant._id, {
            waitlist_email_sent_at: new Date()
        });

        // Create Transaction if missing (using server logic)
        let payment;
        const existingPayment = await Transaction.schema.findOne({
            user_id: participant.user_id._id,
            type: 'Register Event',
            status: 'unpaid',
            event_id: participant.event_id,
        });

        if (existingPayment) {
            payment = existingPayment;
        } else {
             // Basic transaction creation - ensuring we have participant_id
             payment = await Transaction.schema.create({
                user_id: participant.user_id._id,
                participant_id: participant.participant_id,
                type: 'Register Event',
                amount: participant.sub_participant_id ? 40 : 20,
                event_id: participant.event_id,
                status: 'unpaid'
             });
        }

        // Send Email
         await mail.send({
            to: participant.user_id.email,
            locale: participant.user_id.locale || 'en',
            template: 'template',
            subject: res.__({ phrase: 'waitlist.alert.subject', locale: participant.user_id.locale || 'en' }),
            custom: true,
            content: {
              body: res.__({ phrase: 'waitlist.alert.body', locale: participant.user_id.locale || 'en' }, {
                name: participant.user_id.first_name,
                amount: payment.amount
              }),
              button_label: res.__({ phrase: 'waitlist.alert.button-label', locale: participant.user_id.locale || 'en' }),
              button_url: `${process.env.CLIENT_URL}/event/${payment._id}?source=mail`
            }
          });
        console.log(`Email sent to ${participant.user_id.email}`);
        sentCount++;
    }

    return res.status(200).send({ 
        message: `Processed waitlist. Emails sent: ${sentCount}`,
        data: { sent: sentCount }
    });

  } catch (err) {
    console.error(err);
    return res.status(400).send({ error: err.message });
  }
};

/*
 * waitlist.getByEventId()
 */
exports.getByEventId = async function (req, res) {
  const id = req.params.id;
  utility.assert(id, "No Id provided");
  try {
    const data = await Waitlist.getByEventId({
      event_id: new mongoose.Types.ObjectId(id),
    });
    return res.status(200).send({ data: data });
  } catch (err) {
    console.error(err);
    return res.status(400).send({ error: err.message });
  }
};

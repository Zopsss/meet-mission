const team = require('../model/team');
const utility = require('../helper/utility');
const mongoose = require('mongoose');
const s3 = require('../helper/s3');
const path = require('path');
const user = require('../model/user');
const mail = require('../helper/mail');
const moment = require('moment-timezone');

/*
 * team.create()
 */
exports.create = async function (req, res) {
  const data = req.body;

  // Field-level validation with custom error messages
  utility.assert(data, ['event_id', 'team_members'] , 'Please check your required inputs again');
  try {
    const userData = await user.get({ _id: new mongoose.Types.ObjectId(data.team_members[0]) });
    
    await team.add({
      team: {
        members: data.team_members.map(dt => {
          return {
            id: dt
          }
        }),
        age_group: userData?.[0]?.date_of_birth && utility.getAgeGroup(utility.getAgeFromDate(userData?.[0]?.date_of_birth)),
        method: 'assigned by Admin'
      },
      eventId: data.event_id
    });
  
    return res.status(200).send({ 
        message: 'Success add the team' 
      })
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * team.update()
 */
exports.update = async function (req, res) {
  const id = req.params.id || req.team;
  const data = req.body;

  try {
    const existing = await team.getById({ id: id });
    utility.assert(existing.length, 'team not found');

    utility.assert(data, ['event_id', 'team_members'] , 'Please check your required inputs again');
    const userData = await user.get({ _id: new mongoose.Types.ObjectId(data.team_members[0]) });
    
    await team.update({
      id,
      team: {
        members: data.team_members.map(dt => {
          return {
            id: dt
          }
        }),
        age_group: userData?.[0]?.date_of_birth && utility.getAgeGroup(utility.getAgeFromDate(userData[0].date_of_birth))
      },
      eventId: data.event_id
    });
    if(data.subject_email && data.body_email){
      for (const participant of data.team_members){
        let participantData = await user.get({ _id: new mongoose.Types.ObjectId(participant) });

        if(participantData) {
          participantData = participantData[0]
          const email = participantData.email
          const rex = /^(?:[a-z0-9!#$%&amp;'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&amp;'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/
          if (rex.test(email.toLowerCase())){
      
            await mail.send({
                
              to: email,
              locale: 'de',
              template: 'template',
              subject: data.subject_email,
              content: { 
                body: `Hallo ${participantData.first_name || participantData.name},\n\n${data.body_email}`,
                closing: 'Beste grüße,',
                button: {
                  url: process.env.CLIENT_URL,
                  label: 'Zum Meetlocal-Dashboard'
                }
              }
            })
      
          }
        }
      }
    }
  
    return res.status(200).send({ 
      message: 'Success update the team' 
    })
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * team.delete()
 */
exports.delete = async function (req, res) {
  const id = req.params.id;

  try {
    utility.validate(id);
    await team.delete({ id: new mongoose.Types.ObjectId(id) });
    return res.status(200).send({ message: `team deleted` });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * team.cancel()
 * Cancel a team and issue vouchers to its members
 */
exports.cancel = async function (req, res) {
  const id = req.params.id;
  try {
    utility.validate(id);
    const teamData = await team.getById({ id: new mongoose.Types.ObjectId(id) });
    const t = teamData?.[0];
    utility.assert(t, 'Team not found');

    const eventId = t.event_id;
    const eventModel = require('../model/event-management');
    const eventData = await eventModel.getById({ id: new mongoose.Types.ObjectId(eventId) });

    const memberIds = (t.members || []).map(m => m._id || m);
    const RegisteredParticipant = mongoose.model('RegisteredParticipant');
    const participants = await RegisteredParticipant.find({
      event_id: new mongoose.Types.ObjectId(eventId),
      user_id: { $in: memberIds },
      status: 'registered',
      $or: [ { is_cancelled: false }, { is_cancelled: { $exists: false } } ]
    });

    const stripe = require('../model/stripe');
    const redeemBy = Math.floor(moment().add(24, 'months').valueOf() / 1000);

    for (const p of participants) {
      try {
        await RegisteredParticipant.findByIdAndUpdate(p._id, { status: 'canceled', is_cancelled: true, cancel_date: new Date() });
        const txDocs = await mongoose.model('Transaction').find({
          user_id: new mongoose.Types.ObjectId(p.user_id),
          event_id: new mongoose.Types.ObjectId(eventId),
          status: 'paid',
          type: 'Register Event'
        }).lean();
        const amountOffCents = Math.round(
          (txDocs || []).reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount * 100 : 0), 0)
        );
        if (!amountOffCents) throw new Error('No paid transaction found for this user');
        const coupon = await stripe.coupon.createOnce({ amount_off: amountOffCents, currency: 'eur', redeem_by: redeemBy, name: `Voucher - ${eventData.tagline}`, metadata: { user_id: String(p.user_id), event_id: String(eventId), reason: 'admin_team_cancellation', team_id: String(id) } });
        const code = `MEET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const promo = await stripe.promotionCode.create({ coupon: coupon.id, code, expires_at: redeemBy, max_redemptions: 1, metadata: { user_id: String(p.user_id), event_id: String(eventId), coupon_id: coupon.id, team_id: String(id) } });
        await mail.send({ to: p.email, locale: p.locale || req.locale || 'de', custom: true, template: 'event_cancelled', subject: req.__('payment.cancelled_event.subject_personal', { city: eventData.city?.name }), content: { name: `${p.first_name} ${p.last_name}`, body: req.__('payment.cancelled_event.body_personal', { event: eventData.tagline, code: promo.code, date: moment.unix(redeemBy).format('YYYY-MM-DD') }), button_url: process.env.CLIENT_URL, button_label: req.__('payment.cancelled_event.button') } });
      } catch (e) { console.error('Team cancel failed for participant', p?._id, e); }
    }

    return res.status(200).send({ data: true, affected: participants.length });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};
/*
 * team.getteamsByEventId()
 */
exports.getTeamsByEventId = async function (req, res) {
  const id = req.params.id;

  try {
    utility.validate(id);
    const teamData = await team.get({ eventId: new mongoose.Types.ObjectId(id) });
    
    const data = teamData?.map((team, i) => {
      return {
        ...team.toObject(),
        _id: team._id,
        no: i + 1,
        first_member_name: team.members?.[0]?.first_name ? `${team.members?.[0]?.first_name} ${team.members?.[0]?.last_name}` : team.members?.[0]?.name,
        team_members: team.members?.map(team => team.first_name ? `${team.first_name} ${team.last_name}` : team.name),
        assignment_method: team.method,
      }
    })
    return res.status(200).send({ data: data });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

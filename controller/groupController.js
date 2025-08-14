const group = require('../model/group');
const utility = require('../helper/utility');
const mongoose = require('mongoose');
const s3 = require('../helper/s3');
const path = require('path');
const user = require('../model/user');
const team = require('../model/team');
const mail = require('../helper/mail');

/*
 * group.create()
 */
exports.create = async function (req, res) {
  const data = req.body;

  // Field-level validation with custom error messages
  utility.assert(data, ['event_id', 'group_members'] , 'Please check your required inputs again');
  try {
    const teamData = await team.getById({ id: new mongoose.Types.ObjectId(data.group_members[0]) });
    console.log(teamData, 'teamdata');
    
    await group.add({
      group: {
        team_ids: data.group_members.map(dt => {
          return {
            id: dt
          }
        }),
        age_group: teamData?.[0]?.age_group,
        method: 'assigned by Admin',
        slot: Number(data.slot),
        bar_id: data.bar_id,
        group_name: data.group_name
      },
      eventId: data.event_id,
    });
  
    return res.status(200).send({ 
        message: 'Success add the group' 
      })
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * group.update()
 */
exports.update = async function (req, res) {
  const id = req.params.id || req.group;
  const data = req.body;

  try {
    const existing = await group.getById({ id: id });
    utility.assert(!existing.length, 'group not found');

    utility.assert(data, ['event_id', 'group_members'] , 'Please check your required inputs again');
    const teamData = await team.get({ _id: new mongoose.Types.ObjectId(data.group_members[0]) });
    
    const groupData = await group.update({
      id,
      group: {
        team_ids: data.group_members.map(dt => {
          return {
            id: dt
          }
        }),
        age_group: teamData?.[0]?.age_group,
        method: 'assigned by Admin',
        slot: Number(data.slot),
        bar_id: data.bar_id,
        group_name: data.group_name
      },
      eventId: data.event_id
    });

    if(data.subject_email && data.body_email){
      if (groupData){
        let teamDatas = groupData.team_ids
        for(const teamData of teamDatas){
          let participantDatas = teamData.members;
          for(const participantData of participantDatas){
            if(participantData) {
              const email = participantData.email
              const rex = /^(?:[a-z0-9!#$%&amp;'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&amp;'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/
              if (rex.test(email.toLowerCase())){
              
                await mail.send({

                  to: email,
                  locale: 'de',
                  template: 'template',
                  subject: data.subject_email,
                  content: { 
                    body: `Hallo ${participantData.first_name},\n\n${data.body_email}`,
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
    
      }
    }
  
    return res.status(200).send({ 
      message: 'Success update the group' 
    })
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * group.delete()
 */
exports.delete = async function (req, res) {
  const id = req.params.id;

  try {
    utility.validate(id);
    await group.delete({ id: new mongoose.Types.ObjectId(id) });
    return res.status(200).send({ message: `group deleted` });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * group.cancel()
 * Cancel a group and issue vouchers to its members
 */
exports.cancel = async function (req, res) {
  const id = req.params.id;
  try {
    utility.validate(id);
    const groupDataArr = await group.getById({ id: new mongoose.Types.ObjectId(id) });
    const groupData = Array.isArray(groupDataArr) ? groupDataArr[0] : groupDataArr;
    utility.assert(groupData, 'Group not found');

    const eventId = groupData.event_id;
    const eventModel = require('../model/event-management');
    const eventData = await eventModel.getById({ id: new mongoose.Types.ObjectId(eventId) });

    const teamIds = (groupData.team_ids || []).map(t => t._id || t);
    const teams = await mongoose.model('Team').find({ _id: { $in: teamIds } }).lean();
    const memberIds = [...new Set((teams.flatMap(t => t.members || []))).map(id => new mongoose.Types.ObjectId(id))];

    const RegisteredParticipant = mongoose.model('RegisteredParticipant');
    const participants = await RegisteredParticipant.find({
      event_id: new mongoose.Types.ObjectId(eventId),
      user_id: { $in: memberIds },
      status: 'registered',
      $or: [ { is_cancelled: false }, { is_cancelled: { $exists: false } } ]
    });

    const stripe = require('../model/stripe');
    const moment = require('moment-timezone');
    const redeemBy = Math.floor(moment().add(24, 'months').valueOf() / 1000);

    for (const p of participants) {
      try {
        await RegisteredParticipant.findByIdAndUpdate(p._id, { status: 'canceled', is_cancelled: true, cancel_date: new Date() });

        // Amount equals what THIS user actually paid
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

        const coupon = await stripe.coupon.createOnce({ amount_off: amountOffCents, currency: 'eur', redeem_by: redeemBy, name: `Voucher - ${eventData.tagline}`, metadata: { user_id: String(p.user_id), event_id: String(eventId), reason: 'admin_group_cancellation', group_id: String(id) } });
        const code = `MEET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const promo = await stripe.promotionCode.create({ coupon: coupon.id, code, expires_at: redeemBy, max_redemptions: 1, metadata: { user_id: String(p.user_id), event_id: String(eventId), coupon_id: coupon.id, group_id: String(id) } });

        await mail.send({ to: p.email, locale: p.locale || req.locale || 'de', custom: true, template: 'event_cancelled', subject: req.__('payment.cancelled_event_admin.subject', { city: eventData.city?.name }), content: { name: `${p.first_name} ${p.last_name}`, body: req.__('payment.cancelled_event_admin.body', { event: eventData.tagline, code: promo.code, date: moment.unix(redeemBy).format('YYYY-MM-DD') }), button_url: process.env.CLIENT_URL, button_label: req.__('payment.cancelled_event_admin.button') } });
      } catch (e) { console.error('Group cancel failed for participant', p?._id, e); }
    }

    return res.status(200).send({ data: true, affected: participants.length });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};
/*
 * group.getGroupsByEventId()
 */
exports.getGroupsByEventId = async function (req, res) {
  const id = req.params.id;

  try {
    utility.validate(id);
    const groupData = await group.get({ eventId: new mongoose.Types.ObjectId(id) });
    
    const data = groupData?.map((dt, i) => {
      return {
        id: dt._id,
        group_name: dt.group_name,
        participants: dt.total_members,
        total_teams: dt.team_ids?.length || 0,
        status: dt.status || 'Active',
        assignment_method: dt.method || 'assigned by AI',
      }
    })
    return res.status(200).send({ data: data });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * group.getById()
 */
exports.getById = async function (req, res) {
  const id = req.params.id;

  try {
    utility.validate(id);
    const data = await group.getById({ id: new mongoose.Types.ObjectId(id) });
    
    return res.status(200).send({ data: data });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};
const account = require('../model/account');
const utility = require('../helper/utility');
const mongoose = require('mongoose');
const s3 = require('../helper/s3');
const path = require('path');
const user = require('../model/user');
const transaction = require('../model/transaction');

/*
 * transaction.getById()
 */
exports.getById = async function (req, res) {
  const id = req.params.id;
  utility.assert(id , 'No Id provided');
  try {
    const userData = await user.get({ account: req.params.id });
    const data = await transaction.getByUserId({ user_id:  new mongoose.Types.ObjectId(userData?.[0]?._id) });

    return res.status(200).send({ data: data });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};

/*
 * transaction.getByEventId()
 */
exports.getByEventId = async function (req, res) {
  const id = req.params.id;
  utility.assert(id , 'No Id provided');
  try {
    const data = await transaction.getByEventId({ event_id:  new mongoose.Types.ObjectId(id) });
    const formatted = data?.map((dt) => {
      return {
        _id: dt._id,
        status: dt.status,
        name: dt.user_id?.first_name ? `${dt.user_id?.first_name} ${dt.user_id?.last_name}` : dt.user_id.name,
        user_id: dt.user_id?._id,
        age: utility.getAgeFromDate(dt.user_id?.date_of_birth),
        team_partner: dt.invited_user_id && (dt.invited_user_id?.first_name ? `${dt.invited_user_id?.first_name} ${dt.invited_user_id?.last_name}` : dt.invited_user_id?.name),
        team_partner_id: dt.invited_user_id?._id,
        team_partner_age: dt.invited_user_id?.date_of_birth && utility.getAgeFromDate(dt.invited_user_id?.date_of_birth)
      }
    })
    return res.status(200).send({ data: formatted });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
};
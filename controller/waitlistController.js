const utility = require("../helper/utility");
const mongoose = require("mongoose");
const Waitlist = require("../model/waitlist");

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

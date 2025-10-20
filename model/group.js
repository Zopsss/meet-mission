const mongoose = require('mongoose');
const { Schema } = mongoose;

const GroupSchema = new Schema({
  event_id: { type: Schema.Types.ObjectId, ref: 'EventManagement', required: true },
  slot: { type: Number, required: true },
  group_name: { type: String, required: true },
  age_group: { type: String, enum: ['20-30', '31-40', '41-50', '51+'], required: true },
  bar_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
  team_ids: [{ type: Schema.Types.ObjectId, ref: 'Team', required: true }],
  status: { type: String, default: 'Active'},
  method: { type: String, default: 'assigned by AI' }
}, { timestamps: true });

const Group = mongoose.model('Group', GroupSchema, 'groups');
exports.schema = Group;

/*
* group.add()
*/
exports.add = async function ({ group, eventId }) {
  const data = new Group({
    event_id: new mongoose.Types.ObjectId(eventId),
    slot: group.slot,
    group_name: group.group_name,
    age_group: group.age_group,
    bar_id: new mongoose.Types.ObjectId(group.bar_id),
    team_ids: group.team_ids.map(id => new mongoose.Types.ObjectId(id)),
    ...group.method && { method: group.method }
  });

  return await data.save();
};

/*
* group.get()
*/
exports.get = async function ({ eventId }) {
  const data = await Group.aggregate([
    { $match: { event_id: new mongoose.Types.ObjectId(eventId) } },
    {
      $lookup: {
        from: 'teams',
        let: { team_ids: '$team_ids' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$team_ids'] } } }
        ],
        as: 'teams'
      }
    },
    {
      $addFields: {
        total_members: {
          $reduce: {
            input: '$teams',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                { $size: { $ifNull: ['$$this.members', []] } }
              ]
            }
          }
        }
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
  return data;
};

/*
* group.update()
*/
exports.update = async function ({ group, eventId, id }) {
  const data = await Group.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id) },
    {
      event_id: new mongoose.Types.ObjectId(eventId),
      group_name: group.group_name,
      ...(group.age_group && { age_group: group.age_group }),
      ...(group.bar_id && { bar_id: new mongoose.Types.ObjectId(group.bar_id) }),
      ...(group.slot && { slot: group.slot }),
      ...(group.team_ids && {
        team_ids: group.team_ids.map(member => new mongoose.Types.ObjectId(member.id))
      }),
      method: 'assigned by Admin'
    },
    { new: true }
  )
    .populate({
      path: 'team_ids',
      populate: {
        path: 'members',
        model: 'User',
        select: 'first_name email'
      }
    });

  return data;
};

/*
* group.getById()
*/
exports.getById = async function ({ id }) {
  const data = await Group.findOne({ _id: new mongoose.Types.ObjectId(id) })
    .populate({
      path: 'team_ids',
      populate: {
        path: 'members',
        model: 'User',
        select: 'name first_name last_name'
      }
    })
    .populate('bar_id', 'name address');

  return data;
};

/*
* group.delete()
*/
exports.delete = async function ({ id }) {
  if (!id) throw { message: 'Please provide an event ID' };
  await Group.deleteOne({ _id: id });
  return id;
};

/*
* group.getByTeamId()
*/
exports.getByTeamId = async function ({ id }) {
  const data = await Group.find({
    team_ids: new mongoose.Types.ObjectId(id)
  }).populate({
    path: 'bar_id',
    select: 'name address'
  });

  return data;
};

exports.getEventGroupStats = async function (eventId) {
  const result = await Group.aggregate([
    { $match: { event_id: new mongoose.Types.ObjectId(eventId) } },
    {
      $lookup: {
        from: 'teams',
        localField: 'team_ids',
        foreignField: '_id',
        as: 'teams'
      }
    },
    {
      $lookup: {
        from: 'location',
        localField: 'bar_id',
        foreignField: '_id',
        as: 'bar_info'
      }
    },
    { $unwind: '$bar_info' },
    {
      $addFields: {
        members: {
          $sum: {
            $map: {
              input: '$teams',
              as: 't',
              in: { $size: '$$t.members' }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: {
          slot: '$slot',
          bar_id: '$bar_id',
          bar_name: '$bar_info.name',
          available: '$bar_info.available_spots',
          age_group: '$age_group'
        },
        totalMembers: { $sum: '$members' }
      }
    },
    {
      $group: {
        _id: {
          slot: '$_id.slot',
          bar_id: '$_id.bar_id',
          bar_name: '$_id.bar_name',
          available: '$_id.available'
        },
        total: { $sum: '$totalMembers' },
        breakdown: {
          $push: { age_group: '$_id.age_group', members: '$totalMembers' }
        }
      }
    },
    {
      $project: {
        slot: '$_id.slot',
        bar_id: '$_id.bar_id',
        bar_name: '$_id.bar_name',
        available: '$_id.available',
        total: 1,
        breakdown: 1,
        needed: {
          $cond: [
            { $gt: ['$total', '$_id.available'] },
            { $subtract: ['$total', '$_id.available'] },
            0
          ]
        },
        overflow: { $gt: ['$total', '$_id.available'] }
      }
    },
    { $sort: { slot: 1, bar_name: 1 } }
  ]);

  // Now restructure into deficits-per-slot
  const barRoundUsage = {};
  const deficits = {};

  for (const g of result) {
    const barId = String(g.bar_id);
    if (!barRoundUsage[barId]) barRoundUsage[barId] = {};
    barRoundUsage[barId][g.slot] = {
      total: g.total,
      breakdown: g.breakdown.reduce((acc, b) => {
        acc[b.age_group] = (acc[b.age_group] || 0) + b.members;
        return acc;
      }, {})
    };

    if (g.needed > 0) {
      if (!deficits[barId]) deficits[barId] = [];
      deficits[barId].push({
        slot: g.slot,
        needed: g.needed,
        total: g.total,
        available: g.available,
        breakdown: barRoundUsage[barId][g.slot].breakdown,
        name: g.bar_name
      });
    }
  }

  return { deficits, barRoundUsage };

};




const mongoose = require('mongoose');
const { Schema } = mongoose;

const GroupSchema = new Schema({
  event_id: { type: Schema.Types.ObjectId, ref: 'EventManagement', required: true },
  slot: { type: Number, required: true },
  group_name: { type: String, required: true },
  age_group: { type: String, enum: ['18-30', '31-40', '41+'], required: true },
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
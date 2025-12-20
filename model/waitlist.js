const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WaitlistSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participant_id: {
      type: Schema.Types.ObjectId,
      ref: "RegisteredParticipant",
      required: true,
    },
    event_id: {
      type: Schema.Types.ObjectId,
      ref: "EventManagement",
      required: true,
    },
    age_group: {
      type: String,
      enum: ["20–30", "31–40", "41–50", "50+"],
      required: true,
    },
    invited_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    invited_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sub_participant_id: {
      type: [Schema.Types.ObjectId],
      ref: "RegisteredParticipant",
      default: null,
    },
    waitlist_email_sent_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Waitlist = mongoose.model("Waitlist", WaitlistSchema, "waitlist");
exports.schema = Waitlist;

exports.getByEventId = async function ({ event_id }) {
  return await Waitlist.find({ event_id })
    .populate("user_id", "email first_name last_name")
    .populate("participant_id")
    .lean();
};

const mongoose = require('mongoose');

// A nickname is private to the viewer who set it (`owner`) — it overrides how
// `target`'s name is displayed, but only in the owner's own view. Never shared
// or shown to `target` or anyone else.
const NicknameSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nickname: {
      type: String,
      required: [true, 'Please add a nickname'],
      trim: true,
      maxlength: [50, 'Nickname can not be more than 50 characters']
    }
  },
  { timestamps: true }
);

// One nickname per (viewer, target) pair — setting a new one for the same
// person upserts rather than creating a duplicate row.
NicknameSchema.index({ owner: 1, target: 1 }, { unique: true });
NicknameSchema.index({ owner: 1 });

module.exports = mongoose.model('Nickname', NicknameSchema);

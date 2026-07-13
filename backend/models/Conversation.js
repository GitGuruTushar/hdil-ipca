const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length >= 2,
      message: 'A conversation needs at least 2 participants'
    }
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  // Only required for group conversations — 1:1 conversations are identified by their participants instead.
  groupName: {
    type: String,
    trim: true,
    maxlength: [100, 'Group name can not be more than 100 characters'],
    required: [function () { return this.isGroup; }, 'Group name is required for group conversations']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Group-only: freeform blurb shown in the group info view.
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  // Group-only: Cloudinary secure_url for the group photo.
  avatarUrl: {
    type: String,
    default: null
  },
  // Group-only: creator is seeded as the first admin on create. Only admins can
  // add/remove members, rename the group, or edit description/photo — 1:1
  // conversations don't use this at all.
  admins: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  // Truncated via a setter (rather than just a maxlength validator) so callers can
  // hand in the raw message content without needing to pre-truncate it themselves.
  lastMessageText: {
    type: String,
    maxlength: [300, 'Last message preview can not be more than 300 characters'],
    set: (text) => (typeof text === 'string' && text.length > 300 ? text.slice(0, 300) : text)
  },
  lastReadBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastReadAt: {
      type: Date
    }
  }],
  // Mirrors lastReadBy exactly, tracking when each participant's client last
  // fetched/received messages (as opposed to actually reading them) — a
  // message is "delivered" to the conversation once every other participant's
  // entry here is >= the message's createdAt, and "read" the same way against
  // lastReadBy. Derived at render time, not stored per-message.
  lastDeliveredBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastDeliveredAt: {
      type: Date
    }
  }]
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);

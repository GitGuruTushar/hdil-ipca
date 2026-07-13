const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    // A message can now be attachment-only — text is only required when
    // there's nothing else in the message. A delete-for-everyone tombstone
    // deliberately blanks both content AND attachments, so it's exempted here
    // too — otherwise saving the tombstone state would fail its own validation.
    required: [
      function () { return !this.isDeletedForEveryone && (!this.attachments || this.attachments.length === 0); },
      'Please add message content'
    ],
    trim: true,
    maxlength: [2000, 'Message can not be more than 2000 characters']
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeletedForEveryone: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // "Delete for me" — the message stays intact for every other participant.
  deletedFor: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  attachments: [{
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'document'], required: true },
    fileName: { type: String },
    mimeType: { type: String }
  }],
  // One reaction per user, enforced by the route's toggle logic rather than a
  // schema constraint.
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String, maxlength: 8 }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  // UI "Forwarded" label only — not used for permissions or lookups.
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  pinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: {
    type: Date,
    default: null
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Supports "messages in this conversation, newest first" — the access pattern every route uses.
MessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);

const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [150, 'Title can not be more than 150 characters']
  },
  content: {
    type: String,
    required: [true, 'Please add content'],
    maxlength: [2000, 'Content can not be more than 2000 characters']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Please add an expiry date']
  },
  targetAudience: {
    type: String,
    enum: ['everyone', 'owners', 'tenants'],
    default: 'everyone'
  },
  targetBuilding: {
    type: Number
  },
  targetGala: {
    type: Number
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published'],
    default: 'published'
  },
  publishAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

NoticeSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Notice', NoticeSchema);

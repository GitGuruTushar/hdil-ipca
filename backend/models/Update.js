const mongoose = require('mongoose');
const { localizedFieldSchema } = require('../utils/localizedField');

const UpdateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['news', 'announcement', 'blogs'],
    required: true
  },
  category: {
    type: String,
    enum: ['maintenance', 'events', 'achievements', 'general'],
    default: 'general'
  },
  title: localizedFieldSchema({ required: [true, 'Please add a title'], maxlength: [100, 'Title can not be more than 100 characters'] }),
  content: localizedFieldSchema({ required: [true, 'Please add content'], maxlength: [5000, 'Content can not be more than 5000 characters'] }),
  images: [String],
  videoUrl: String,
  keywords: {
    type: [String],
    default: []
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
  },
  redirectUrl: String
}, { timestamps: true });

module.exports = mongoose.model('Update', UpdateSchema);

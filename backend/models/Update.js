const mongoose = require('mongoose');

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
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title can not be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Please add content'],
    maxlength: [5000, 'Content can not be more than 5000 characters']
  },
  images: [String],
  videoUrl: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  redirectUrl: String
}, { timestamps: true });

module.exports = mongoose.model('Update', UpdateSchema);

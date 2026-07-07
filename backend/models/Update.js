const mongoose = require('mongoose');

const UpdateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['news','announcement','blogs', 'gallery'],
    required: true
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
    maxlength: [1000, 'Content can not be more than 1000 characters']
  },
  imageUrl: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  redirectUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Update', UpdateSchema);


const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject'],
    trim: true,
    maxlength: [150, 'Subject can not be more than 150 characters']
  },
  message: {
    type: String,
    required: [true, 'Please add a message'],
    maxlength: [2000, 'Message can not be more than 2000 characters']
  },
  status: {
    type: String,
    enum: ['new', 'reviewed'],
    default: 'new'
  },
  adminNote: {
    type: String,
    maxlength: [1000, 'Admin note can not be more than 1000 characters']
  }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);

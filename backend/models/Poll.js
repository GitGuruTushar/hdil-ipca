const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Please add a question'],
    trim: true,
    maxlength: [200, 'Question can not be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    votes: {
      type: Number,
      default: 0
    }
  }],
  votedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expiresAt: {
    type: Date,
    required: true
  },
  closedEarly: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

PollSchema.methods.isOpen = function () {
  return !this.closedEarly && new Date(this.expiresAt) > new Date();
};

module.exports = mongoose.model('Poll', PollSchema);

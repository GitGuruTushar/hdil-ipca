const mongoose = require('mongoose');
const crypto = require('crypto');

const WorkshopSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title can not be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description can not be more than 1000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Please add a date and time']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  capacity: {
    type: Number,
    required: [true, 'Please add a capacity'],
    min: [1, 'Capacity must be at least 1']
  },
  registeredUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reminderSentAt: Date,
  checkinCode: {
    type: String,
    default: () => crypto.randomBytes(4).toString('hex')
  },
  checkedInUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Workshop', WorkshopSchema);

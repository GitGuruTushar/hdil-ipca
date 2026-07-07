const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
  vacancy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vacancy',
    required: true
  },
  applicantName: {
    type: String,
    required: [true, 'Please add your name'],
    trim: true
  },
  applicantEmail: {
    type: String,
    required: [true, 'Please add your email'],
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please add a valid email']
  },
  applicantPhone: {
    type: String,
    required: [true, 'Please add your phone number'],
    trim: true
  },
  coverNote: {
    type: String,
    maxlength: [1000, 'Cover note can not be more than 1000 characters']
  }
}, { timestamps: true });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);

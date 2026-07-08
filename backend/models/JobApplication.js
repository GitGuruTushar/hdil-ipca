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
    trim: true,
    maxlength: [200, 'Name can not be more than 200 characters']
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
    trim: true,
    maxlength: [20, 'Phone number can not be more than 20 characters']
  },
  coverNote: {
    type: String,
    maxlength: [1000, 'Cover note can not be more than 1000 characters']
  },
  resumeUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'shortlisted', 'rejected'],
    default: 'new'
  }
}, { timestamps: true });

JobApplicationSchema.index({ vacancy: 1 });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);

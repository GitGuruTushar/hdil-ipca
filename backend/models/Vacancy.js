const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true,
    maxlength: [150, 'Title can not be more than 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description can not be more than 2000 characters']
  },
  eligibility: {
    type: String,
    required: [true, 'Please add eligibility criteria'],
    maxlength: [1000, 'Eligibility can not be more than 1000 characters']
  },
  deadline: {
    type: Date,
    required: [true, 'Please add an application deadline']
  },
  industry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Industry'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  keywords: {
    type: [String],
    default: []
  }
}, { timestamps: true });

VacancySchema.index({ status: 1, deadline: 1 });

module.exports = mongoose.model('Vacancy', VacancySchema);

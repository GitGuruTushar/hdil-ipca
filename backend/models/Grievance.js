const mongoose = require('mongoose');

const GrievanceSchema = new mongoose.Schema({
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
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description can not be more than 2000 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open'
  },
  adminResponse: {
    type: String,
    maxlength: [1000, 'Admin response can not be more than 1000 characters']
  }
}, { timestamps: true });

module.exports = mongoose.model('Grievance', GrievanceSchema);

const mongoose = require('mongoose');

const DuesRecordSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  industry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Industry'
  },
  period: {
    type: String,
    required: [true, 'Please add a period'],
    trim: true,
    maxlength: [30, 'Period can not be more than 30 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: 0
  },
  status: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending'
  },
  note: {
    type: String,
    maxlength: [500, 'Note can not be more than 500 characters']
  }
}, { timestamps: true });

module.exports = mongoose.model('DuesRecord', DuesRecordSchema);

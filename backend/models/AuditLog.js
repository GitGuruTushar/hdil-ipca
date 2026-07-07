const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: [true, 'Please add an action'],
    trim: true,
    maxlength: [60, 'Action can not be more than 60 characters']
  },
  targetType: {
    type: String,
    required: [true, 'Please add a target type'],
    trim: true,
    maxlength: [40, 'Target type can not be more than 40 characters']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  meta: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);

const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [150, 'Title can not be more than 150 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description can not be more than 1000 characters']
  },
  category: {
    type: String,
    enum: ['bylaws', 'minutes', 'circulars', 'other'],
    default: 'other'
  },
  otherCategoryLabel: {
    type: String,
    trim: true,
    maxlength: 100,
    required: [function () { return this.category === 'other'; }, 'A label is required when category is Other']
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['everyone', 'owners', 'tenants'],
    default: 'everyone'
  },
  targetBuildings: {
    type: [Number],
    default: []
  },
  targetGalas: {
    type: [Number],
    default: []
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);

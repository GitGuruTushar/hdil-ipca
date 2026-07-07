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
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);

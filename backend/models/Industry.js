const mongoose = require('mongoose');

const IndustrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  products: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true
    },
    images: [{
      type: String // Array of URLs for product photos
    }]
  }],
  materials: [String],
  gstInfo: {
    type: String,
    required: [true, 'Please add GST information']
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add a contact number']
  },
  vacancy: {
    available: {
      type: Boolean,
      default: false
    },
    description: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    type: String // General images related to the industry
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Industry', IndustrySchema);

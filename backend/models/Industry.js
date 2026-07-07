const mongoose = require('mongoose');

const IndustrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a business name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  businessType: {
    type: String,
    required: [true, 'Please add a business type'],
    trim: true,
    maxlength: [100, 'Business type can not be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  galaNumber: {
    type: Number,
    required: [true, 'Please add a gala number']
  },
  buildingNumber: {
    type: Number,
    required: [true, 'Please add a building number']
  },
  occupancyType: {
    type: String,
    enum: ['owner', 'tenant'],
    required: [true, 'Please specify owner or tenant']
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
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    type: String // General images related to the business
  }]
}, { timestamps: true });

module.exports = mongoose.model('Industry', IndustrySchema);

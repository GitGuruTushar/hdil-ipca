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
  keywords: {
    type: [String],
    default: []
  },
  gstInfo: {
    type: String,
    required: [true, 'Please add GST information'],
    maxlength: [50, 'GST information can not be more than 50 characters']
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add a contact number'],
    maxlength: [20, 'Contact number can not be more than 20 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    type: String // General images related to the business
  }],
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

IndustrySchema.index({ owner: 1 });

module.exports = mongoose.model('Industry', IndustrySchema);

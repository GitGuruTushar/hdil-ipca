const mongoose = require('mongoose');
const { localizedFieldSchema } = require('../utils/localizedField');

const IndustrySchema = new mongoose.Schema({
  name: localizedFieldSchema({ required: [true, 'Please add a business name'], maxlength: [50, 'Name can not be more than 50 characters'] }),
  businessType: localizedFieldSchema({ required: [true, 'Please add a business type'], maxlength: [100, 'Business type can not be more than 100 characters'] }),
  description: localizedFieldSchema({ required: [true, 'Please add a description'], maxlength: [500, 'Description can not be more than 500 characters'] }),
  // A genuinely separate long-form field shown only on the full business page —
  // `description` stays the short teaser reused in the compact card/quick-view
  // popup, which would look broken with a 3000-char wall of text.
  aboutUs: localizedFieldSchema({ maxlength: [3000, 'About us can not be more than 3000 characters'] }),
  foundedYear: {
    type: Number
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
    name: localizedFieldSchema({ required: true }),
    description: localizedFieldSchema(),
    price: {
      type: Number,
      required: true
    },
    images: [{
      type: String // Array of URLs for product photos
    }]
  }],
  materials: [String],
  // "HH:mm" strings, single local timezone assumed (no cross-timezone complexity needed here).
  businessHours: {
    mon: { open: String, close: String, closed: { type: Boolean, default: false } },
    tue: { open: String, close: String, closed: { type: Boolean, default: false } },
    wed: { open: String, close: String, closed: { type: Boolean, default: false } },
    thu: { open: String, close: String, closed: { type: Boolean, default: false } },
    fri: { open: String, close: String, closed: { type: Boolean, default: false } },
    sat: { open: String, close: String, closed: { type: Boolean, default: false } },
    sun: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  socialLinks: {
    website: String,
    facebook: String,
    instagram: String,
    whatsapp: String
  },
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
IndustrySchema.index({ 'name.en': 1 }, { unique: true });

module.exports = mongoose.model('Industry', IndustrySchema);

const mongoose = require('mongoose');

// Flexible CMS store for public-page content (home/about/contact). `data` shape
// differs per page, so it's left as Mixed rather than a strict sub-schema —
// the frontend that eventually consumes this owns interpreting the fields.
const SiteContentSchema = new mongoose.Schema({
  page: {
    type: String,
    enum: ['home', 'about', 'contact'],
    required: [true, 'Please specify a page'],
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteContent', SiteContentSchema);

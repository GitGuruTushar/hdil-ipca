const mongoose = require('mongoose');

// Flexible CMS store for public-page content (home/about/contact). `data` shape
// differs per page, so it's left as Mixed rather than a strict sub-schema —
// the frontend that eventually consumes this owns interpreting the fields.
const SiteContentSchema = new mongoose.Schema({
  page: {
    type: String,
    enum: ['home', 'about', 'contact', 'gallery', 'updates', 'helpline'],
    required: [true, 'Please specify a page'],
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Bumped whenever the field contract in utils/siteContentFields.js changes shape,
  // so callers can detect a stale document instead of silently rendering missing fields.
  schemaVersion: {
    type: Number,
    default: 1
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteContent', SiteContentSchema);

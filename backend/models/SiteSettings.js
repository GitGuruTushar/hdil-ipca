const mongoose = require('mongoose');
const { localizedFieldSchema } = require('../utils/localizedField');

// Singleton — cross-cutting site chrome (nav, footer, contact info, SEO),
// as opposed to SiteContent's per-page prose. Only ever one document exists;
// routes/siteSettings.js upserts against an empty filter.
const SiteSettingsSchema = new mongoose.Schema(
  {
    brand: {
      name: { type: String, default: '' }, // proper noun / wordmark — deliberately not localized
      short: { type: String, default: '' },
      fullForm: localizedFieldSchema(),
      tagline: localizedFieldSchema()
    },
    contactInfo: {
      officeLine: { type: String, default: '' },
      addressLines: { type: [String], default: [] },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      hours: [{ days: String, time: String }]
    },
    nav: [
      {
        label: localizedFieldSchema(),
        href: { type: String, required: true },
        variant: { type: String, enum: ['link', 'emergency', 'cta'], default: 'link' }
      }
    ],
    loginLink: {
      label: localizedFieldSchema(),
      href: { type: String, default: '/login' }
    },
    footer: {
      blurb: localizedFieldSchema(),
      copyright: localizedFieldSchema(),
      ctaHeading: localizedFieldSchema(),
      ctaHeadingEm: localizedFieldSchema(),
      ctaButtonLabel: localizedFieldSchema(),
      ctaButtonHref: { type: String, default: '/contact' }
    },
    seo: [
      {
        route: { type: String, required: true },
        title: localizedFieldSchema(),
        description: localizedFieldSchema()
      }
    ],
    themeColor: { type: String, default: '#4F46E2' },
    defaultLang: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);

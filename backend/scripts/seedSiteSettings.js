// One-time bootstrap for the SiteSettings singleton (nav/footer/contact/SEO/theme),
// seeded from the values that used to live in the now-retired src/content/site.js,
// so the admin editor and the CMS-driven navbar/footer start with real content
// instead of blanks.
// Not exposed over HTTP — run manually: node scripts/seedSiteSettings.js
// (reads MONGODB_URI from .env). Skips if a SiteSettings document already exists.
require('dotenv').config();
const mongoose = require('mongoose');
const SiteSettings = require('../models/SiteSettings');

const loc = (en = '') => ({ en, hi: '', mr: '' });

const DEFAULT_SETTINGS = {
  brand: {
    name: 'HDIL-IPCA',
    short: 'IPCA',
    fullForm: loc('HDIL Industrial Premises Co-operative Association'),
    tagline: loc('Where industry meets community.')
  },
  contactInfo: {
    officeLine: 'Federation Office — Building No. 7',
    addressLines: ['HDIL Industrial Park', 'Chandansar, Virar (East)', 'Palghar, Maharashtra 401305'],
    email: 'office@hdilipca.in',
    phone: '+91 98200 00000',
    whatsapp: '',
    hours: [
      { days: 'Monday – Saturday', time: '10:00 – 18:00 IST' },
      { days: 'Sunday & public holidays', time: 'Closed' }
    ]
  },
  nav: [
    { label: loc('Home'), href: '/', variant: 'link' },
    { label: loc('About'), href: '/about', variant: 'link' },
    { label: loc('Directory'), href: '/directory', variant: 'link' },
    { label: loc('News'), href: '/updates', variant: 'link' },
    { label: loc('Gallery'), href: '/gallery', variant: 'link' },
    { label: loc('Helpline'), href: '/helpline', variant: 'emergency' },
    { label: loc('Contact'), href: '/contact', variant: 'cta' }
  ],
  loginLink: { label: loc('Login'), href: '/login' },
  footer: {
    blurb: loc('The federation of the HDIL Industrial Park, Virar (East) — since 2004.'),
    copyright: loc(`© ${new Date().getFullYear()} HDIL-IPCA. All rights reserved.`),
    ctaHeading: loc("Let's build,"),
    ctaHeadingEm: loc('together.'),
    ctaButtonLabel: loc('Contact the federation'),
    ctaButtonHref: '/contact'
  },
  seo: [
    { route: '/', title: loc('HDIL-IPCA — HDIL Industrial Park, Virar (East)'), description: loc("HDIL-IPCA is the federation of the HDIL Industrial Park, Chandansar, Virar (East) — uniting property owners, businesses and workers to build a thriving industrial community.") },
    { route: '/about', title: loc('About Us — HDIL-IPCA'), description: loc('The story, mission and people behind HDIL-IPCA.') },
    { route: '/directory', title: loc('Business Directory — HDIL-IPCA'), description: loc('Search every business in the federation.') },
    { route: '/updates', title: loc('News & Updates — HDIL-IPCA'), description: loc('Circulars, works and wins from the federation office.') },
    { route: '/gallery', title: loc('Gallery — HDIL-IPCA'), description: loc('Photographs from federation events and works across the park.') },
    { route: '/helpline', title: loc('Emergency Helpline — HDIL-IPCA'), description: loc('Every critical number for the park.') },
    { route: '/contact', title: loc('Contact Us — HDIL-IPCA'), description: loc('Reach the federation office for anything from maintenance to membership.') }
  ],
  themeColor: '#4F46E2',
  defaultLang: 'en'
};

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env — set it first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const existing = await SiteSettings.findOne();
  if (existing) {
    console.log('Skipped — a SiteSettings document already exists.');
  } else {
    await SiteSettings.create(DEFAULT_SETTINGS);
    console.log('Seeded SiteSettings.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

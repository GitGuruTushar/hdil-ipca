// One-time bootstrap for placeholder Home/About/Contact CMS content. Not exposed
// over HTTP — run manually: node scripts/seedSiteContent.js (reads MONGODB_URI
// from .env). Idempotent: skips any page that already has a SiteContent doc.
require('dotenv').config();
const mongoose = require('mongoose');
const SiteContent = require('../models/SiteContent');

const PLACEHOLDER_CONTENT = {
  home: {
    heroKicker: 'HDIL INDUSTRIAL PARK · VIRAR (EAST)',
    heroTitle: 'Where Virar builds',
    heroHighlight: 'builds',
    heroSubtitle:
      'A federation of industrial owners and tenants working together on infrastructure, safety, and shared services across the HDIL Industrial Park.',
    stats: [
      { label: 'Years active', value: '15+' },
      { label: 'Buildings', value: '12' },
      { label: 'Galas', value: '450+' },
      { label: 'Member businesses', value: '300+' }
    ],
    introText:
      'The HDIL Industrial Park Association represents the owners and occupiers of galas across the park, coordinating on everything from emergency services to common infrastructure so that businesses here can focus on running their operations.'
  },
  about: {
    visionText:
      'We exist to give the industrial community at HDIL Park a unified voice — one that can negotiate with authorities, maintain shared infrastructure, and hold service providers accountable, so that every owner and tenant here operates in a safer, better-run park.',
    history: [
      { year: '2009', text: 'HDIL Industrial Park is developed and the first galas are allotted to owners.' },
      { year: '2014', text: 'A group of founding members forms an informal owners’ committee to coordinate common concerns.' },
      { year: '2018', text: 'The association is formally registered to represent owners and tenants collectively.' },
      { year: '2023', text: 'Membership crosses 300 businesses across 12 buildings in the park.' }
    ],
    stats: [
      { label: 'Years active', value: '15+' },
      { label: 'Buildings', value: '12' },
      { label: 'Galas', value: '450+' },
      { label: 'Member businesses', value: '300+' }
    ],
    leadership: [
      {
        name: 'Ramesh Patil',
        role: 'President',
        photoUrl: '',
        bio: 'Ramesh has run a manufacturing unit in the park for over a decade and has led the association since 2021, focused on infrastructure upgrades and member services.'
      },
      {
        name: 'Sunita Deshmukh',
        role: 'Vice President',
        photoUrl: '',
        bio: 'Sunita represents tenant interests on the committee and coordinates the association’s safety and compliance initiatives.'
      },
      {
        name: 'Anil Kadam',
        role: 'Treasurer',
        photoUrl: '',
        bio: 'Anil oversees association finances and vendor contracts, with a background in industrial accounting and facilities management.'
      },
      {
        name: 'Farhan Sheikh',
        role: 'Secretary',
        photoUrl: '',
        bio: 'Farhan manages member communications, notices, and day-to-day administration for the association.'
      }
    ]
  },
  contact: {
    address: 'HDIL Industrial Park, Chandansar Road, Virar (East), Palghar, Maharashtra 401305',
    email: 'contact@hdilindustrialpark.org',
    phone: '+91 98765 43210',
    hours: 'Monday – Saturday, 10:00 AM – 6:00 PM',
    mapEmbedUrl: 'https://www.google.com/maps?q=Virar+East+Palghar+Maharashtra&output=embed'
  }
};

async function main() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env — set it first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  for (const page of Object.keys(PLACEHOLDER_CONTENT)) {
    const existing = await SiteContent.findOne({ page });
    if (existing) {
      console.log(`Skipped "${page}" — content already exists.`);
      continue;
    }

    await SiteContent.create({ page, data: PLACEHOLDER_CONTENT[page] });
    console.log(`Seeded placeholder content for "${page}".`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// One-time bootstrap for placeholder Home/About/Contact CMS content. Not exposed
// over HTTP — run manually: node scripts/seedSiteContent.js (reads MONGODB_URI
// from .env). Upserts any page whose stored schemaVersion doesn't match the
// current contract in utils/siteContentFields.js, so it's safe to re-run after a
// field-shape change without clobbering content that's already been re-saved
// through the admin editor (which always writes the current schemaVersion).
require('dotenv').config();
const mongoose = require('mongoose');
const SiteContent = require('../models/SiteContent');
const { SCHEMA_VERSION, DEFAULT_SITE_CONTENT } = require('../utils/siteContentFields');

async function main() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env — set it first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  for (const page of Object.keys(DEFAULT_SITE_CONTENT)) {
    const existing = await SiteContent.findOne({ page });
    if (existing && existing.schemaVersion === SCHEMA_VERSION) {
      console.log(`Skipped "${page}" — already on schema v${SCHEMA_VERSION}.`);
      continue;
    }

    await SiteContent.findOneAndUpdate(
      { page },
      { data: DEFAULT_SITE_CONTENT[page], schemaVersion: SCHEMA_VERSION },
      { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`Seeded "${page}" on schema v${SCHEMA_VERSION}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

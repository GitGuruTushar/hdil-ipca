// One-time migration for the Phase 6 targeting-array field shape: copies any
// existing singular targetBuilding/targetGala Number values on Notice into
// the new plural targetBuildings/targetGalas array fields, so pre-existing
// targeted notices keep working once the schema moves to arrays instead of
// silently becoming "visible to everyone" (an empty array means unscoped).
// Additive only — never $unset's the old singular fields, and safe to run
// again (idempotent: a document with no targetBuilding/targetGala is a no-op,
// and re-running after a successful migration just re-sets the same array).
// Operates via the raw MongoDB driver (not Mongoose documents/save()), same
// reasoning as migrateLocalizedFields.js — the new schema no longer declares
// targetBuilding/targetGala as paths at all, so a Mongoose document read
// wouldn't expose their still-present raw values.
// Run manually, BEFORE deploying the new schema/routes: node scripts/migrateNoticeTargeting.js
require('dotenv').config();
const mongoose = require('mongoose');

async function migrateNotices(db) {
  const col = db.collection('notices');
  const docs = await col.find({ $or: [{ targetBuilding: { $exists: true } }, { targetGala: { $exists: true } }] }).toArray();
  let migrated = 0;
  for (const doc of docs) {
    const set = {};
    if (doc.targetBuilding != null) set.targetBuildings = [doc.targetBuilding];
    if (doc.targetGala != null) set.targetGalas = [doc.targetGala];
    if (Object.keys(set).length) {
      await col.updateOne({ _id: doc._id }, { $set: set });
      migrated += 1;
    }
  }
  console.log(`Notices migrated: ${migrated} (of ${docs.length} candidates)`);
}

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env — set it first.');
    process.exit(1);
  }

  const conn = await mongoose.connect(MONGODB_URI);
  const db = conn.connection.db;
  await migrateNotices(db);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

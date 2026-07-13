// One-time migration for the Milestone 2 multilingual field shape: converts any
// existing plain-string title/content/name/description/caption fields on
// Update/Album/EmergencyContact into { en: <old value>, hi: '', mr: '' }, so
// pre-existing data survives the schema change instead of being silently
// dropped. Idempotent — skips documents whose field is already an object.
// Operates via the raw MongoDB driver (not Mongoose documents/save()) so the
// NEW schema's object-typed cast doesn't get in the way of reading the OLD
// plain-string values still sitting in the database.
// Run manually: node scripts/migrateLocalizedFields.js (reads MONGODB_URI from .env).
require('dotenv').config();
const mongoose = require('mongoose');

const toLocalized = (value) => {
  if (value == null) return { en: '', hi: '', mr: '' };
  if (typeof value === 'object') return value;
  return { en: value, hi: '', mr: '' };
};

async function migrateUpdates(db) {
  const col = db.collection('updates');
  const docs = await col.find({ $or: [{ title: { $type: 'string' } }, { content: { $type: 'string' } }] }).toArray();
  for (const doc of docs) {
    await col.updateOne(
      { _id: doc._id },
      { $set: { title: toLocalized(doc.title), content: toLocalized(doc.content) } }
    );
  }
  console.log(`Updates migrated: ${docs.length}`);
}

async function migrateAlbums(db) {
  const col = db.collection('albums');
  const docs = await col.find({ title: { $type: 'string' } }).toArray();
  for (const doc of docs) {
    const items = (doc.items || []).map((item) => ({ ...item, caption: toLocalized(item.caption) }));
    await col.updateOne(
      { _id: doc._id },
      { $set: { title: toLocalized(doc.title), description: toLocalized(doc.description), items } }
    );
  }
  console.log(`Albums migrated: ${docs.length}`);
}

async function migrateEmergencyContacts(db) {
  const col = db.collection('emergencycontacts');
  const docs = await col.find({ name: { $type: 'string' } }).toArray();
  for (const doc of docs) {
    await col.updateOne(
      { _id: doc._id },
      { $set: { name: toLocalized(doc.name), note: toLocalized(doc.note), hours: toLocalized(doc.hours) } }
    );
  }
  console.log(`Emergency contacts migrated: ${docs.length}`);
}

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env — set it first.');
    process.exit(1);
  }

  const conn = await mongoose.connect(MONGODB_URI);
  const db = conn.connection.db;
  await migrateUpdates(db);
  await migrateAlbums(db);
  await migrateEmergencyContacts(db);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

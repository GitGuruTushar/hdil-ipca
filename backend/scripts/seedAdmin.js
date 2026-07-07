// One-time bootstrap for the very first admin account. Not exposed over HTTP —
// run manually: node scripts/seedAdmin.js (reads ADMIN_* from .env).
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const { ADMIN_USERNAME, ADMIN_FULLNAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_FULLNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Missing ADMIN_USERNAME, ADMIN_FULLNAME, ADMIN_EMAIL, or ADMIN_PASSWORD in .env — set these first.'
    );
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log(`An admin already exists (${existingAdmin.email}). Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    username: ADMIN_USERNAME,
    fullName: ADMIN_FULLNAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    status: 'approved'
  });

  console.log(`Admin account created: ${admin.email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

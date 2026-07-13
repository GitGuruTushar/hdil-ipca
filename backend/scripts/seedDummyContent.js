// Bulk dummy-content seeder for local/dev demoing — populates the business
// directory, gallery, news/updates, notices, workshops, vacancies, emergency
// contacts, polls, documents, and a few dummy member accounts to own them.
// Content (en/hi/mr) is drafted ahead of time into scripts/data/dummyContent.json;
// this script only handles DB wiring (owners, refs, image URLs).
//
// Every insert is skip-if-exists by a natural key (name/title/question/email),
// so it's safe to re-run after data/dummyContent.json gains new sections
// (e.g. once the "updates" batch is drafted) without duplicating anything
// already seeded.
//
// Not exposed over HTTP — run manually: node scripts/seedDummyContent.js
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Industry = require('../models/Industry');
const Album = require('../models/Album');
const Update = require('../models/Update');
const Notice = require('../models/Notice');
const Workshop = require('../models/Workshop');
const Vacancy = require('../models/Vacancy');
const EmergencyContact = require('../models/EmergencyContact');
const Poll = require('../models/Poll');
const Document = require('../models/Document');
const SiteContent = require('../models/SiteContent');

const content = require('./data/dummyContent.json');

const DUMMY_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

let imgCounter = 0;
const img = (w = 800, h = 600) => {
  imgCounter += 1;
  const id = (imgCounter % 300) + 5; // picsum ids 5-304, all known-valid
  return `https://picsum.photos/id/${id}/${w}/${h}`;
};

const DUMMY_OWNERS = [
  { first: 'Vijay', last: 'Chavan' },
  { first: 'Prakash', last: 'Jadhav' },
  { first: 'Sanjay', last: 'More' },
  { first: 'Manoj', last: 'Gupta' },
  { first: 'Rahul', last: 'Sharma' },
  { first: 'Deepak', last: 'Yadav' },
  { first: 'Ashok', last: 'Pawar' },
  { first: 'Vinod', last: 'Shah' },
  { first: 'Suresh', last: 'Naik' },
  { first: 'Ravi', last: 'Kulkarni' },
  { first: 'Amit', last: 'Bhoir' },
  { first: 'Nilesh', last: 'Vartak' },
  { first: 'Ganesh', last: 'Thakur' },
  { first: 'Mahesh', last: 'Rathod' },
  { first: 'Kiran', last: 'Mestry' }
];

async function seedDummyUsers() {
  const users = [];
  for (let i = 0; i < DUMMY_OWNERS.length; i++) {
    const { first, last } = DUMMY_OWNERS[i];
    const email = `${first}.${last}@hdilipca-demo.in`.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: `${first}.${last}`.toLowerCase(),
        fullName: `${first} ${last}`,
        phone: `+91 98${String(20000000 + i * 137).slice(0, 8)}`,
        email,
        password: 'Demo@12345',
        role: 'member',
        status: 'approved'
      });
      console.log(`  + user ${email}`);
    }
    users.push(user);
  }
  return users;
}

async function seedIndustries(owners) {
  const created = [];
  for (let i = 0; i < content.industries.length; i++) {
    const src = content.industries[i];
    let doc = await Industry.findOne({ 'name.en': src.name.en });
    if (!doc) {
      const owner = owners[i % owners.length];
      doc = await Industry.create({
        name: src.name,
        businessType: src.businessType,
        description: src.description,
        galaNumber: src.galaNumber,
        buildingNumber: src.buildingNumber,
        occupancyType: src.occupancyType,
        products: src.products.map((p) => ({
          name: p.name,
          description: p.description,
          price: p.price,
          images: [img(600, 600)]
        })),
        materials: src.materials,
        keywords: src.keywords,
        gstInfo: src.gstInfo,
        contactNumber: src.contactNumber,
        owner: owner._id,
        images: [img(900, 600), img(900, 600), img(900, 600)],
        verified: src.verified,
        verifiedAt: src.verified ? new Date() : undefined
      });
      console.log(`  + industry ${src.name.en}`);
    }
    created.push(doc);
  }
  return created;
}

async function seedAlbums(adminId) {
  for (const src of content.albums) {
    const exists = await Album.findOne({ 'title.en': src.title.en });
    if (exists) continue;
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 300));
    await Album.create({
      title: src.title,
      description: src.description,
      eventDate,
      category: src.category,
      keywords: src.keywords,
      items: src.itemCaptions.map((caption) => ({
        url: img(1000, 750),
        type: 'image',
        caption
      })),
      createdBy: adminId
    });
    console.log(`  + album ${src.title.en}`);
  }
}

async function seedUpdates(adminId) {
  if (!content.updates || !content.updates.length) {
    console.log('  (skipped — updates not drafted yet)');
    return;
  }
  for (const src of content.updates) {
    const exists = await Update.findOne({ 'title.en': src.title.en });
    if (exists) continue;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 180));
    await Update.create({
      type: src.type,
      category: src.category,
      title: src.title,
      content: src.content,
      images: [img(900, 560)],
      keywords: src.keywords,
      status: 'published',
      createdBy: adminId,
      createdAt: createdDate
    });
    console.log(`  + update ${src.title.en}`);
  }
}

async function seedNotices(adminId) {
  for (const src of content.notices) {
    const exists = await Notice.findOne({ title: src.title });
    if (exists) continue;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30 + Math.floor(Math.random() * 45));
    await Notice.create({
      title: src.title,
      content: src.content,
      expiresAt,
      targetAudience: src.targetAudience,
      status: 'published',
      createdBy: adminId
    });
    console.log(`  + notice ${src.title}`);
  }
}

async function seedWorkshops(adminId, users) {
  for (const src of content.workshops) {
    const exists = await Workshop.findOne({ title: src.title });
    if (exists) continue;
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 60) - 15);
    const registered = users.filter(() => Math.random() < 0.3).map((u) => u._id);
    await Workshop.create({
      title: src.title,
      description: src.description,
      date,
      location: src.location,
      capacity: src.capacity,
      registeredUsers: registered,
      createdBy: adminId
    });
    console.log(`  + workshop ${src.title}`);
  }
}

async function seedVacancies(industries) {
  for (let i = 0; i < content.vacancies.length; i++) {
    const src = content.vacancies[i];
    const exists = await Vacancy.findOne({ title: src.title });
    if (exists) continue;
    const industry = industries[i % industries.length];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 20 + Math.floor(Math.random() * 40));
    await Vacancy.create({
      title: src.title,
      description: src.description,
      eligibility: src.eligibility,
      deadline,
      industry: industry._id,
      postedBy: industry.owner,
      status: 'open'
    });
    console.log(`  + vacancy ${src.title}`);
  }
}

async function seedEmergencyContacts() {
  for (const src of content.emergencyContacts) {
    const exists = await EmergencyContact.findOne({ 'name.en': src.name.en });
    if (exists) continue;
    await EmergencyContact.create(src);
    console.log(`  + emergency contact ${src.name.en}`);
  }
}

async function seedPolls(adminId, users) {
  for (const src of content.polls) {
    const exists = await Poll.findOne({ question: src.question });
    if (exists) continue;
    const votedUsers = users.filter(() => Math.random() < 0.4).map((u) => u._id);
    await Poll.create({
      question: src.question,
      description: src.description,
      options: src.options.map((text) => ({ text, votes: Math.floor(Math.random() * 40) })),
      votedUsers,
      expiresAt: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
      })(),
      createdBy: adminId
    });
    console.log(`  + poll ${src.question}`);
  }
}

async function seedDocuments(adminId) {
  for (const src of content.documents) {
    const exists = await Document.findOne({ title: src.title });
    if (exists) continue;
    await Document.create({
      title: src.title,
      description: src.description,
      category: src.category,
      fileUrl: DUMMY_PDF_URL,
      uploadedBy: adminId
    });
    console.log(`  + document ${src.title}`);
  }
}

async function fillSiteContentImages(industries) {
  const home = await SiteContent.findOne({ page: 'home' });
  if (home) {
    let changed = false;
    if (!home.data.heroImageUrl) {
      home.data.heroImageUrl = img(1600, 1000);
      home.data.heroImageAlt = { en: 'HDIL Industrial Park', hi: 'एचडीआईएल औद्योगिक पार्क', mr: 'एचडीआयएल औद्योगिक पार्क' };
      changed = true;
    }
    if (!home.data.introImageUrl) {
      home.data.introImageUrl = img(1200, 900);
      home.data.introImageAlt = { en: 'Federation office building', hi: 'फेडरेशन कार्यालय भवन', mr: 'फेडरेशन कार्यालय इमारत' };
      changed = true;
    }
    if (!home.data.industriesMarqueeItems || !home.data.industriesMarqueeItems.length) {
      const seen = new Set();
      const items = [];
      for (const ind of industries) {
        if (seen.has(ind.businessType.en)) continue;
        seen.add(ind.businessType.en);
        items.push(ind.businessType);
        if (items.length >= 12) break;
      }
      home.data.industriesMarqueeItems = items;
      changed = true;
    }
    if (changed) {
      home.markModified('data');
      await home.save();
      console.log('  + filled home hero/intro images + industries marquee');
    }
  }

  const about = await SiteContent.findOne({ page: 'about' });
  if (about && Array.isArray(about.data.leadership)) {
    let changed = false;
    about.data.leadership.forEach((leader) => {
      if (!leader.photoUrl) {
        leader.photoUrl = img(400, 400);
        changed = true;
      }
    });
    if (changed) {
      about.markModified('data');
      await about.save();
      console.log('  + filled about leadership photos');
    }
  }
}

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env — set it first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin account found — run scripts/seedAdmin.js first.');
    process.exit(1);
  }

  console.log('Seeding dummy member accounts...');
  const users = await seedDummyUsers();

  console.log('Seeding business directory...');
  const industries = await seedIndustries(users);

  console.log('Seeding gallery albums...');
  await seedAlbums(admin._id);

  console.log('Seeding news & updates...');
  await seedUpdates(admin._id);

  console.log('Seeding notices...');
  await seedNotices(admin._id);

  console.log('Seeding workshops...');
  await seedWorkshops(admin._id, users);

  console.log('Seeding vacancies...');
  await seedVacancies(industries);

  console.log('Seeding emergency contacts...');
  await seedEmergencyContacts();

  console.log('Seeding polls...');
  await seedPolls(admin._id, users);

  console.log('Seeding documents...');
  await seedDocuments(admin._id);

  console.log('Filling site content images...');
  await fillSiteContentImages(industries);

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

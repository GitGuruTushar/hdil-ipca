const express = require('express');
const router = express.Router();
const Industry = require('../models/Industry');
const Vacancy = require('../models/Vacancy');
const asyncHandler = require('../utils/asyncHandler');

const RESULT_LIMIT = 8;

// OR-matches a regex against every language of a localized { en, hi, mr } field.
const loc = (fieldPath, re) => [{ [`${fieldPath}.en`]: re }, { [`${fieldPath}.hi`]: re }, { [`${fieldPath}.mr`]: re }];

// Picks a display string from a localized field (English first — the search
// dropdown itself isn't language-switched yet, that lands with the public
// LanguageSwitcher in Milestone 4).
const pick = (field) => (field && typeof field === 'object' ? field.en || field.hi || field.mr || '' : field || '');

// @route   GET /api/search?q=
// @desc    Global live-search across public-safe content (businesses, news, vacancies,
//          gallery albums, emergency contacts). Matches from the first character typed,
//          across every relevant field (including keyword/material tags and, for
//          businesses, product names/descriptions) and every language a field has been
//          translated into. Never surfaces private/internal data (e.g. service-provider
//          ratings, draft content).
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ results: [] });
    }

    // Escape regex special characters so arbitrary user input can't throw or behave unexpectedly.
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const now = new Date();

    // Required inline so this route never depends on other routes' models being loaded first.
    const Update = require('../models/Update');
    const Album = require('../models/Album');
    const EmergencyContact = require('../models/EmergencyContact');

    const [businesses, news, vacancies, gallery, emergency] = await Promise.all([
      Industry.find({
        $or: [
          ...loc('name', re),
          ...loc('businessType', re),
          ...loc('description', re),
          { keywords: re },
          { materials: re },
          { galaNumber: Number.isFinite(Number(q)) ? Number(q) : -1 },
          { buildingNumber: Number.isFinite(Number(q)) ? Number(q) : -1 },
          ...loc('products.name', re),
          ...loc('products.description', re)
        ]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'business', id: doc.id, title: pick(doc.name), subtitle: pick(doc.businessType) }))),

      Update.find({
        $and: [
          { status: { $ne: 'draft' } },
          { $or: [{ status: { $ne: 'scheduled' } }, { publishAt: { $lte: now } }] },
          { $or: [...loc('title', re), ...loc('content', re), { category: re }, { keywords: re }] }
        ]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'news', id: doc.id, title: pick(doc.title), subtitle: doc.category }))),

      Vacancy.find({
        status: 'open',
        deadline: { $gte: now },
        $or: [{ title: re }, { description: re }, { eligibility: re }, { keywords: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'vacancy', id: doc.id, title: doc.title, subtitle: 'Vacancy' }))),

      Album.find({
        $or: [...loc('title', re), ...loc('description', re), { category: re }, { keywords: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'gallery', id: doc.id, title: pick(doc.title), subtitle: doc.category }))),

      EmergencyContact.find({
        $or: [...loc('name', re), ...loc('note', re), { category: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'emergency', id: doc.id, title: pick(doc.name), subtitle: doc.category })))
    ]);

    const results = [...businesses, ...news, ...vacancies, ...gallery, ...emergency];
    res.json({ results });
  })
);

module.exports = router;

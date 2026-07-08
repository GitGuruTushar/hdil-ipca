const express = require('express');
const router = express.Router();
const Industry = require('../models/Industry');
const Vacancy = require('../models/Vacancy');
const asyncHandler = require('../utils/asyncHandler');

const RESULT_LIMIT = 8;

// @route   GET /api/search?q=
// @desc    Global live-search across public-safe content (businesses, news, vacancies,
//          gallery albums, emergency contacts). Never surfaces private/internal data.
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
        $or: [{ name: re }, { businessType: re }, { description: re }, { keywords: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'business', id: doc.id, title: doc.name, subtitle: doc.businessType }))),

      Update.find({
        $and: [
          { status: { $ne: 'draft' } },
          { $or: [{ status: { $ne: 'scheduled' } }, { publishAt: { $lte: now } }] },
          { $or: [{ title: re }, { content: re }, { category: re }, { keywords: re }] }
        ]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'news', id: doc.id, title: doc.title, subtitle: doc.category }))),

      Vacancy.find({
        status: 'open',
        deadline: { $gte: now },
        $or: [{ title: re }, { description: re }, { eligibility: re }, { keywords: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'vacancy', id: doc.id, title: doc.title, subtitle: 'Vacancy' }))),

      Album.find({
        $or: [{ title: re }, { category: re }, { keywords: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'gallery', id: doc.id, title: doc.title, subtitle: doc.category }))),

      EmergencyContact.find({
        $or: [{ name: re }, { category: re }]
      })
        .limit(RESULT_LIMIT)
        .then((docs) => docs.map((doc) => ({ type: 'emergency', id: doc.id, title: doc.name, subtitle: doc.category })))
    ]);

    const results = [...businesses, ...news, ...vacancies, ...gallery, ...emergency];
    res.json({ results });
  })
);

module.exports = router;

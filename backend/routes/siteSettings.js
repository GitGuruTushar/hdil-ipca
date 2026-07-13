const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// @route   GET /api/site-settings
// @desc    Get the singleton site chrome document (nav/footer/contact/SEO/theme)
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = (await SiteSettings.findOne()) || (await SiteSettings.create({}));
    res.json(settings);
  })
);

// @route   PUT /api/site-settings
// @desc    Upsert the singleton site chrome document
// @access  Private (Admin or Moderator)
router.put(
  '/',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const existing = await SiteSettings.findOne();
    const settings = await SiteSettings.findOneAndUpdate(
      existing ? { _id: existing._id } : {},
      { ...req.body, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(settings);
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const SiteContent = require('../models/SiteContent');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const PAGES = ['home', 'about', 'contact'];

const pageParam = [check('page', 'Invalid page').isIn(PAGES)];

// @route   GET /api/site-content/:page
// @desc    Get the CMS content for a public page (home/about/contact)
// @access  Public
router.get(
  '/:page',
  pageParam,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const content = await SiteContent.findOne({ page: req.params.page });
    if (!content) throw new AppError(`Site content for "${req.params.page}" has not been seeded yet`, 404);
    res.json(content);
  })
);

// @route   PUT /api/site-content/:page
// @desc    Upsert the CMS content for a public page
// @access  Private (Admin or Moderator)
router.put(
  '/:page',
  protect,
  authorize('admin', 'moderator'),
  pageParam,
  asyncHandler(async (req, res) => {
    runValidation(req);

    const content = await SiteContent.findOneAndUpdate(
      { page: req.params.page },
      { data: req.body.data, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(content);
  })
);

module.exports = router;

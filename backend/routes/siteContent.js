const express = require('express');
const router = express.Router();
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const SiteContent = require('../models/SiteContent');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits, IMAGE_TYPES } = require('../config/upload');
const { SCHEMA_VERSION } = require('../utils/siteContentFields');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const PAGES = ['home', 'about', 'contact', 'gallery', 'updates', 'helpline'];

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
      { data: req.body.data, schemaVersion: SCHEMA_VERSION, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(content);
  })
);

// @route   POST /api/site-content/upload-image
// @desc    Upload a single content image (e.g. a leadership photo or hero image),
//          returning its Cloudinary URL for the caller to place into a SiteContent
//          field before saving. Kept separate from PUT so that route can stay a
//          clean JSON body — every other Site Content field is plain text.
// @access  Private (Admin or Moderator)
router.post(
  '/upload-image',
  protect,
  authorize('admin', 'moderator'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No image file provided', 400);
    if (!IMAGE_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new AppError('Only jpg, png or webp images are allowed', 400);
    }
    enforceSizeLimits(req.file);

    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'site-content',
        resource_type: 'image'
      });
      res.json({ url: result.secure_url });
    } finally {
      fs.unlinkSync(req.file.path);
    }
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const Update = require('../models/Update');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits, IMAGE_TYPES } = require('../config/upload');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const uploadMediaToCloudinary = async (files) => {
  enforceSizeLimits(files);
  const results = await Promise.all(
    files.map((file) =>
      cloudinary.uploader.upload(file.path, {
        folder: 'updates',
        resource_type: IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'video'
      })
    )
  );
  files.forEach((file) => fs.unlinkSync(file.path));

  const images = [];
  let videoUrl;
  results.forEach((result, i) => {
    if (IMAGE_TYPES.includes(files[i].mimetype)) images.push(result.secure_url);
    else videoUrl = result.secure_url;
  });
  return { images, videoUrl };
};

// @route   GET /api/updates
// @desc    Get all updates (optional ?type= & ?category= filters)
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;

    const updates = await Update.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'username fullName');
    res.json(updates);
  })
);

const contentFields = [
  check('type', 'Type is required').isIn(['news', 'announcement', 'blogs']),
  check('category', 'Category must be maintenance, events, achievements, or general').optional().isIn(['maintenance', 'events', 'achievements', 'general']),
  check('title', 'Title is required').not().isEmpty(),
  check('content', 'Content is required').not().isEmpty(),
  check('redirectUrl')
    .optional()
    .custom((value, { req }) => {
      if (req.body.type === 'blogs' && !value) {
        throw new Error('Redirect URL is required for blog posts');
      }
      return true;
    })
];

// @route   POST /api/updates
// @desc    Create a new update (up to 5 images and/or 1 video)
// @access  Private (Admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]),
  contentFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { type, category, title, content, redirectUrl } = req.body;

    const files = [...(req.files?.images || []), ...(req.files?.video || [])];
    const { images, videoUrl } = files.length ? await uploadMediaToCloudinary(files) : { images: [], videoUrl: undefined };

    const update = await Update.create({
      type,
      category,
      title,
      content,
      images,
      videoUrl,
      redirectUrl: type === 'blogs' ? redirectUrl : undefined,
      createdBy: req.user.id
    });

    res.status(201).json(update);
  })
);

// @route   PUT /api/updates/:id
// @desc    Update an update (optionally replacing media)
// @access  Private (Admin only)
router.put(
  '/:id',
  protect,
  authorize('admin'),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]),
  contentFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const update = await Update.findById(req.params.id);
    if (!update) throw new AppError('Update not found', 404);

    const { type, category, title, content, redirectUrl } = req.body;
    update.type = type;
    if (category) update.category = category;
    update.title = title;
    update.content = content;
    update.redirectUrl = type === 'blogs' ? redirectUrl : undefined;

    const files = [...(req.files?.images || []), ...(req.files?.video || [])];
    if (files.length) {
      const { images, videoUrl } = await uploadMediaToCloudinary(files);
      if (images.length) update.images = images;
      if (videoUrl) update.videoUrl = videoUrl;
    }

    await update.save();
    res.json(update);
  })
);

// @route   DELETE /api/updates/:id
// @access  Private (Admin only)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const update = await Update.findById(req.params.id);
    if (!update) throw new AppError('Update not found', 404);
    await update.deleteOne();
    res.json({ msg: 'Update removed' });
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const Update = require('../models/Update');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const sanitizeRichText = require('../utils/sanitizeRichText');
const logAudit = require('../utils/auditLog');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits, IMAGE_TYPES } = require('../config/upload');
const broadcastPush = require('../utils/broadcastPush');
const { parseLocalizedField } = require('../utils/localizedField');
const normalizeExternalUrl = require('../utils/normalizeUrl');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// Rich-text content needs a short plain-text preview for the push notification payload.
const excerptFromHtml = (html, maxLength = 140) => {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

// Public announcements have no single recipient, so a freshly-published Update is
// broadcast to every push subscriber (members and anonymous PWA installs alike)
// instead of going through utils/notify.js. Fire-and-forget: never let a push
// failure block or fail the request that published the content.
const broadcastPublishedUpdate = (update) => {
  broadcastPush({
    title: update.title.en,
    body: excerptFromHtml(update.content.en),
    link: '/'
  }).catch((err) => console.error('broadcastPush for update failed:', err));
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
    // Public visitors never see drafts, and scheduled items only once publishAt has passed.
    filter.$and = [
      { status: { $ne: 'draft' } },
      { $or: [{ status: { $ne: 'scheduled' } }, { publishAt: { $lte: new Date() } }] }
    ];

    const updates = await Update.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'username fullName profilePicture');
    res.json(updates);
  })
);

// @route   GET /api/updates/admin
// @desc    Get every update regardless of status/publishAt (drafts & scheduled included)
// @access  Private (Admin/Moderator only)
router.get(
  '/admin',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const updates = await Update.find().sort({ createdAt: -1 }).populate('createdBy', 'username fullName profilePicture');
    res.json(updates);
  })
);

const contentFields = [
  check('type', 'Type is required').isIn(['news', 'announcement', 'blogs']),
  check('category', 'Category must be maintenance, events, achievements, or general').optional().isIn(['maintenance', 'events', 'achievements', 'general']),
  check('title').custom((value) => {
    if (!parseLocalizedField(value).en.trim()) throw new Error('Title (English) is required');
    return true;
  }),
  check('content').custom((value) => {
    if (!parseLocalizedField(value).en.trim()) throw new Error('Content (English) is required');
    return true;
  }),
  check('status', 'Status must be draft, scheduled, or published').optional().isIn(['draft', 'scheduled', 'published']),
  check('publishAt', 'publishAt must be a valid date').optional().isISO8601(),
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
// @access  Private (Admin/Moderator only)
router.post(
  '/',
  protect,
  authorize('admin', 'moderator'),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]),
  contentFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { type, category, redirectUrl, status, publishAt } = req.body;
    const title = parseLocalizedField(req.body.title);
    const parsedContent = parseLocalizedField(req.body.content);

    const files = [...(req.files?.images || []), ...(req.files?.video || [])];
    const { images, videoUrl } = files.length ? await uploadMediaToCloudinary(files) : { images: [], videoUrl: undefined };

    const update = await Update.create({
      type,
      category,
      title,
      content: {
        en: sanitizeRichText(parsedContent.en),
        hi: sanitizeRichText(parsedContent.hi),
        mr: sanitizeRichText(parsedContent.mr)
      },
      images,
      videoUrl,
      redirectUrl: type === 'blogs' ? normalizeExternalUrl(redirectUrl) : undefined,
      status,
      publishAt,
      createdBy: req.user.id
    });

    if (update.status === 'published') {
      broadcastPublishedUpdate(update);
    }

    res.status(201).json(update);
  })
);

// @route   PUT /api/updates/:id
// @desc    Update an update (optionally replacing media)
// @access  Private (Admin/Moderator only)
router.put(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]),
  contentFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const update = await Update.findById(req.params.id);
    if (!update) throw new AppError('Update not found', 404);
    const wasPublished = update.status === 'published';

    const { type, category, redirectUrl, status, publishAt } = req.body;
    const parsedContent = parseLocalizedField(req.body.content);
    update.type = type;
    if (category) update.category = category;
    update.title = parseLocalizedField(req.body.title);
    update.content = {
      en: sanitizeRichText(parsedContent.en),
      hi: sanitizeRichText(parsedContent.hi),
      mr: sanitizeRichText(parsedContent.mr)
    };
    update.redirectUrl = type === 'blogs' ? normalizeExternalUrl(redirectUrl) : undefined;
    if (status !== undefined) update.status = status;
    if (publishAt !== undefined) update.publishAt = publishAt;

    const files = [...(req.files?.images || []), ...(req.files?.video || [])];
    if (files.length) {
      const { images, videoUrl } = await uploadMediaToCloudinary(files);
      if (images.length) update.images = images;
      if (videoUrl) update.videoUrl = videoUrl;
    }

    await update.save();

    if (update.status === 'published' && !wasPublished) {
      broadcastPublishedUpdate(update);
    }

    res.json(update);
  })
);

// @route   DELETE /api/updates/:id
// @access  Private (Admin/Moderator only)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const update = await Update.findById(req.params.id);
    if (!update) throw new AppError('Update not found', 404);
    await update.deleteOne();
    logAudit(req.user.id, 'deleted_update', 'Update', update.id, { title: update.title.en });
    res.json({ msg: 'Update removed' });
  })
);

module.exports = router;

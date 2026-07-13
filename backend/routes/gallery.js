const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const Album = require('../models/Album');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits, IMAGE_TYPES } = require('../config/upload');
const { parseLocalizedField } = require('../utils/localizedField');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const uploadMediaToCloudinary = async (files) => {
  enforceSizeLimits(files);
  try {
    const results = await Promise.all(
      files.map((file) =>
        cloudinary.uploader.upload(file.path, {
          folder: 'gallery',
          resource_type: IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'video'
        })
      )
    );

    return results.map((result, i) => ({
      url: result.secure_url,
      type: IMAGE_TYPES.includes(files[i].mimetype) ? 'image' : 'video'
    }));
  } finally {
    files.forEach((file) => fs.unlinkSync(file.path));
  }
};

const parseKeywords = (raw) => {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new AppError('keywords must be a valid JSON array', 400);
    }
    if (!Array.isArray(parsed)) {
      throw new AppError('keywords must be a valid JSON array', 400);
    }
    return parsed;
  }
  throw new AppError('keywords must be a valid JSON array', 400);
};

// @route   GET /api/gallery
// @desc    Get all albums, newest event first
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const total = await Album.countDocuments();
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const albums = await Album.find()
      .sort({ eventDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ albums, page, totalPages, total });
  })
);

// @route   GET /api/gallery/:id
// @desc    Get a single album
// @access  Public
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);
    if (!album) throw new AppError('Album not found', 404);
    res.json(album);
  })
);

const albumFields = [
  check('title').custom((value) => {
    if (!parseLocalizedField(value).en.trim()) throw new Error('Title (English) is required');
    return true;
  }),
  check('eventDate', 'A valid event date is required').isISO8601(),
  check('category', 'Category can not be more than 50 characters').optional().isLength({ max: 50 })
];

const MAX_ALBUM_ITEMS = 200;

// Same index-keyed JSON shape PUT already accepts (e.g. {"0": {"en": "..."}}) —
// applied to the freshly-uploaded items array before Album.create(), so
// captions can be set at creation time instead of only one-at-a-time after.
const parseCaptions = (raw) => {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new AppError('captions must be a valid JSON object mapping item index to caption', 400);
  }
};

// @route   POST /api/gallery
// @desc    Create a new album (up to 20 photos/videos), optionally with
//          per-item captions keyed by upload order
// @access  Private (Admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.array('media', 20),
  albumFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { eventDate, category, keywords } = req.body;
    const title = parseLocalizedField(req.body.title);
    const description = parseLocalizedField(req.body.description);
    const parsedKeywords = parseKeywords(keywords);

    const items = req.files && req.files.length ? await uploadMediaToCloudinary(req.files) : [];

    const captionMap = parseCaptions(req.body.captions);
    if (captionMap) {
      Object.keys(captionMap).forEach((key) => {
        const index = Number(key);
        if (Number.isInteger(index) && items[index]) {
          items[index].caption = parseLocalizedField(captionMap[key]);
        }
      });
    }

    const album = await Album.create({
      title,
      description,
      eventDate,
      category,
      keywords: parsedKeywords,
      items,
      createdBy: req.user.id
    });

    res.status(201).json(album);
  })
);

// @route   PUT /api/gallery/:id
// @desc    Update an album's title/description/eventDate/category, edit item captions, and/or append more media
// @access  Private (Admin only)
router.put(
  '/:id',
  protect,
  authorize('admin'),
  upload.array('media', 20),
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);
    if (!album) throw new AppError('Album not found', 404);

    const { eventDate, category, captions, keywords } = req.body;
    if (req.body.title !== undefined) album.title = parseLocalizedField(req.body.title);
    if (req.body.description !== undefined) album.description = parseLocalizedField(req.body.description);
    if (eventDate !== undefined) album.eventDate = eventDate;
    if (category !== undefined) album.category = category;
    if (keywords !== undefined) album.keywords = parseKeywords(keywords);

    // Files are appended BEFORE captions are applied — captions for newly-added
    // items are keyed relative to the post-append array (existing.length + i,
    // the same convention the frontend's "add photos" flow uses), so those
    // indices don't exist yet if captions were applied first.
    if (req.files && req.files.length) {
      if (album.items.length + req.files.length > MAX_ALBUM_ITEMS) {
        throw new AppError(`An album can have at most ${MAX_ALBUM_ITEMS} items (currently ${album.items.length}).`, 400);
      }
      const newItems = await uploadMediaToCloudinary(req.files);
      album.items.push(...newItems);
    }

    if (captions !== undefined) {
      const captionMap = parseCaptions(captions);
      Object.keys(captionMap).forEach((key) => {
        const index = Number(key);
        if (Number.isInteger(index) && album.items[index]) {
          album.items[index].caption = parseLocalizedField(captionMap[key]);
        }
      });
    }

    await album.save();
    res.json(album);
  })
);

// @route   DELETE /api/gallery/:id
// @access  Private (Admin only)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);
    if (!album) throw new AppError('Album not found', 404);
    await album.deleteOne();
    res.json({ msg: 'Album removed' });
  })
);

// @route   DELETE /api/gallery/:id/items/:itemId
// @desc    Remove a single photo/video from an album
// @access  Private (Admin only)
router.delete(
  '/:id/items/:itemId',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const album = await Album.findByIdAndUpdate(
      req.params.id,
      { $pull: { items: { _id: req.params.itemId } } },
      { new: true }
    );
    if (!album) throw new AppError('Album not found', 404);

    res.json(album);
  })
);

module.exports = router;

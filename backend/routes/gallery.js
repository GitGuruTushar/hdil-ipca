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
        folder: 'gallery',
        resource_type: IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'video'
      })
    )
  );
  files.forEach((file) => fs.unlinkSync(file.path));

  return results.map((result, i) => ({
    url: result.secure_url,
    type: IMAGE_TYPES.includes(files[i].mimetype) ? 'image' : 'video'
  }));
};

// @route   GET /api/gallery
// @desc    Get all albums, newest event first
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const albums = await Album.find().sort({ eventDate: -1 });
    res.json(albums);
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
  check('title', 'Title is required').not().isEmpty(),
  check('eventDate', 'A valid event date is required').isISO8601(),
  check('category', 'Category can not be more than 50 characters').optional().isLength({ max: 50 })
];

// @route   POST /api/gallery
// @desc    Create a new album (up to 20 photos/videos)
// @access  Private (Admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.array('media', 20),
  albumFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { title, eventDate, category } = req.body;

    const items = req.files && req.files.length ? await uploadMediaToCloudinary(req.files) : [];

    const album = await Album.create({
      title,
      eventDate,
      category,
      items,
      createdBy: req.user.id
    });

    res.status(201).json(album);
  })
);

// @route   PUT /api/gallery/:id
// @desc    Update an album's title/eventDate/category, edit item captions, and/or append more media
// @access  Private (Admin only)
router.put(
  '/:id',
  protect,
  authorize('admin'),
  upload.array('media', 20),
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);
    if (!album) throw new AppError('Album not found', 404);

    const { title, eventDate, category, captions } = req.body;
    if (title !== undefined) album.title = title;
    if (eventDate !== undefined) album.eventDate = eventDate;
    if (category !== undefined) album.category = category;

    if (captions !== undefined) {
      let captionMap = captions;
      if (typeof captionMap === 'string') {
        try {
          captionMap = JSON.parse(captionMap);
        } catch (err) {
          throw new AppError('captions must be a valid JSON object mapping item index to caption', 400);
        }
      }
      Object.keys(captionMap).forEach((key) => {
        const index = Number(key);
        if (Number.isInteger(index) && album.items[index]) {
          album.items[index].caption = captionMap[key];
        }
      });
    }

    if (req.files && req.files.length) {
      const newItems = await uploadMediaToCloudinary(req.files);
      album.items.push(...newItems);
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

// @route   DELETE /api/gallery/:id/items/:itemIndex
// @desc    Remove a single photo/video from an album
// @access  Private (Admin only)
router.delete(
  '/:id/items/:itemIndex',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);
    if (!album) throw new AppError('Album not found', 404);

    const index = Number(req.params.itemIndex);
    if (!Number.isInteger(index) || !album.items[index]) {
      throw new AppError('Item not found', 404);
    }

    album.items.splice(index, 1);
    await album.save();
    res.json(album);
  })
);

module.exports = router;

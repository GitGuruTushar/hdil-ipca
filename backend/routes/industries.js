const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const Industry = require('../models/Industry');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits } = require('../config/upload');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const parseJsonField = (raw, fieldName) => {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new AppError(`${fieldName} is not valid JSON`, 400);
  }
};

const uploadImagesToCloudinary = async (files) => {
  enforceSizeLimits(files);
  const uploadResults = await Promise.all(
    files.map((file) => cloudinary.uploader.upload(file.path, { folder: 'industries', resource_type: 'image' }))
  );
  files.forEach((file) => fs.unlinkSync(file.path));
  return uploadResults.map((result) => result.secure_url);
};

// @route   GET /api/industries
// @desc    Get all business listings
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const industries = await Industry.find().populate('owner', 'username fullName');
    res.json(industries);
  })
);

// @route   GET /api/industries/:id
// @access  Public
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const industry = await Industry.findById(req.params.id).populate('owner', 'username fullName');
    if (!industry) throw new AppError('Business listing not found', 404);
    res.json(industry);
  })
);

// @route   GET /api/industries/owner/:ownerId
// @access  Public
router.get(
  '/owner/:ownerId',
  asyncHandler(async (req, res) => {
    const industries = await Industry.find({ owner: req.params.ownerId }).populate('owner', 'username fullName');
    res.json(industries);
  })
);

// @route   POST /api/industries
// @desc    Create a business listing (self-service by any logged-in member, or admin)
// @access  Private
router.post(
  '/',
  protect,
  upload.array('images', 5),
  [
    check('name', 'Business name is required').not().isEmpty(),
    check('businessType', 'Business type is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('galaNumber', 'Gala number is required').isNumeric(),
    check('buildingNumber', 'Building number is required').isNumeric(),
    check('occupancyType', 'Occupancy type must be owner or tenant').isIn(['owner', 'tenant']),
    check('gstInfo', 'GST information is required').not().isEmpty(),
    check('contactNumber', 'Contact number is required').not().isEmpty()
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const {
      name, businessType, description, galaNumber, buildingNumber, occupancyType,
      products, materials, gstInfo, contactNumber
    } = req.body;

    const images = req.files && req.files.length ? await uploadImagesToCloudinary(req.files) : [];

    const industry = await Industry.create({
      name,
      businessType,
      description,
      galaNumber,
      buildingNumber,
      occupancyType,
      products: parseJsonField(products, 'products') || [],
      materials: parseJsonField(materials, 'materials') || [],
      gstInfo,
      contactNumber,
      owner: req.user.id,
      images
    });

    res.status(201).json(industry);
  })
);

// @route   PUT /api/industries/:id
// @desc    Update own business listing (or admin)
// @access  Private (owner or admin)
router.put(
  '/:id',
  protect,
  upload.array('images', 5),
  asyncHandler(async (req, res) => {
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);

    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to edit this listing', 403);
    }

    const allowedFields = [
      'name', 'businessType', 'description', 'galaNumber', 'buildingNumber',
      'occupancyType', 'gstInfo', 'contactNumber'
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) industry[field] = req.body[field];
    }

    if (req.body.products !== undefined) {
      industry.products = parseJsonField(req.body.products, 'products');
    }
    if (req.body.materials !== undefined) {
      industry.materials = parseJsonField(req.body.materials, 'materials');
    }
    if (req.files && req.files.length) {
      industry.images = await uploadImagesToCloudinary(req.files);
    }

    await industry.save();
    res.json(industry);
  })
);

// @route   DELETE /api/industries/:id
// @access  Private (owner or admin)
router.delete(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);

    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to delete this listing', 403);
    }

    await industry.deleteOne();
    res.json({ msg: 'Business listing removed' });
  })
);

module.exports = router;

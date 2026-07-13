const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const Industry = require('../models/Industry');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');
const logAudit = require('../utils/auditLog');
const { upload, enforceSizeLimits } = require('../config/upload');
const { parseLocalizedField } = require('../utils/localizedField');
const normalizeExternalUrl = require('../utils/normalizeUrl');

const normalizeSocialLinks = (links) => {
  if (!links) return links;
  const normalized = {};
  ['website', 'facebook', 'instagram', 'whatsapp'].forEach((key) => {
    if (links[key]) normalized[key] = normalizeExternalUrl(links[key]);
  });
  return normalized;
};

// OR-matches a regex against a localized field in any of the three languages.
const localizedMatch = (fieldPath, re) => ({
  $or: [{ [`${fieldPath}.en`]: re }, { [`${fieldPath}.hi`]: re }, { [`${fieldPath}.mr`]: re }]
});

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

const MAX_BUSINESS_IMAGES = 20;
const MAX_PRODUCT_IMAGES = 8;

const uploadImagesToCloudinary = async (files, folder = 'industries') => {
  enforceSizeLimits(files);
  const uploadResults = await Promise.all(
    files.map((file) => cloudinary.uploader.upload(file.path, { folder, resource_type: 'image' }))
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
    const { buildingNumber, businessType, q } = req.query;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filters = [];
    if (buildingNumber !== undefined && buildingNumber !== '') {
      filters.push({ buildingNumber: Number(buildingNumber) });
    }
    if (businessType !== undefined && businessType !== '') {
      filters.push(localizedMatch('businessType', new RegExp(esc(businessType), 'i')));
    }
    if (q !== undefined && q !== '') {
      const re = new RegExp(esc(q), 'i');
      filters.push({
        $or: [
          ...localizedMatch('name', re).$or,
          ...localizedMatch('description', re).$or,
          ...localizedMatch('businessType', re).$or,
          { keywords: re },
          { materials: re },
          { 'products.name.en': re },
          { 'products.name.hi': re },
          { 'products.name.mr': re },
          { 'products.description.en': re },
          { 'products.description.hi': re },
          { 'products.description.mr': re }
        ]
      });
    }

    const filter = filters.length ? { $and: filters } : {};

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const [industries, total] = await Promise.all([
      Industry.find(filter)
        .populate('owner', 'username fullName profilePicture')
        .skip(skip)
        .limit(limit),
      Industry.countDocuments(filter)
    ]);

    res.json({
      industries,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      total
    });
  })
);

// @route   GET /api/industries/:id
// @access  Public
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const industry = await Industry.findById(req.params.id).populate('owner', 'username fullName profilePicture');
    if (!industry) throw new AppError('Business listing not found', 404);
    res.json(industry);
  })
);

// @route   GET /api/industries/owner/:ownerId
// @access  Public
router.get(
  '/owner/:ownerId',
  asyncHandler(async (req, res) => {
    const industries = await Industry.find({ owner: req.params.ownerId }).populate('owner', 'username fullName profilePicture');
    res.json(industries);
  })
);

// @route   POST /api/industries
// @desc    Create a business listing (self-service by any logged-in member, or admin)
// @access  Private
router.post(
  '/',
  protect,
  upload.array('images', MAX_BUSINESS_IMAGES),
  [
    check('name').custom((v) => {
      if (!parseLocalizedField(v).en.trim()) throw new Error('Business name (English) is required');
      return true;
    }),
    check('businessType').custom((v) => {
      if (!parseLocalizedField(v).en.trim()) throw new Error('Business type (English) is required');
      return true;
    }),
    check('description').custom((v) => {
      if (!parseLocalizedField(v).en.trim()) throw new Error('Description (English) is required');
      return true;
    }),
    check('galaNumber', 'Gala number is required').isNumeric(),
    check('buildingNumber', 'Building number is required').isNumeric(),
    check('occupancyType', 'Occupancy type must be owner or tenant').isIn(['owner', 'tenant']),
    check('gstInfo', 'GST information is required').not().isEmpty(),
    check('contactNumber', 'Contact number is required').not().isEmpty(),
    check('foundedYear', 'Founded year must be a valid year').optional({ checkFalsy: true }).isInt({ min: 1800, max: new Date().getFullYear() })
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { galaNumber, buildingNumber, occupancyType, products, materials, keywords, gstInfo, contactNumber } = req.body;

    const images = req.files && req.files.length ? await uploadImagesToCloudinary(req.files) : [];
    const parsedProducts = (parseJsonField(products, 'products') || []).map((p) => ({
      ...p,
      name: parseLocalizedField(p.name),
      description: parseLocalizedField(p.description)
    }));

    const industry = await Industry.create({
      name: parseLocalizedField(req.body.name),
      businessType: parseLocalizedField(req.body.businessType),
      description: parseLocalizedField(req.body.description),
      aboutUs: req.body.aboutUs !== undefined ? parseLocalizedField(req.body.aboutUs) : undefined,
      foundedYear: req.body.foundedYear !== undefined && req.body.foundedYear !== '' ? req.body.foundedYear : undefined,
      galaNumber,
      buildingNumber,
      occupancyType,
      products: parsedProducts,
      materials: parseJsonField(materials, 'materials') || [],
      keywords: parseJsonField(keywords, 'keywords') || [],
      gstInfo,
      contactNumber,
      businessHours: parseJsonField(req.body.businessHours, 'businessHours'),
      socialLinks: normalizeSocialLinks(parseJsonField(req.body.socialLinks, 'socialLinks')),
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
  upload.array('images', MAX_BUSINESS_IMAGES),
  [
    check('name', 'Business name is required').optional().not().isEmpty(),
    check('businessType', 'Business type is required').optional().not().isEmpty(),
    check('description', 'Description is required').optional().not().isEmpty(),
    check('galaNumber', 'Gala number is required').optional().isNumeric(),
    check('buildingNumber', 'Building number is required').optional().isNumeric(),
    check('occupancyType', 'Occupancy type must be owner or tenant').optional().isIn(['owner', 'tenant']),
    check('gstInfo', 'GST information is required').optional().not().isEmpty(),
    check('contactNumber', 'Contact number is required').optional().not().isEmpty(),
    check('foundedYear', 'Founded year must be a valid year').optional({ checkFalsy: true }).isInt({ min: 1800, max: new Date().getFullYear() })
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);

    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to edit this listing', 403);
    }

    const localizedFields = ['name', 'businessType', 'description', 'aboutUs'];
    for (const field of localizedFields) {
      if (req.body[field] !== undefined) industry[field] = parseLocalizedField(req.body[field]);
    }
    const plainFields = ['galaNumber', 'buildingNumber', 'occupancyType', 'gstInfo', 'contactNumber'];
    for (const field of plainFields) {
      if (req.body[field] !== undefined) industry[field] = req.body[field];
    }
    if (req.body.foundedYear !== undefined) {
      industry.foundedYear = req.body.foundedYear === '' ? undefined : req.body.foundedYear;
    }
    if (req.body.businessHours !== undefined) {
      industry.businessHours = parseJsonField(req.body.businessHours, 'businessHours');
    }
    if (req.body.socialLinks !== undefined) {
      industry.socialLinks = normalizeSocialLinks(parseJsonField(req.body.socialLinks, 'socialLinks'));
    }

    // Merge-by-_id rather than a full replace: a naive rebuild from
    // client-submitted fields only would silently wipe product.images on any
    // text-only edit, since the client's local row state for an untouched
    // product doesn't necessarily carry its existing photos back with it.
    // Photos are managed separately via the dedicated product-image routes below.
    if (req.body.products !== undefined) {
      const parsedProducts = parseJsonField(req.body.products, 'products') || [];
      const existingById = new Map(industry.products.map((p) => [p._id.toString(), p]));
      industry.products = parsedProducts.map((p) => {
        const existing = p._id && existingById.get(String(p._id));
        return {
          _id: existing ? existing._id : undefined,
          name: parseLocalizedField(p.name),
          description: parseLocalizedField(p.description),
          price: p.price,
          images: existing ? existing.images : []
        };
      });
    }
    if (req.body.materials !== undefined) {
      industry.materials = parseJsonField(req.body.materials, 'materials');
    }
    if (req.body.keywords !== undefined) {
      industry.keywords = parseJsonField(req.body.keywords, 'keywords');
    }
    if (req.files && req.files.length) {
      const newUrls = await uploadImagesToCloudinary(req.files, 'industries');
      if (industry.images.length + newUrls.length > MAX_BUSINESS_IMAGES) {
        throw new AppError(`A business can have at most ${MAX_BUSINESS_IMAGES} images (currently ${industry.images.length}).`, 400);
      }
      industry.images = [...industry.images, ...newUrls];
    }

    await industry.save();
    res.json(industry);
  })
);

// @route   DELETE /api/industries/:id/images
// @desc    Remove a single image from the business gallery (owner or admin)
// @access  Private
router.delete(
  '/:id/images',
  protect,
  [check('url', 'Image url is required').not().isEmpty()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);
    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to edit this listing', 403);
    }
    industry.images = industry.images.filter((u) => u !== req.body.url);
    await industry.save();
    res.json(industry);
  })
);

// @route   PUT /api/industries/:id/images/reorder
// @desc    Reorder the business gallery (owner or admin)
// @access  Private
router.put(
  '/:id/images/reorder',
  protect,
  [check('images', 'images must be an array').isArray()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);
    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to edit this listing', 403);
    }

    const current = new Set(industry.images);
    const next = req.body.images;
    const isSamePermutation = next.length === industry.images.length && next.every((u) => current.has(u));
    if (!isSamePermutation) {
      throw new AppError('images must be a reordering of the existing image set', 400);
    }

    industry.images = next;
    await industry.save();
    res.json(industry);
  })
);

// @route   POST /api/industries/:id/products/:productId/images
// @desc    Add photo(s) to a specific product (owner or admin)
// @access  Private
router.post(
  '/:id/products/:productId/images',
  protect,
  upload.array('images', MAX_PRODUCT_IMAGES),
  asyncHandler(async (req, res) => {
    const industry = await Industry.findById(req.params.id);
    if (!industry) {
      if (req.files?.length) req.files.forEach((f) => fs.unlinkSync(f.path));
      throw new AppError('Business listing not found', 404);
    }
    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      if (req.files?.length) req.files.forEach((f) => fs.unlinkSync(f.path));
      throw new AppError('Not authorized to edit this listing', 403);
    }
    const product = industry.products.id(req.params.productId);
    if (!product) {
      if (req.files?.length) req.files.forEach((f) => fs.unlinkSync(f.path));
      throw new AppError('Product not found', 404);
    }
    if (!req.files || !req.files.length) throw new AppError('At least one image is required', 400);

    const newUrls = await uploadImagesToCloudinary(req.files, 'industries/products');
    if (product.images.length + newUrls.length > MAX_PRODUCT_IMAGES) {
      throw new AppError(`A product can have at most ${MAX_PRODUCT_IMAGES} images (currently ${product.images.length}).`, 400);
    }
    product.images = [...product.images, ...newUrls];
    await industry.save();
    res.json(industry);
  })
);

// @route   DELETE /api/industries/:id/products/:productId/images
// @desc    Remove a single photo from a specific product (owner or admin)
// @access  Private
router.delete(
  '/:id/products/:productId/images',
  protect,
  [check('url', 'Image url is required').not().isEmpty()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);
    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to edit this listing', 403);
    }
    const product = industry.products.id(req.params.productId);
    if (!product) throw new AppError('Product not found', 404);

    product.images = product.images.filter((u) => u !== req.body.url);
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
    logAudit(req.user.id, 'deleted_industry', 'Industry', industry.id, { name: industry.name.en });
    res.json({ msg: 'Business listing removed' });
  })
);

// @route   PUT /api/industries/:id/verify
// @desc    Toggle the verified-business badge on a listing
// @access  Private (Admin/Moderator only)
router.put(
  '/:id/verify',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const industry = await Industry.findById(req.params.id);
    if (!industry) throw new AppError('Business listing not found', 404);

    industry.verified = !industry.verified;
    if (industry.verified) {
      industry.verifiedAt = new Date();
      industry.verifiedBy = req.user.id;
    } else {
      industry.verifiedAt = undefined;
      industry.verifiedBy = undefined;
    }

    await industry.save();
    logAudit(req.user.id, industry.verified ? 'verified_industry' : 'unverified_industry', 'Industry', industry.id, { name: industry.name.en });
    res.json(industry);
  })
);

module.exports = router;

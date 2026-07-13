const express = require('express');
const router = express.Router();
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const Document = require('../models/Document');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');
const { documentUpload } = require('../config/documentUpload');

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

// Same targeting mechanism as Notices — a notice's targetAudience matches a
// member if it's open to everyone, or scoped to owners/tenants and the
// member's own signup occupancy type matches.
const audienceMatches = (doc, occupancyType) => {
  if (doc.targetAudience === 'everyone') return true;
  if (doc.targetAudience === 'owners') return occupancyType === 'owner';
  if (doc.targetAudience === 'tenants') return occupancyType === 'tenant';
  return false;
};

// @route   GET /api/documents
// @desc    List documents (optional ?category= filter), paginated. Admins/moderators
//          see everything unfiltered; members see only documents matching their own
//          signup profile (building/gala/occupancy) or that hand-pick them by name.
// @access  Private (any logged-in member)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const isPrivileged = req.user.role === 'admin' || req.user.role === 'moderator';

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    if (isPrivileged) {
      const [documents, total] = await Promise.all([
        Document.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('uploadedBy', 'username fullName profilePicture')
          .populate('targetUsers', 'username fullName profilePicture'),
        Document.countDocuments(filter)
      ]);
      return res.json({ documents, page, totalPages: Math.ceil(total / limit) || 1, total });
    }

    const { buildingNumber, galaNumber, occupancyType } = req.user;
    const all = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName profilePicture');

    const visible = all.filter((doc) => {
      if (doc.targetUsers.some((id) => id.toString() === req.user.id)) return true;
      if (!audienceMatches(doc, occupancyType)) return false;
      if (doc.targetBuildings.length > 0 && !doc.targetBuildings.includes(buildingNumber)) return false;
      if (doc.targetGalas.length > 0 && !doc.targetGalas.includes(galaNumber)) return false;
      return true;
    });

    const total = visible.length;
    const start = (page - 1) * limit;
    const documents = visible.slice(start, start + limit);

    res.json({ documents, page, totalPages: Math.ceil(total / limit) || 1, total });
  })
);

const documentFields = [
  check('title', 'Title is required').not().isEmpty(),
  check('category', 'Invalid category').optional().isIn(['bylaws', 'minutes', 'circulars', 'other']),
  check('otherCategoryLabel', 'A label is required when category is Other').if((value, { req }) => req.body.category === 'other').not().isEmpty()
];

// @route   POST /api/documents
// @desc    Upload a document (title, description, category + a single 'file')
// @access  Private (Admin or Moderator)
router.post(
  '/',
  protect,
  authorize('admin', 'moderator'),
  documentUpload.single('file'),
  documentFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    if (!req.file) throw new AppError('A file is required', 400);

    const { title, description, category, otherCategoryLabel } = req.body;

    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'documents',
        resource_type: 'raw'
      });
    } finally {
      // Always clean up the local temp file, even if the Cloudinary upload throws —
      // otherwise a failed upload leaks the temp file forever.
      fs.unlinkSync(req.file.path);
    }

    const document = await Document.create({
      title,
      description,
      category,
      otherCategoryLabel: category === 'other' ? otherCategoryLabel : undefined,
      fileUrl: result.secure_url,
      uploadedBy: req.user.id,
      targetAudience: req.body.targetAudience,
      targetBuildings: parseJsonField(req.body.targetBuildings, 'targetBuildings') || [],
      targetGalas: parseJsonField(req.body.targetGalas, 'targetGalas') || [],
      targetUsers: parseJsonField(req.body.targetUsers, 'targetUsers') || []
    });

    res.status(201).json(document);
  })
);

// @route   PUT /api/documents/:id
// @desc    Update a document's metadata/targeting, with an optional file replace.
//          Always submitted as multipart from the frontend (whether or not a file
//          is being replaced), for one consistent code path — mirrors POST.
// @access  Private (Admin or Moderator)
router.put(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  documentUpload.single('file'),
  documentFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const document = await Document.findById(req.params.id);
    if (!document) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw new AppError('Document not found', 404);
    }

    const { title, description, category, otherCategoryLabel } = req.body;
    if (title !== undefined) document.title = title;
    if (description !== undefined) document.description = description;
    if (category !== undefined) document.category = category;
    document.otherCategoryLabel = document.category === 'other' ? otherCategoryLabel : undefined;
    if (req.body.targetAudience !== undefined) document.targetAudience = req.body.targetAudience;
    if (req.body.targetBuildings !== undefined) document.targetBuildings = parseJsonField(req.body.targetBuildings, 'targetBuildings');
    if (req.body.targetGalas !== undefined) document.targetGalas = parseJsonField(req.body.targetGalas, 'targetGalas');
    if (req.body.targetUsers !== undefined) document.targetUsers = parseJsonField(req.body.targetUsers, 'targetUsers');

    if (req.file) {
      let result;
      try {
        result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'documents',
          resource_type: 'raw'
        });
      } finally {
        fs.unlinkSync(req.file.path);
      }
      document.fileUrl = result.secure_url;
    }

    await document.save();
    res.json(document);
  })
);

// @route   DELETE /api/documents/:id
// @access  Private (Admin or Moderator)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) throw new AppError('Document not found', 404);
    await document.deleteOne();
    res.json({ msg: 'Document removed' });
  })
);

module.exports = router;

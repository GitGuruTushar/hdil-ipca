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

// @route   GET /api/documents
// @desc    List all documents (optional ?category= filter), paginated
// @access  Private (any logged-in member)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('uploadedBy', 'username fullName profilePicture'),
      Document.countDocuments(filter)
    ]);

    res.json({ documents, page, totalPages: Math.ceil(total / limit) || 1, total });
  })
);

const documentFields = [
  check('title', 'Title is required').not().isEmpty(),
  check('category', 'Invalid category').optional().isIn(['bylaws', 'minutes', 'circulars', 'other'])
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

    const { title, description, category } = req.body;

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
      fileUrl: result.secure_url,
      uploadedBy: req.user.id
    });

    res.status(201).json(document);
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

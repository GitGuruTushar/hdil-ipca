const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const Document = require('../models/Document');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// Documents can be PDFs, Word docs, etc. — the shared config/upload instance only
// allows image/video mimetypes via its fileFilter, so this route uses its own plain
// multer instance (no fileFilter restriction) instead of reusing that shared config.
const documentUpload = multer({ dest: 'uploads/' });

// @route   GET /api/documents
// @desc    List all documents (optional ?category= filter)
// @access  Private (any logged-in member)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName');

    res.json(documents);
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

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'documents',
      resource_type: 'raw'
    });
    fs.unlinkSync(req.file.path);

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

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   POST /api/feedback
// @desc    Submit free-text feedback (distinct from multiple-choice polls)
// @access  Private (any logged-in member)
router.post(
  '/',
  protect,
  [
    check('subject', 'Subject is required').not().isEmpty(),
    check('message', 'Message is required').not().isEmpty()
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { subject, message } = req.body;

    const feedback = await Feedback.create({
      member: req.user.id,
      subject,
      message
    });

    res.status(201).json(feedback);
  })
);

// @route   GET /api/feedback
// @desc    View all feedback, optionally filtered by status
// @access  Private (Admin only)
router.get(
  '/',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await Feedback.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const feedback = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('member', 'username fullName email');

    res.json({ feedback, page, totalPages, total });
  })
);

// @route   GET /api/feedback/mine
// @desc    View the requesting member's own submitted feedback
// @access  Private
router.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    const feedback = await Feedback.find({ member: req.user.id }).sort({ createdAt: -1 });
    res.json(feedback);
  })
);

// @route   PUT /api/feedback/:id/status
// @desc    Mark feedback reviewed (with an optional internal admin note)
// @access  Private (Admin only)
router.put(
  '/:id/status',
  protect,
  authorize('admin'),
  [check('status', 'Status must be new or reviewed').isIn(['new', 'reviewed'])],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) throw new AppError('Feedback not found', 404);

    const { status, adminNote } = req.body;
    feedback.status = status;
    if (adminNote !== undefined) feedback.adminNote = adminNote;

    await feedback.save();
    res.json(feedback);
  })
);

module.exports = router;

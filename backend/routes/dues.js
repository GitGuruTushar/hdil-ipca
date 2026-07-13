const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const DuesRecord = require('../models/DuesRecord');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   GET /api/dues
// @desc    All dues records, optionally filtered by status and/or member
// @access  Private (Admin/Moderator only)
router.get(
  '/',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.member) filter.member = req.query.member;

    const total = await DuesRecord.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const dues = await DuesRecord.find(filter)
      .populate('member', 'username fullName profilePicture')
      .populate('industry', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ dues, page, totalPages, total });
  })
);

// @route   GET /api/dues/mine
// @desc    The requesting member's own dues records
// @access  Private
router.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    const dues = await DuesRecord.find({ member: req.user.id })
      .populate('industry', 'name')
      .sort({ createdAt: -1 });

    res.json(dues);
  })
);

const duesFields = [
  check('member', 'A valid member is required').isMongoId(),
  check('period', 'Period is required').not().isEmpty(),
  check('amount', 'Amount must be a positive number').isFloat({ min: 0 })
];

// @route   POST /api/dues
// @access  Private (Admin/Moderator only)
router.post(
  '/',
  protect,
  authorize('admin', 'moderator'),
  duesFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { member, industry, period, amount, status, note } = req.body;

    const due = await DuesRecord.create({
      member,
      industry,
      period,
      amount,
      status,
      note
    });

    res.status(201).json(due);
  })
);

// @route   PUT /api/dues/:id
// @access  Private (Admin/Moderator only)
router.put(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const due = await DuesRecord.findById(req.params.id);
    if (!due) throw new AppError('Dues record not found', 404);

    const { status, amount, period, note } = req.body;
    if (status !== undefined) due.status = status;
    if (amount !== undefined) due.amount = amount;
    if (period !== undefined) due.period = period;
    if (note !== undefined) due.note = note;

    await due.save();
    res.json(due);
  })
);

// @route   DELETE /api/dues/:id
// @access  Private (Admin/Moderator only)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const due = await DuesRecord.findById(req.params.id);
    if (!due) throw new AppError('Dues record not found', 404);
    await due.deleteOne();
    res.json({ msg: 'Dues record removed' });
  })
);

module.exports = router;

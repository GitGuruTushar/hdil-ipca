const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Poll = require('../models/Poll');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   GET /api/polls
// @access  Private (any logged-in member)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const polls = await Poll.find().sort({ createdAt: -1 }).populate('createdBy', 'username fullName');
    res.json(polls);
  })
);

// @route   POST /api/polls
// @access  Private (Admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  [
    check('question', 'Question is required').not().isEmpty(),
    check('options', 'At least two options are required').isArray({ min: 2 }),
    check('expiresAt', 'A valid expiration date is required').isISO8601()
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { question, description, options, expiresAt } = req.body;

    const poll = await Poll.create({
      question,
      description,
      options: options.map((option) => ({ text: option, votes: 0 })),
      expiresAt,
      createdBy: req.user.id
    });

    res.status(201).json(poll);
  })
);

// @route   PUT /api/polls/:id
// @desc    Edit a poll's question/description/expiry (not its options, to avoid invalidating existing votes)
// @access  Private (Admin only)
router.put(
  '/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const poll = await Poll.findById(req.params.id);
    if (!poll) throw new AppError('Poll not found', 404);

    const { question, description, expiresAt } = req.body;
    if (question !== undefined) poll.question = question;
    if (description !== undefined) poll.description = description;
    if (expiresAt !== undefined) poll.expiresAt = expiresAt;

    await poll.save();
    res.json(poll);
  })
);

// @route   PUT /api/polls/:id/close
// @desc    Manually close a poll before its expiry
// @access  Private (Admin only)
router.put(
  '/:id/close',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const poll = await Poll.findById(req.params.id);
    if (!poll) throw new AppError('Poll not found', 404);
    poll.closedEarly = true;
    await poll.save();
    res.json(poll);
  })
);

// @route   PUT /api/polls/:id/vote
// @desc    Vote on a poll — one vote per member, enforced server-side
// @access  Private
router.put(
  '/:id/vote',
  protect,
  asyncHandler(async (req, res) => {
    const { optionIndex } = req.body;
    if (!Number.isInteger(optionIndex)) {
      throw new AppError('optionIndex must be an integer', 400);
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) throw new AppError('Poll not found', 404);
    if (!poll.isOpen()) throw new AppError('This poll is closed', 400);
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new AppError('Invalid option', 400);
    }
    if (poll.votedUsers.some((id) => id.toString() === req.user.id)) {
      throw new AppError('You have already voted on this poll', 400);
    }

    poll.options[optionIndex].votes += 1;
    poll.votedUsers.push(req.user.id);
    await poll.save();

    res.json(poll);
  })
);

// @route   DELETE /api/polls/:id
// @access  Private (Admin only)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const poll = await Poll.findById(req.params.id);
    if (!poll) throw new AppError('Poll not found', 404);
    await poll.deleteOne();
    res.json({ msg: 'Poll removed' });
  })
);

module.exports = router;

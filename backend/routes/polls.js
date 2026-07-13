const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Poll = require('../models/Poll');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logAudit = require('../utils/auditLog');

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
    const polls = await Poll.find().sort({ createdAt: -1 }).populate('createdBy', 'username fullName profilePicture');
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

    const pollForBounds = await Poll.findById(req.params.id).select('options');
    if (!pollForBounds) throw new AppError('Poll not found', 404);
    if (optionIndex < 0 || optionIndex >= pollForBounds.options.length) {
      throw new AppError('Invalid option', 400);
    }

    const poll = await Poll.findOneAndUpdate(
      {
        _id: req.params.id,
        votedUsers: { $ne: req.user.id },
        expiresAt: { $gt: new Date() },
        closedEarly: { $ne: true }
      },
      {
        $inc: { [`options.${optionIndex}.votes`]: 1 },
        $addToSet: { votedUsers: req.user.id }
      },
      { new: true }
    );

    if (!poll) {
      const existing = await Poll.findById(req.params.id);
      if (!existing) throw new AppError('Poll not found', 404);
      if (existing.votedUsers.some((id) => id.toString() === req.user.id)) {
        throw new AppError('You have already voted on this poll', 400);
      }
      throw new AppError('This poll is closed', 400);
    }

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
    logAudit(req.user.id, 'deleted_poll', 'Poll', poll.id, { question: poll.question });
    res.json({ msg: 'Poll removed' });
  })
);

module.exports = router;

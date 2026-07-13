const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Nickname = require('../models/Nickname');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   GET /api/nicknames
// @desc    The requester's full nickname map, fetched once per session: { targetUserId: nickname }
// @access  Private
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const nicknames = await Nickname.find({ owner: req.user.id }).select('target nickname');
    res.json(nicknames.reduce((acc, n) => ({ ...acc, [n.target]: n.nickname }), {}));
  })
);

// @route   PUT /api/nicknames/:targetUserId
// @desc    Set/update the requester's private nickname for another user (upsert)
// @access  Private
router.put(
  '/:targetUserId',
  protect,
  [check('nickname', 'Nickname is required').not().isEmpty().isLength({ max: 50 })],
  asyncHandler(async (req, res) => {
    runValidation(req);

    if (req.params.targetUserId === req.user.id) {
      throw new AppError('You cannot set a nickname for yourself', 400);
    }

    const targetExists = await User.exists({ _id: req.params.targetUserId });
    if (!targetExists) throw new AppError('User not found', 404);

    const doc = await Nickname.findOneAndUpdate(
      { owner: req.user.id, target: req.params.targetUserId },
      { nickname: req.body.nickname.trim() },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ target: doc.target, nickname: doc.nickname });
  })
);

// @route   DELETE /api/nicknames/:targetUserId
// @desc    Clear the requester's nickname for another user, reverting to their real name
// @access  Private
router.delete(
  '/:targetUserId',
  protect,
  asyncHandler(async (req, res) => {
    await Nickname.deleteOne({ owner: req.user.id, target: req.params.targetUserId });
    res.json({ msg: 'Nickname cleared' });
  })
);

module.exports = router;

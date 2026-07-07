const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   GET /api/push/vapid-public-key
// @desc    Frontend needs this to subscribe via the Push API
// @access  Public
router.get(
  '/vapid-public-key',
  asyncHandler(async (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  })
);

const subscribeFields = [
  check('endpoint', 'Endpoint is required').not().isEmpty(),
  check('keys.p256dh', 'keys.p256dh is required').not().isEmpty(),
  check('keys.auth', 'keys.auth is required').not().isEmpty()
];

// @route   POST /api/push/subscribe
// @desc    Upsert a push subscription for the requesting user (keyed on endpoint,
//          so re-subscribing from the same browser doesn't duplicate)
// @access  Private
router.post(
  '/subscribe',
  protect,
  subscribeFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { endpoint, keys } = req.body;

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user.id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(subscription);
  })
);

// @route   POST /api/push/unsubscribe
// @desc    Delete the matching push subscription belonging to the requesting user
// @access  Private
router.post(
  '/unsubscribe',
  protect,
  [check('endpoint', 'Endpoint is required').not().isEmpty()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user.id });
    res.json({ msg: 'Push subscription removed' });
  })
);

module.exports = router;

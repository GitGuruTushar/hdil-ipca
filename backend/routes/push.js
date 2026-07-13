const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const PushSubscription = require('../models/PushSubscription');
const { optionalAuth } = require('../middleware/auth');
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
//          so re-subscribing from the same browser doesn't duplicate). Works for
//          logged-in members and anonymous visitors alike — anyone installing the
//          PWA can opt into push, not just members.
// @access  Public
router.post(
  '/subscribe',
  optionalAuth,
  subscribeFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { endpoint, keys } = req.body;

    const update = { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
    if (req.user) {
      update.user = req.user.id;
    }

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(subscription);
  })
);

// @route   POST /api/push/unsubscribe
// @desc    Delete the matching push subscription belonging to the requesting caller —
//          matched by endpoint AND by owner (the logged-in user, or an anonymous
//          subscription when not logged in) so neither side can remove the other's.
// @access  Public
router.post(
  '/unsubscribe',
  optionalAuth,
  [check('endpoint', 'Endpoint is required').not().isEmpty()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const ownerFilter = req.user ? { user: req.user.id } : { user: { $exists: false } };
    await PushSubscription.deleteOne({ endpoint: req.body.endpoint, ...ownerFilter });
    res.json({ msg: 'Push subscription removed' });
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// @route   GET /api/notifications
// @desc    The requesting user's own notifications, most recent first
// @access  Private
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  })
);

// @route   GET /api/notifications/unread-count
// @access  Private
router.get(
  '/unread-count',
  protect,
  asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  })
);

// @route   PUT /api/notifications/:id/read
// @desc    Mark one notification read — must belong to the requesting user
// @access  Private
router.put(
  '/:id/read',
  protect,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new AppError('Notification not found', 404);
    if (notification.recipient.toString() !== req.user.id) {
      throw new AppError('Not authorized to modify this notification', 403);
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  })
);

// @route   PUT /api/notifications/read-all
// @desc    Mark all of the requesting user's notifications read
// @access  Private
router.put(
  '/read-all',
  protect,
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ msg: 'All notifications marked read' });
  })
);

module.exports = router;

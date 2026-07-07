const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const ContactMessage = require('../models/ContactMessage');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   POST /api/contact
// @desc    Submit a public contact form message
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'A valid email is required').isEmail(),
    check('message', 'Message is required').not().isEmpty()
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { name, email, phone, message } = req.body;

    await ContactMessage.create({ name, email, phone, message });

    res.status(201).json({ msg: 'Thank you for contacting us. We will get back to you soon.' });
  })
);

// @route   GET /api/contact
// @desc    View all contact form submissions, optionally filtered by status
// @access  Private (Admin only)
router.get(
  '/',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.json(messages);
  })
);

// @route   PUT /api/contact/:id/read
// @desc    Mark a contact message as read
// @access  Private (Admin only)
router.put(
  '/:id/read',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) throw new AppError('Contact message not found', 404);

    message.status = 'read';
    await message.save();

    res.json(message);
  })
);

// @route   DELETE /api/contact/:id
// @access  Private (Admin only)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) throw new AppError('Contact message not found', 404);
    await message.deleteOne();
    res.json({ msg: 'Contact message removed' });
  })
);

module.exports = router;

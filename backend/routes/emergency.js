const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const EmergencyContact = require('../models/EmergencyContact');
const ServiceRating = require('../models/ServiceRating');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// @route   GET /api/emergency
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const contacts = await EmergencyContact.find().sort({ category: 1, name: 1 });
    res.json(contacts);
  })
);

const contactFields = [
  check('name', 'Name is required').not().isEmpty(),
  check('number', 'Number is required').not().isEmpty(),
  check('category', 'Category is required').isIn(['Emergency', 'Service Provider', 'Other'])
];

// @route   POST /api/emergency
// @access  Private (Admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  contactFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { name, number, category } = req.body;
    const contact = await EmergencyContact.create({ name, number, category });
    res.status(201).json(contact);
  })
);

// @route   PUT /api/emergency/:id
// @access  Private (Admin only)
router.put(
  '/:id',
  protect,
  authorize('admin'),
  contactFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) throw new AppError('Emergency contact not found', 404);

    const { name, number, category } = req.body;
    Object.assign(contact, { name, number, category });
    await contact.save();

    res.json(contact);
  })
);

// @route   DELETE /api/emergency/:id
// @access  Private (Admin only)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) throw new AppError('Emergency contact not found', 404);
    await contact.deleteOne();
    res.json({ msg: 'Emergency contact removed' });
  })
);

// @route   POST /api/emergency/:id/ratings
// @desc    Rate a service provider for accountability (private — not shown publicly)
// @access  Private (any logged-in member)
router.post(
  '/:id/ratings',
  protect,
  [check('rating', 'Rating must be 1-5').isInt({ min: 1, max: 5 }), check('comment').optional().isLength({ max: 500 })],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) throw new AppError('Emergency contact not found', 404);

    const rating = await ServiceRating.findOneAndUpdate(
      { contact: req.params.id, member: req.user.id },
      { rating: req.body.rating, comment: req.body.comment },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(rating);
  })
);

// @route   GET /api/emergency/:id/ratings
// @desc    View a service provider's ratings and average — admin-only, for internal accountability
// @access  Private (Admin only)
router.get(
  '/:id/ratings',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const ratings = await ServiceRating.find({ contact: req.params.id })
      .populate('member', 'username fullName')
      .sort({ createdAt: -1 });

    const average = ratings.length
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : null;

    res.json({ ratings, average, count: ratings.length });
  })
);

module.exports = router;

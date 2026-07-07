const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Grievance = require('../models/Grievance');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const grievanceFields = [
  check('subject', 'Subject is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty()
];

// @route   POST /api/grievances
// @desc    File a new grievance
// @access  Private (any logged-in member)
router.post(
  '/',
  protect,
  grievanceFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { subject, description } = req.body;

    const grievance = await Grievance.create({
      member: req.user.id,
      subject,
      description
    });

    res.status(201).json(grievance);
  })
);

// @route   GET /api/grievances
// @desc    All grievances, sorted newest first (optional ?status= filter)
// @access  Private (Admin or Moderator)
router.get(
  '/',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const grievances = await Grievance.find(filter)
      .sort({ createdAt: -1 })
      .populate('member', 'username fullName email');

    res.json(grievances);
  })
);

// @route   GET /api/grievances/mine
// @desc    The requesting member's own grievances
// @access  Private (any logged-in member)
router.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    const grievances = await Grievance.find({ member: req.user.id }).sort({ createdAt: -1 });
    res.json(grievances);
  })
);

// @route   PUT /api/grievances/:id/status
// @desc    Update a grievance's status and optionally add an admin response
// @access  Private (Admin or Moderator)
router.put(
  '/:id/status',
  protect,
  authorize('admin', 'moderator'),
  [check('status', 'Invalid status').isIn(['open', 'in-progress', 'resolved'])],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) throw new AppError('Grievance not found', 404);

    grievance.status = req.body.status;
    if (req.body.adminResponse !== undefined) grievance.adminResponse = req.body.adminResponse;

    await grievance.save();
    res.json(grievance);
  })
);

module.exports = router;

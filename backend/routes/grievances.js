const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Grievance = require('../models/Grievance');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notify = require('../utils/notify');

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

    const admins = await require('../models/User').find({ role: 'admin', status: 'approved' });
    for (const admin of admins) {
      notify({
        recipientId: admin.id,
        type: 'grievance_filed',
        title: 'New grievance filed',
        body: `${req.user.fullName || req.user.username} filed a grievance: ${subject}`
      }).catch(() => {});
    }

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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await Grievance.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const grievances = await Grievance.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('member', 'username fullName email profilePicture');

    res.json({ grievances, page, totalPages, total });
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

    notify({
      recipientId: grievance.member,
      type: 'grievance_updated',
      title: 'Your grievance was updated',
      body: `Status: ${grievance.status}${grievance.adminResponse ? ' — ' + grievance.adminResponse : ''}`
    }).catch(() => {});

    res.json(grievance);
  })
);

module.exports = router;

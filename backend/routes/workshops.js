const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Workshop = require('../models/Workshop');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logAudit = require('../utils/auditLog');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const workshopFields = [
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('date', 'A valid date is required').isISO8601(),
  check('location', 'Location is required').not().isEmpty(),
  check('capacity', 'Capacity must be a positive number').isInt({ min: 1 })
];

// @route   GET /api/workshops
// @access  Private (any logged-in member) — attendee lists shouldn't be public
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const workshops = await Workshop.find().sort({ date: 1 }).populate('createdBy', 'username fullName');
    res.json(workshops);
  })
);

// @route   POST /api/workshops
// @access  Private (Admin or Moderator)
router.post(
  '/',
  protect,
  authorize('admin', 'moderator'),
  workshopFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { title, description, date, location, capacity } = req.body;

    const workshop = await Workshop.create({ title, description, date, location, capacity, createdBy: req.user.id });
    res.status(201).json(workshop);
  })
);

// @route   PUT /api/workshops/:id
// @access  Private (Admin or Moderator)
router.put(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  workshopFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) throw new AppError('Workshop not found', 404);

    const { title, description, date, location, capacity } = req.body;
    Object.assign(workshop, { title, description, date, location, capacity });
    await workshop.save();

    res.json(workshop);
  })
);

// @route   DELETE /api/workshops/:id
// @access  Private (Admin or Moderator)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) throw new AppError('Workshop not found', 404);
    await workshop.deleteOne();
    logAudit(req.user.id, 'deleted_workshop', 'Workshop', workshop.id, { title: workshop.title });
    res.json({ msg: 'Workshop removed' });
  })
);

// @route   POST /api/workshops/:id/register
// @desc    Register for a workshop — atomic capacity+dedup check, then emails a confirmation
// @access  Private
router.post(
  '/:id/register',
  protect,
  asyncHandler(async (req, res) => {
    const workshop = await Workshop.findOneAndUpdate(
      {
        _id: req.params.id,
        registeredUsers: { $ne: req.user.id },
        $expr: { $lt: [{ $size: '$registeredUsers' }, '$capacity'] }
      },
      { $addToSet: { registeredUsers: req.user.id } },
      { new: true }
    );

    if (!workshop) {
      const existing = await Workshop.findById(req.params.id);
      if (!existing) throw new AppError('Workshop not found', 404);
      if (existing.registeredUsers.some((id) => id.toString() === req.user.id)) {
        throw new AppError('You are already registered for this workshop', 400);
      }
      throw new AppError('This workshop is full', 400);
    }

    sendEmail({
      to: req.user.email,
      subject: `You're registered: ${workshop.title}`,
      html: `<p>Hi ${req.user.fullName},</p><p>You're confirmed for <strong>${workshop.title}</strong> on ${new Date(workshop.date).toLocaleString()} at ${workshop.location}.</p>`
    }).catch(() => {}); // best-effort — don't fail the registration if email delivery has an issue

    res.json(workshop);
  })
);

// @route   POST /api/workshops/:id/unregister
// @access  Private
router.post(
  '/:id/unregister',
  protect,
  asyncHandler(async (req, res) => {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { $pull: { registeredUsers: req.user.id } },
      { new: true }
    );
    if (!workshop) throw new AppError('Workshop not found', 404);
    res.json(workshop);
  })
);

// @route   GET /api/workshops/:id/checkin-info
// @desc    Returns the workshop's check-in code and the shareable check-in URL — encode this
//          into a single QR code the organizer displays/prints at the venue; each attendee
//          scans it on their own phone to self-check-in
// @access  Private (Admin or Moderator)
router.get(
  '/:id/checkin-info',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) throw new AppError('Workshop not found', 404);

    res.json({
      checkinCode: workshop.checkinCode,
      checkinUrl: `${process.env.FRONTEND_URL}/checkin/${workshop.id}/${workshop.checkinCode}`
    });
  })
);

// @route   POST /api/workshops/:id/checkin/:code
// @desc    Self check-in — a member scans the shared QR code with their own phone. Walk-ins
//          (never registered in advance) are allowed; this tracks attendance, not registration.
// @access  Private (any logged-in member)
router.post(
  '/:id/checkin/:code',
  protect,
  asyncHandler(async (req, res) => {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) throw new AppError('Workshop not found', 404);
    if (workshop.checkinCode !== req.params.code) {
      throw new AppError('Invalid check-in code', 400);
    }

    const updated = await Workshop.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { checkedInUsers: req.user.id } },
      { new: true }
    );

    res.json(updated);
  })
);

// @route   POST /api/workshops/:id/checkin-manual
// @desc    Manual fallback for attendees without a smartphone or with connectivity issues —
//          organizer looks up the person and marks them checked-in directly
// @access  Private (Admin or Moderator)
router.post(
  '/:id/checkin-manual',
  protect,
  authorize('admin', 'moderator'),
  [check('userId', 'A valid userId is required').isMongoId()],
  asyncHandler(async (req, res) => {
    runValidation(req);

    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { checkedInUsers: req.body.userId } },
      { new: true }
    );
    if (!workshop) throw new AppError('Workshop not found', 404);

    res.json(workshop);
  })
);

// @route   GET /api/workshops/:id/attendance
// @desc    Compare who registered in advance vs who actually showed up
// @access  Private (Admin or Moderator)
router.get(
  '/:id/attendance',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const workshop = await Workshop.findById(req.params.id)
      .populate('registeredUsers', 'username fullName email')
      .populate('checkedInUsers', 'username fullName email');
    if (!workshop) throw new AppError('Workshop not found', 404);

    res.json(workshop);
  })
);

module.exports = router;

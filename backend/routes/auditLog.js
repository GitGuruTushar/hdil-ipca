const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// @route   GET /api/audit-log
// @desc    Paginated audit trail, newest first. Optional ?actorId= and ?targetType= filters.
// @access  Private (Admin only)
router.get(
  '/',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = {};
    if (req.query.actorId) filter.actor = req.query.actorId;
    if (req.query.targetType) filter.targetType = req.query.targetType;

    const total = await AuditLog.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const entries = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'username fullName profilePicture');

    res.json({ entries, page, totalPages, total });
  })
);

module.exports = router;

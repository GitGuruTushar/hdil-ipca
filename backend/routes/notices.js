const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const Notice = require('../models/Notice');
const Industry = require('../models/Industry');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const sanitizeRichText = require('../utils/sanitizeRichText');
const logAudit = require('../utils/auditLog');
const cloudinary = require('../utils/cloudinary');
const { mixedMediaUpload, classifyFile, enforceMixedSizeLimits } = require('../config/mixedMediaUpload');

const MAX_NOTICE_ATTACHMENTS = 10;

const uploadNoticeAttachments = async (files) => {
  enforceMixedSizeLimits(files);
  const attachments = await Promise.all(
    files.map(async (file) => {
      const kind = classifyFile(file);
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'notices',
        resource_type: kind === 'document' ? 'raw' : kind
      });
      return {
        url: result.secure_url,
        type: kind,
        fileName: kind === 'document' ? file.originalname : undefined,
        mimeType: file.mimetype
      };
    })
  );
  files.forEach((file) => { try { fs.unlinkSync(file.path); } catch (err) { /* already gone */ } });
  return attachments;
};

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// A notice's targetAudience matches a member if it's open to everyone, or if it's
// scoped to owners/tenants and the member holds a listing of that occupancy type.
const audienceMatches = (notice, occupancyTypes) => {
  if (notice.targetAudience === 'everyone') return true;
  if (notice.targetAudience === 'owners') return occupancyTypes.includes('owner');
  if (notice.targetAudience === 'tenants') return occupancyTypes.includes('tenant');
  return false;
};

// @route   GET /api/notices
// @desc    Admins see every notice (including expired); members see only unexpired
//          notices targeted at their audience/building/gala based on their Industry listings
// @access  Private (any logged-in member)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'admin') {
      const notices = await Notice.find()
        .sort({ createdAt: -1 })
        .populate('createdBy', 'username fullName profilePicture');
      return res.json(notices);
    }

    const listings = await Industry.find({ owner: req.user.id });
    const buildingNumbers = listings.map((l) => l.buildingNumber);
    const galaNumbers = listings.map((l) => l.galaNumber);
    const occupancyTypes = listings.map((l) => l.occupancyType);

    // Members never see drafts, and scheduled notices only once publishAt has passed —
    // combined with the existing expiresAt/audience/building/gala targeting below.
    const notices = await Notice.find({
      expiresAt: { $gt: new Date() },
      $and: [
        { status: { $ne: 'draft' } },
        { $or: [{ status: { $ne: 'scheduled' } }, { publishAt: { $lte: new Date() } }] }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username fullName profilePicture');

    const visible = notices.filter((notice) => {
      if (!audienceMatches(notice, occupancyTypes)) return false;
      if (notice.targetBuilding != null && !buildingNumbers.includes(notice.targetBuilding)) return false;
      if (notice.targetGala != null && !galaNumbers.includes(notice.targetGala)) return false;
      return true;
    });

    res.json(visible);
  })
);

// @route   GET /api/notices/admin
// @desc    Get every notice regardless of status/publishAt/expiresAt (drafts & scheduled included)
// @access  Private (Admin/Moderator only)
router.get(
  '/admin',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const total = await Notice.countDocuments();
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const notices = await Notice.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'username fullName profilePicture');

    res.json({ notices, page, totalPages, total });
  })
);

const noticeFields = [
  check('title', 'Title is required').not().isEmpty(),
  check('content', 'Content is required').not().isEmpty(),
  check('expiresAt', 'A valid expiration date is required').isISO8601(),
  check('targetAudience', 'Invalid target audience').optional().isIn(['everyone', 'owners', 'tenants']),
  check('status', 'Status must be draft, scheduled, or published').optional().isIn(['draft', 'scheduled', 'published']),
  check('publishAt', 'publishAt must be a valid date').optional().isISO8601()
];

// @route   POST /api/notices
// @access  Private (Admin/Moderator only)
router.post(
  '/',
  protect,
  authorize('admin', 'moderator'),
  mixedMediaUpload.array('files', MAX_NOTICE_ATTACHMENTS),
  noticeFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { title, content, expiresAt, targetAudience, targetBuilding, targetGala, status, publishAt } = req.body;

    const files = req.files || [];
    const attachments = files.length ? await uploadNoticeAttachments(files) : [];

    const notice = await Notice.create({
      title,
      content: sanitizeRichText(content),
      expiresAt,
      targetAudience,
      targetBuilding,
      targetGala,
      status,
      publishAt,
      attachments,
      createdBy: req.user.id
    });

    res.status(201).json(notice);
  })
);

// @route   PUT /api/notices/:id
// @access  Private (Admin/Moderator only)
router.put(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  mixedMediaUpload.array('files', MAX_NOTICE_ATTACHMENTS),
  asyncHandler(async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (!notice) throw new AppError('Notice not found', 404);

    const { title, content, expiresAt, targetAudience, targetBuilding, targetGala, status, publishAt, existingAttachments } = req.body;
    if (title !== undefined) notice.title = title;
    if (content !== undefined) notice.content = sanitizeRichText(content);
    if (expiresAt !== undefined) notice.expiresAt = expiresAt;
    if (targetAudience !== undefined) notice.targetAudience = targetAudience;
    if (targetBuilding !== undefined) notice.targetBuilding = targetBuilding;
    if (targetGala !== undefined) notice.targetGala = targetGala;
    if (status !== undefined) notice.status = status;
    if (publishAt !== undefined) notice.publishAt = publishAt;

    if (existingAttachments !== undefined) {
      const keepUrls = JSON.parse(existingAttachments);
      notice.attachments = notice.attachments.filter((a) => keepUrls.includes(a.url));
    }

    const files = req.files || [];
    if (files.length) {
      const uploaded = await uploadNoticeAttachments(files);
      notice.attachments = [...notice.attachments, ...uploaded];
    }
    if (notice.attachments.length > MAX_NOTICE_ATTACHMENTS) {
      throw new AppError(`Up to ${MAX_NOTICE_ATTACHMENTS} attachments allowed per notice.`, 400);
    }

    await notice.save();
    res.json(notice);
  })
);

// @route   DELETE /api/notices/:id
// @access  Private (Admin/Moderator only)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (!notice) throw new AppError('Notice not found', 404);
    await notice.deleteOne();
    logAudit(req.user.id, 'deleted_notice', 'Notice', notice.id, { title: notice.title });
    res.json({ msg: 'Notice removed' });
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const ContactMessage = require('../models/ContactMessage');
const JobApplication = require('../models/JobApplication');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const toCsv = require('../utils/toCsv');

const sendCsv = (res, filename, rows, columns) => {
  const csv = toCsv(rows, columns);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

// @route   GET /api/export/members
// @access  Private (Admin only)
router.get(
  '/members',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    // password is select: false on the schema, so it's excluded automatically
    const members = await User.find().lean();

    sendCsv(res, 'members.csv', members, [
      { key: 'username', label: 'username' },
      { key: 'fullName', label: 'fullName' },
      { key: 'email', label: 'email' },
      { key: 'phone', label: 'phone' },
      { key: 'role', label: 'role' },
      { key: 'status', label: 'status' },
      { key: 'createdAt', label: 'createdAt' }
    ]);
  })
);

// @route   GET /api/export/feedback
// @access  Private (Admin only)
router.get(
  '/feedback',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const feedback = await Feedback.find()
      .populate('member', 'username fullName email profilePicture')
      .lean();

    sendCsv(res, 'feedback.csv', feedback, [
      { key: 'member.username', label: 'member.username' },
      { key: 'member.fullName', label: 'member.fullName' },
      { key: 'member.email', label: 'member.email' },
      { key: 'subject', label: 'subject' },
      { key: 'message', label: 'message' },
      { key: 'status', label: 'status' },
      { key: 'createdAt', label: 'createdAt' }
    ]);
  })
);

// @route   GET /api/export/contact-messages
// @access  Private (Admin only)
router.get(
  '/contact-messages',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const messages = await ContactMessage.find().lean();

    sendCsv(res, 'contact-messages.csv', messages, [
      { key: 'name', label: 'name' },
      { key: 'email', label: 'email' },
      { key: 'phone', label: 'phone' },
      { key: 'message', label: 'message' },
      { key: 'status', label: 'status' },
      { key: 'createdAt', label: 'createdAt' }
    ]);
  })
);

// @route   GET /api/export/vacancy-applications/:vacancyId
// @desc    resumeUrl may be absent on older records — toCsv renders it as an empty cell
// @access  Private (Admin only)
router.get(
  '/vacancy-applications/:vacancyId',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const applications = await JobApplication.find({ vacancy: req.params.vacancyId }).lean();

    sendCsv(res, 'vacancy-applications.csv', applications, [
      { key: 'applicantName', label: 'applicantName' },
      { key: 'applicantEmail', label: 'applicantEmail' },
      { key: 'applicantPhone', label: 'applicantPhone' },
      { key: 'coverNote', label: 'coverNote' },
      { key: 'resumeUrl', label: 'resumeUrl' },
      { key: 'createdAt', label: 'createdAt' }
    ]);
  })
);

module.exports = router;

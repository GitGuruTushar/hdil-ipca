const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const Vacancy = require('../models/Vacancy');
const JobApplication = require('../models/JobApplication');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const cloudinary = require('../utils/cloudinary');

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

// Local multer instance for resume uploads — the shared config/upload.js only allows
// image/video mimetypes, but resumes need PDF/DOC support, so we don't reuse it here.
const resumeUpload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// @route   GET /api/vacancies
// @desc    List all open, not-yet-expired vacancies
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const vacancies = await Vacancy.find({ status: 'open', deadline: { $gte: new Date() } })
      .sort({ deadline: 1 })
      .populate('industry', 'name')
      .populate('postedBy', 'username fullName');
    res.json(vacancies);
  })
);

// @route   GET /api/vacancies/:id
// @access  Public
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const vacancy = await Vacancy.findById(req.params.id)
      .populate('industry', 'name')
      .populate('postedBy', 'username fullName');
    if (!vacancy) throw new AppError('Vacancy not found', 404);
    res.json(vacancy);
  })
);

const vacancyFields = [
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('eligibility', 'Eligibility is required').not().isEmpty(),
  check('deadline', 'A valid deadline date is required').isISO8601()
];

// @route   POST /api/vacancies
// @desc    Post a job opening (any logged-in member or admin)
// @access  Private
router.post(
  '/',
  protect,
  vacancyFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { title, description, eligibility, deadline, industry } = req.body;

    const vacancy = await Vacancy.create({
      title,
      description,
      eligibility,
      deadline,
      industry: industry || undefined,
      postedBy: req.user.id
    });

    res.status(201).json(vacancy);
  })
);

// @route   PUT /api/vacancies/:id
// @desc    Update a vacancy (including closing it early via status)
// @access  Private (postedBy or admin)
router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const vacancy = await Vacancy.findById(req.params.id);
    if (!vacancy) throw new AppError('Vacancy not found', 404);

    if (vacancy.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to edit this vacancy', 403);
    }

    const allowedFields = ['title', 'description', 'eligibility', 'deadline', 'industry', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) vacancy[field] = req.body[field];
    }

    await vacancy.save();
    res.json(vacancy);
  })
);

// @route   DELETE /api/vacancies/:id
// @access  Private (postedBy or admin)
router.delete(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const vacancy = await Vacancy.findById(req.params.id);
    if (!vacancy) throw new AppError('Vacancy not found', 404);

    if (vacancy.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to delete this vacancy', 403);
    }

    await vacancy.deleteOne();
    res.json({ msg: 'Vacancy removed' });
  })
);

// @route   POST /api/vacancies/:id/apply
// @desc    Apply to a vacancy — no account needed. Optional multipart "resume" file (PDF/DOC).
// @access  Public
router.post(
  '/:id/apply',
  resumeUpload.single('resume'),
  [
    check('applicantName', 'Name is required').not().isEmpty(),
    check('applicantEmail', 'A valid email is required').isEmail(),
    check('applicantPhone', 'Phone number is required').not().isEmpty(),
    check('coverNote').optional().isLength({ max: 1000 })
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);

    const vacancy = await Vacancy.findById(req.params.id);
    if (!vacancy || vacancy.status !== 'open' || new Date(vacancy.deadline) < new Date()) {
      throw new AppError('This vacancy is no longer accepting applications', 400);
    }

    let resumeUrl;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'resumes',
        resource_type: 'raw'
      });
      fs.unlinkSync(req.file.path);
      resumeUrl = result.secure_url;
    }

    const { applicantName, applicantEmail, applicantPhone, coverNote } = req.body;
    const application = await JobApplication.create({
      vacancy: vacancy.id,
      applicantName,
      applicantEmail,
      applicantPhone,
      coverNote,
      resumeUrl
    });

    res.status(201).json(application);
  })
);

// @route   GET /api/vacancies/:id/applications
// @desc    View applicants for a vacancy — private, not public data
// @access  Private (postedBy or admin)
router.get(
  '/:id/applications',
  protect,
  asyncHandler(async (req, res) => {
    const vacancy = await Vacancy.findById(req.params.id);
    if (!vacancy) throw new AppError('Vacancy not found', 404);

    if (vacancy.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to view applications for this vacancy', 403);
    }

    const applications = await JobApplication.find({ vacancy: req.params.id }).sort({ createdAt: -1 });
    res.json(applications);
  })
);

module.exports = router;

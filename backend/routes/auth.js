const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logAudit = require('../utils/auditLog');
const notify = require('../utils/notify');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits, IMAGE_TYPES } = require('../config/upload');

const signToken = (user) =>
  jwt.sign(
    { user: { id: user.id, role: user.role, tokenVersion: user.tokenVersion } },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const registerFields = [
  check('username', 'Username is required').not().isEmpty(),
  check('fullName', 'Full name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
];

// Required specifically at self-registration so an admin has enough context to
// approve/reject an applicant — NOT required for admin-direct-create (POST
// /register below), which never collects these.
const signupOnlyFields = [
  check('phone', 'A valid 10-digit phone number is required').matches(/^[6-9]\d{9}$/),
  check('buildingNumber', 'Building number is required').isNumeric(),
  check('galaNumber', 'Gala number is required').isNumeric(),
  check('occupancyType', 'Occupancy type must be owner or tenant').isIn(['owner', 'tenant']),
  check('businessName', 'Business name is required').not().isEmpty(),
  check('businessType', 'Business type is required').not().isEmpty()
];

// @route   POST /api/auth/signup
// @desc    Self-registration by a prospective member — account stays 'pending' until an admin approves it
// @access  Public
router.post(
  '/signup',
  upload.single('photo'),
  [...registerFields, ...signupOnlyFields],
  asyncHandler(async (req, res) => {
    try {
      runValidation(req);
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw err;
    }

    const {
      username,
      fullName,
      email,
      password,
      phone,
      buildingNumber,
      galaNumber,
      occupancyType,
      businessName,
      businessType
    } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw new AppError('An account with that email or username already exists', 400);
    }

    let profilePicture = null;
    if (req.file) {
      if (!IMAGE_TYPES.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        throw new AppError(`Unsupported file type: ${req.file.mimetype}. Allowed: jpg, png, webp.`, 400);
      }
      enforceSizeLimits(req.file);
      try {
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'profiles', resource_type: 'image' });
        profilePicture = result.secure_url;
      } finally {
        fs.unlinkSync(req.file.path);
      }
    }

    const user = await User.create({
      username,
      fullName,
      email,
      phone,
      password,
      buildingNumber,
      galaNumber,
      occupancyType,
      businessName,
      businessType,
      profilePicture,
      role: 'member',
      status: 'pending'
    });

    const admins = await User.find({ role: 'admin', status: 'approved' });
    for (const admin of admins) {
      notify({
        recipientId: admin.id,
        type: 'new_signup',
        title: 'New member awaiting approval',
        body: `${fullName} (${email}) — Bldg ${buildingNumber}, Gala ${galaNumber}, ${occupancyType} — just signed up.`
      }).catch(() => {});
    }

    res.status(201).json({
      msg: 'Account created. An admin needs to approve it before you can log in.',
      userId: user.id
    });
  })
);

// @route   POST /api/auth/register
// @desc    Admin directly creates a member (or admin) account — immediately usable, no approval needed
// @access  Private (Admin)
router.post(
  '/register',
  protect,
  authorize('admin'),
  [...registerFields, check('role', 'Role must be member, moderator, or admin').optional().isIn(['member', 'moderator', 'admin'])],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { username, fullName, email, password, phone, role } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      throw new AppError('An account with that email or username already exists', 400);
    }

    const user = await User.create({
      username,
      fullName,
      email,
      phone,
      password,
      role: role || 'member',
      status: 'approved'
    });

    res.status(201).json({ msg: 'User registered successfully', userId: user.id });
  })
);

// @route   GET /api/auth/pending
// @desc    List accounts awaiting approval
// @access  Private (Admin)
router.get(
  '/pending',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = { status: 'pending' };
    const total = await User.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ users, page, totalPages, total });
  })
);

// @route   PUT /api/auth/users/:id/approve
// @desc    Approve a pending self-registered account
// @access  Private (Admin)
router.put(
  '/users/:id/approve',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    user.status = 'approved';
    await user.save();
    logAudit(req.user.id, 'approved_member', 'User', user.id);
    notify({
      recipientId: user.id,
      type: 'account_approved',
      title: 'Your account is approved',
      body: 'You can now log in to the HDIL-IPCA member portal.'
    }).catch(() => {});
    res.json({ msg: 'User approved', user });
  })
);

// @route   PUT /api/auth/users/:id/reject
// @desc    Reject (delete) a pending self-registered account
// @access  Private (Admin)
router.put(
  '/users/:id/reject',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    if (user.status !== 'pending') {
      throw new AppError('Only pending accounts can be rejected', 400);
    }
    await user.deleteOne();
    logAudit(req.user.id, 'rejected_member', 'User', user.id, { email: user.email });
    res.json({ msg: 'Registration rejected' });
  })
);

// @route   PUT /api/auth/users/:id/disable
// @desc    Toggle an approved account's access without deleting their data
// @access  Private (Admin)
router.put(
  '/users/:id/disable',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    if (user.id === req.user.id) {
      throw new AppError('You cannot disable your own account', 400);
    }
    user.status = user.status === 'disabled' ? 'approved' : 'disabled';
    await user.save();
    logAudit(req.user.id, user.status === 'disabled' ? 'disabled_member' : 'reenabled_member', 'User', user.id);
    res.json({ msg: `User ${user.status}`, user });
  })
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      throw new AppError('Invalid credentials', 400);
    }
    if (user.status === 'pending') {
      throw new AppError('Your account is awaiting admin approval', 403);
    }
    if (user.status === 'disabled') {
      throw new AppError('Your account has been disabled. Contact the federation office.', 403);
    }

    res.json({ token: signToken(user), role: user.role, fullName: user.fullName });
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Email a password reset link
// @access  Public
router.post(
  '/forgot-password',
  [check('email', 'Please include a valid email').isEmail()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const user = await User.findOne({ email: req.body.email });

    // Always return the same response whether or not the account exists, so this
    // endpoint can't be used to enumerate registered emails.
    if (user) {
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your HDIL-IPCA password',
          html: `<p>Hi ${user.fullName},</p><p>Click below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`
        });
      } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        throw new AppError('Could not send reset email — please try again later', 500);
      }
    }

    res.json({ msg: 'If an account with that email exists, a reset link has been sent.' });
  })
);

// @route   PUT /api/auth/reset-password/:token
// @desc    Set a new password using a valid reset token
// @access  Public
router.put(
  '/reset-password/:token',
  [check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Reset link is invalid or has expired', 400);
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save(); // pre-save hook bumps tokenVersion + passwordChangedAt since password is modified

    res.json({ token: signToken(user), role: user.role, msg: 'Password updated' });
  })
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

// @route   PUT /api/auth/me
// @desc    Update own profile (name/phone) or password (requires current password)
// @access  Private
router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const { fullName, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (fullName) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;

    let passwordChanged = false;
    if (newPassword) {
      if (!currentPassword || !(await user.matchPassword(currentPassword))) {
        throw new AppError('Current password is incorrect', 400);
      }
      user.password = newPassword;
      passwordChanged = true;
    }

    await user.save(); // pre-save hook bumps tokenVersion + passwordChangedAt since password is modified

    // Changing the password invalidates the token that was just used to make this
    // request (tokenVersion no longer matches) — issue a fresh one so the client
    // doesn't get logged out mid-session for changing their own password.
    res.json({
      msg: 'Profile updated',
      token: passwordChanged ? signToken(user) : undefined
    });
  })
);

// @route   POST /api/auth/me/photo
// @desc    Upload/replace the caller's own profile picture
// @access  Private
router.post(
  '/me/photo',
  protect,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('A photo is required', 400);
    if (!IMAGE_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new AppError(`Unsupported file type: ${req.file.mimetype}. Allowed: jpg, png, webp.`, 400);
    }
    enforceSizeLimits(req.file);

    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, { folder: 'profiles', resource_type: 'image' });
    } finally {
      fs.unlinkSync(req.file.path);
    }

    const user = await User.findById(req.user.id);
    user.profilePicture = result.secure_url;
    await user.save();
    res.json({ profilePicture: user.profilePicture });
  })
);

// @route   DELETE /api/auth/me/photo
// @desc    Remove the caller's own profile picture (reverts to generated initials)
// @access  Private
router.delete(
  '/me/photo',
  protect,
  asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { profilePicture: null });
    res.json({ msg: 'Profile photo removed' });
  })
);

// @route   GET /api/auth/directory
// @desc    Search approved members to start a conversation with. Deliberately NOT
//          admin-only (unlike GET /users below) — any authenticated role needs this
//          to find people to message. The public search route never indexes users
//          for privacy; this is a different, authenticated-only lookup.
// @access  Private (any logged-in role)
router.get(
  '/directory',
  protect,
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = { status: 'approved', _id: { $ne: req.user.id } };

    const q = (req.query.q || '').trim();
    if (q) {
      // Escape regex special characters so arbitrary user input can't throw or behave unexpectedly.
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ fullName: re }, { username: re }];
    }

    // Querying "who signed up under building/gala X" via personal signup data is a
    // new capability, not a narrowing of the base route — gated to admin/moderator
    // (used by TargetingPicker's people-picker), unlike the base route above which
    // stays open to any role for chat's existing use.
    if (req.user.role === 'admin' || req.user.role === 'moderator') {
      if (req.query.buildingNumber) filter.buildingNumber = Number(req.query.buildingNumber);
      if (req.query.galaNumber) filter.galaNumber = Number(req.query.galaNumber);
    }

    const total = await User.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const users = await User.find(filter)
      .select('fullName username role profilePicture lastSeenAt')
      .sort({ fullName: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ users, page, totalPages, total });
  })
);

// @route   GET /api/auth/directory/galas
// @desc    Distinct gala numbers within a building — the "enter building 7 → see
//          the galas that exist in it" step of TargetingPicker's people-picker.
// @access  Private (Admin/Moderator only)
router.get(
  '/directory/galas',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const buildingNumber = Number(req.query.buildingNumber);
    if (!Number.isFinite(buildingNumber)) throw new AppError('buildingNumber is required', 400);

    const galas = await User.distinct('galaNumber', {
      status: 'approved',
      buildingNumber,
      galaNumber: { $ne: null }
    });

    res.json({ galas: galas.sort((a, b) => a - b) });
  })
);

// @route   GET /api/auth/users
// @desc    Get all approved/disabled users (Admin only)
// @access  Private (Admin)
router.get(
  '/users',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = { status: { $ne: 'pending' } };
    const total = await User.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ users, page, totalPages, total });
  })
);

// @route   DELETE /api/auth/users/:id
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete(
  '/users/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
      throw new AppError('You cannot delete your own account', 400);
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);

    const ownsListing = await require('../models/Industry').exists({ owner: req.params.id });
    if (ownsListing) {
      throw new AppError('This user still owns business listings. Reassign or remove them first.', 400);
    }

    await user.deleteOne();
    await require('../models/PushSubscription').deleteMany({ user: req.params.id });
    await require('../models/Notification').deleteMany({ recipient: req.params.id });
    logAudit(req.user.id, 'deleted_member', 'User', user.id, { email: user.email });
    res.json({ msg: 'User deleted' });
  })
);

module.exports = router;

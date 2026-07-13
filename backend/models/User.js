const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username can not be more than 50 characters']
  },
  fullName: {
    type: String,
    required: [true, 'Please add a full name'],
    trim: true,
    maxlength: [100, 'Full name can not be more than 100 characters']
  },
  // Required + validated at self-registration (POST /auth/signup) so admins have
  // a way to reach an applicant; stays optional here at the schema level so
  // admin-direct-create (POST /auth/register), which never collects it, keeps working.
  phone: {
    type: String,
    trim: true
  },
  // Cloudinary secure_url; null/undefined means the UI falls back to generated initials.
  profilePicture: {
    type: String,
    default: null
  },
  // The next 5 fields are collected at self-registration for admin-approval context
  // (which building/gala this applicant is in, what business they run) — deliberately
  // NOT the full business directory listing (Industry model), which stays a separate,
  // optional step. Optional at the schema level for the same admin-direct-create reason as phone.
  buildingNumber: {
    type: Number
  },
  galaNumber: {
    type: Number
  },
  occupancyType: {
    type: String,
    enum: ['owner', 'tenant']
  },
  businessName: {
    type: String,
    trim: true,
    maxlength: [100, 'Business name can not be more than 100 characters']
  },
  businessType: {
    type: String,
    trim: true,
    maxlength: [100, 'Business type can not be more than 100 characters']
  },
  // Updated on socket disconnect (Phase 5 realtime) — powers "last seen" in chat.
  lastSeenAt: {
    type: Date,
    default: null
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['member', 'moderator', 'admin'],
    default: 'member'
  },
  // 'pending' = awaiting admin approval (self-registered), 'approved' = can log in,
  // 'disabled' = admin-revoked access. Admin-created accounts start 'approved'.
  status: {
    type: String,
    enum: ['pending', 'approved', 'disabled'],
    default: 'approved'
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  passwordChangedAt: {
    type: Date
  },
  // Bumped every time the password changes. Embedded in the JWT at sign-time and
  // compared on every request in middleware/auth.js — a mismatch means the token
  // predates a password change and is rejected. A version counter sidesteps the
  // second-resolution rounding issues a timestamp-vs-JWT-iat comparison runs into
  // when a login and a password change land in the same wall-clock second.
  tokenVersion: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  this.tokenVersion += 1;
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generates a plaintext reset token to email the user, and stores only its
// SHA-256 hash + a 1-hour expiry on the document (never store the plaintext token).
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);

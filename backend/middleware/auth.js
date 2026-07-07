const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

// Verifies the JWT AND re-checks the user against the database on every request,
// so a deleted/disabled/demoted user loses access immediately instead of waiting
// out the token's 7-day expiry.
const protect = asyncHandler(async (req, res, next) => {
  const header = req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('No token, authorization denied', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Token is not valid', 401));
  }

  if (!decoded.user || !decoded.user.id) {
    return next(new AppError('Token is not valid', 401));
  }

  const user = await User.findById(decoded.user.id);
  if (!user) {
    return next(new AppError('Account no longer exists', 401));
  }
  if (user.status === 'pending') {
    return next(new AppError('Account is pending admin approval', 403));
  }
  if (user.status === 'disabled') {
    return next(new AppError('Account has been disabled', 403));
  }

  req.user = user;
  next();
});

// Usage: router.post('/', protect, authorize('admin'), handler)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Access denied for this role', 403));
  }
  next();
};

module.exports = { protect, authorize };

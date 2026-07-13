const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

// Shared by resolveUserFromRequest (HTTP) and the Socket.io handshake
// middleware (backend/sockets/index.js): decodes a raw JWT and re-checks the
// user against the database, so a deleted/disabled/demoted user loses access
// immediately instead of waiting out the token's 7-day expiry — regardless of
// which transport the request came in on. Throws an AppError describing
// exactly why authentication failed.
async function verifyToken(token) {
  if (!token) {
    throw new AppError('No token, authorization denied', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Token is not valid', 401);
  }

  if (!decoded.user || !decoded.user.id) {
    throw new AppError('Token is not valid', 401);
  }

  const user = await User.findById(decoded.user.id);
  if (!user) {
    throw new AppError('Account no longer exists', 401);
  }
  if (user.status === 'pending') {
    throw new AppError('Account is pending admin approval', 403);
  }
  if (user.status === 'disabled') {
    throw new AppError('Account has been disabled', 403);
  }

  // A version counter (bumped on every password change, see User's pre-save hook)
  // rather than a timestamp comparison — avoids second-resolution rounding races
  // between a token's JWT `iat` and a password-change timestamp landing in the same
  // wall-clock second, which a naive timestamp comparison gets wrong in one direction
  // or the other no matter which way the inequality is written.
  if (decoded.user.tokenVersion !== user.tokenVersion) {
    throw new AppError('Password was changed, please log in again', 401);
  }

  return user;
}

// Extracts the Bearer token from an HTTP request's Authorization header, then
// defers to verifyToken() for the actual decode/database checks.
async function resolveUserFromRequest(req) {
  const header = req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('No token, authorization denied', 401);
  }

  return verifyToken(token);
}

// Verifies the JWT AND re-checks the user against the database on every request,
// so a deleted/disabled/demoted user loses access immediately instead of waiting
// out the token's 7-day expiry.
const protect = asyncHandler(async (req, res, next) => {
  req.user = await resolveUserFromRequest(req);
  next();
});

// Same checks as protect, but never rejects the request on their account: a
// missing header, invalid/expired token, tokenVersion mismatch, or unknown/
// disabled user just leaves req.user null so a route can serve both logged-in
// and anonymous callers (e.g. public PWA push subscriptions).
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    req.user = await resolveUserFromRequest(req);
  } catch (err) {
    req.user = null;
  }
  next();
});

// Usage: router.post('/', protect, authorize('admin'), handler)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Access denied for this role', 403));
  }
  next();
};

module.exports = { protect, optionalAuth, authorize, verifyToken };

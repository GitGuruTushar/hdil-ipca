const multer = require('multer');
const AppError = require('../utils/AppError');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

function fileFilter(req, file, cb) {
  if (IMAGE_TYPES.includes(file.mimetype) || VIDEO_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new AppError(`Unsupported file type: ${file.mimetype}. Allowed: jpg, png, webp, mp4, webm.`, 400));
}

// Shared multer instance: images capped at 10MB, videos at 100MB (checked again per-file after upload
// since multer's global `limits.fileSize` can only apply one ceiling — we use the larger ceiling here
// and enforce the tighter per-type limit in the route after inspecting file.mimetype).
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter,
});

function enforceSizeLimits(files) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  for (const file of list) {
    const isImage = IMAGE_TYPES.includes(file.mimetype);
    const cap = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > cap) {
      throw new AppError(
        `${file.originalname} exceeds the ${isImage ? '10MB image' : '100MB video'} limit.`,
        400
      );
    }
  }
}

module.exports = { upload, enforceSizeLimits, IMAGE_TYPES, VIDEO_TYPES };

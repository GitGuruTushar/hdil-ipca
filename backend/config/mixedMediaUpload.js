const multer = require('multer');
const fs = require('fs');
const AppError = require('../utils/AppError');
const { IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } = require('./upload');
const { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } = require('./documentUpload');

// Chat attachments and notice attachments both need images + video + documents
// in a single upload — neither of the existing multer instances (config/upload.js
// is image/video only, config/documentUpload.js is documents only) covers that
// combination, so this one accepts the union and defers per-type size
// enforcement to enforceMixedSizeLimits below (multer only supports one
// blanket `limits.fileSize`, not per-mimetype caps).
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES];
const MAX_BYTES = 100 * 1024 * 1024; // largest single real cap (video) — real per-type caps enforced after upload

const mixedMediaUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALL_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new AppError(`Unsupported file type: ${file.mimetype}.`, 400));
  }
});

function classifyFile(file) {
  if (IMAGE_TYPES.includes(file.mimetype)) return 'image';
  if (VIDEO_TYPES.includes(file.mimetype)) return 'video';
  return 'document';
}

const CAP_BY_KIND = { image: MAX_IMAGE_BYTES, video: MAX_VIDEO_BYTES, document: MAX_DOCUMENT_BYTES };
const LABEL_BY_KIND = { image: '10MB image', video: '100MB video', document: '20MB document' };

// Enforces each file's real per-type cap (image 10MB / video 100MB / document
// 20MB) after multer's single blanket limit already let it through. Checks
// every file before cleaning any of them up, so a failure always removes the
// ENTIRE batch from disk — not just the files in whichever type happened to
// be checked first.
function enforceMixedSizeLimits(files) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  if (!list.length) return;

  let offender = null;
  for (const file of list) {
    const kind = classifyFile(file);
    if (!offender && file.size > CAP_BY_KIND[kind]) {
      offender = { file, kind };
    }
  }

  if (offender) {
    list.forEach((f) => {
      try { fs.unlinkSync(f.path); } catch (err) { /* already gone */ }
    });
    throw new AppError(`${offender.file.originalname} exceeds the ${LABEL_BY_KIND[offender.kind]} limit.`, 400);
  }
}

module.exports = { mixedMediaUpload, classifyFile, enforceMixedSizeLimits };

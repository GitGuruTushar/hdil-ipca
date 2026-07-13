const multer = require('multer');
const AppError = require('../utils/AppError');

// Documents (PDF/Word/Excel) — the shared config/upload.js instance only
// allows image/video mimetypes via its fileFilter, so document-accepting
// routes (documents.js, conversations.js, notices.js) share this instance
// instead, so their allowlist/cap can't quietly drift apart across copies.
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20MB

const documentUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_DOCUMENT_BYTES },
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new AppError('Unsupported file type. Allowed: PDF, Word, Excel.', 400), false);
  }
});

module.exports = { documentUpload, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES };

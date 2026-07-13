const express = require('express');
const router = express.Router();
const TranslationOverride = require('../models/TranslationOverride');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const VALID_LANGS = ['en', 'hi', 'mr'];

// @route   GET /api/translations
// @desc    List every existing override (small payload — only admin-edited
//          keys, not all ~1,068 default strings) so I18nProvider can merge
//          them over the static JSON dictionaries.
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const overrides = await TranslationOverride.find().select('lang key value -_id');
    res.json(overrides);
  })
);

// @route   PUT /api/translations
// @desc    Upsert a single translation override
// @access  Private (Admin or Moderator)
router.put(
  '/',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const { lang, key, value } = req.body;
    if (!VALID_LANGS.includes(lang)) throw new AppError('Invalid language', 400);
    if (!key || typeof key !== 'string') throw new AppError('Missing key', 400);
    if (typeof value !== 'string' || !value.trim()) throw new AppError('Value cannot be empty', 400);

    const override = await TranslationOverride.findOneAndUpdate(
      { lang, key },
      { lang, key, value, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(override);
  })
);

// @route   DELETE /api/translations/:lang/:key
// @desc    Revert a key back to its default (deletes the override)
// @access  Private (Admin or Moderator)
router.delete(
  '/:lang/:key',
  protect,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    const { lang, key } = req.params;
    await TranslationOverride.deleteOne({ lang, key });
    res.json({ msg: 'Reverted to default' });
  })
);

module.exports = router;

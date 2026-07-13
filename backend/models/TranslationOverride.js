const mongoose = require('mongoose');

// DB layer on top of the already-translated static i18n JSON (en/hi/mr, ~1,068
// keys) — additive only. The JSON files stay the source of truth/default; this
// collection only stores what an admin has explicitly overridden via the
// Translations admin screen, keeping the payload small (not all 1,068 rows).
const TranslationOverrideSchema = new mongoose.Schema(
  {
    lang: { type: String, enum: ['en', 'hi', 'mr'], required: true },
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

TranslationOverrideSchema.index({ lang: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('TranslationOverride', TranslationOverrideSchema);

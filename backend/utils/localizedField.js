const LANGS = ['en', 'hi', 'mr'];

// Mongoose sub-schema for a { en, hi, mr } text field — spread into a model's
// field definition, e.g. `title: localizedFieldSchema({ required: true })`.
const localizedFieldSchema = (enOpts = {}) => ({
  en: { type: String, default: '', trim: true, ...enOpts },
  hi: { type: String, default: '', trim: true },
  mr: { type: String, default: '', trim: true }
});

// Requests carrying a localized field arrive two ways: as a real object (JSON
// body routes like emergency.js) or as a JSON-stringified string (multipart/
// FormData routes like updates.js/gallery.js, which can't nest objects). A
// bare string with no JSON structure is treated as legacy English-only input
// so older clients/data aren't broken by this field becoming multilingual.
function parseLocalizedField(raw) {
  if (raw == null) return { en: '', hi: '', mr: '' };
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { en: raw.en || '', hi: raw.hi || '', mr: raw.mr || '' };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { en: parsed.en || '', hi: parsed.hi || '', mr: parsed.mr || '' };
      }
    } catch (err) {
      // not JSON — fall through to legacy plain-string handling below
    }
    return { en: raw, hi: '', mr: '' };
  }
  return { en: '', hi: '', mr: '' };
}

module.exports = { LANGS, localizedFieldSchema, parseLocalizedField };

// Admins often paste an external URL without a protocol (e.g. "facebook.com" instead
// of "https://facebook.com"). Browsers then resolve that relative to the current
// page's own origin instead of opening the external site. Prepend https:// whenever
// the value doesn't already declare a protocol.
function normalizeExternalUrl(raw) {
  if (!raw) return raw;
  const trimmed = String(raw).trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

module.exports = normalizeExternalUrl;

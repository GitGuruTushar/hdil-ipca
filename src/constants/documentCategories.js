// Shared across admin/documents and dashboard/documents — previously hardcoded
// identically in both. i18n keys differ per surface (admin.media.documents.category.*
// vs member.misc.documents.category.*), so each call site still builds its own
// translation key from opt.value; this just de-duplicates the value/label pairs.
export const DOCUMENT_CATEGORY_OPTIONS = [
  { value: "bylaws", label: "Bylaws" },
  { value: "minutes", label: "Minutes" },
  { value: "circulars", label: "Circulars" },
  { value: "other", label: "Other" },
];

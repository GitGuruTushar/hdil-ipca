export const slugify = (text) =>
  (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "business";

export const buildIdSlug = (id, name) => `${id}-${slugify(name)}`;

// Mongo ObjectId is always 24 hex chars — parse by position, not delimiter,
// so a renamed listing's stale slug suffix never breaks the lookup.
export const idFromIdSlug = (idSlug) => (idSlug || "").slice(0, 24);

// Shared helpers for the { en, hi, mr } field shape used across SiteContent (and,
// from Milestone 2 onward, Update/Album/Industry/EmergencyContact). Kept framework-
// agnostic (no React) so both admin forms and public pages can import it.

export const LANGS = ["en", "hi", "mr"];

export const emptyLocalized = () => ({ en: "", hi: "", mr: "" });

export const isLocalizedField = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && LANGS.every((l) => typeof v[l] === "string");

// Reads a localized field for the active language, falling back to English (the
// one language every field is expected to have) then to an empty string — used by
// public pages so a missing translation degrades to English rather than blank.
export const pickLang = (field, lang) => {
  if (!isLocalizedField(field)) return typeof field === "string" ? field : "";
  return field[lang] || field.en || "";
};

// Walks an arbitrary SiteContent-shaped value and reports, per language, how many
// localized leaf fields have content vs. are empty — powers the completeness dots
// on the admin editor's language switcher.
export function langCompleteness(value) {
  const totals = { en: 0, hi: 0, mr: 0 };
  const filled = { en: 0, hi: 0, mr: 0 };

  const walk = (node) => {
    if (isLocalizedField(node)) {
      LANGS.forEach((l) => {
        totals[l] += 1;
        if (node[l] && node[l].trim()) filled[l] += 1;
      });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  };

  walk(value);

  return LANGS.reduce((acc, l) => {
    acc[l] = totals[l] === 0 ? "empty" : filled[l] === 0 ? "empty" : filled[l] === totals[l] ? "complete" : "partial";
    return acc;
  }, {});
}

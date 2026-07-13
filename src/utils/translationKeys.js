import en from "@/i18n/translations/en.json";
import hi from "@/i18n/translations/hi.json";
import mr from "@/i18n/translations/mr.json";

// Static import means this runs once per bundle load, not per render — safe
// to call the exports below from a client component's render body.

function lookup(dict, path) {
  const parts = path.split(".");
  let node = dict;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function collectKeys(dict, prefix, out) {
  for (const [k, v] of Object.entries(dict)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(path);
    else if (v && typeof v === "object") collectKeys(v, path, out);
  }
}

// en.json is the canonical key set — hi/mr are assumed to mirror its shape
// (true today since all three were translated together from the same source).
export function getAllTranslationKeys() {
  const out = [];
  collectKeys(en, "", out);
  return out.sort();
}

export function getNamespaces() {
  const set = new Set();
  getAllTranslationKeys().forEach((k) => set.add(k.split(".")[0]));
  return Array.from(set).sort();
}

export function getSubNamespaces(namespace) {
  const set = new Set();
  getAllTranslationKeys()
    .filter((k) => k.startsWith(`${namespace}.`))
    .forEach((k) => {
      const parts = k.split(".");
      if (parts.length >= 2) set.add(`${parts[0]}.${parts[1]}`);
    });
  return Array.from(set).sort();
}

export function buildTranslationRows() {
  return getAllTranslationKeys().map((key) => ({
    key,
    en: lookup(en, key) ?? "",
    hi: lookup(hi, key) ?? "",
    mr: lookup(mr, key) ?? "",
  }));
}

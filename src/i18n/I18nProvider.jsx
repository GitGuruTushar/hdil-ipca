"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import en from "./translations/en.json";
import hi from "./translations/hi.json";
import mr from "./translations/mr.json";

// Static imports keep dictionary lookups synchronous and cheap — no network
// round trip or async state, safe to call `t()` dozens of times per render.
const DICTIONARIES = { en, hi, mr };
const VALID_LANGS = ["en", "hi", "mr"];
const STORAGE_KEY = "hdil-lang";
const DEFAULT_LANG = "en";

const I18nContext = createContext(null);

// Resolves a dot-path (e.g. "admin.dashboard.title") inside a dictionary
// object. Returns undefined (never throws) if any segment is missing.
function lookup(dict, path) {
  if (!dict || !path) return undefined;
  const parts = path.split(".");
  let node = dict;
  for (let i = 0; i < parts.length; i += 1) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[parts[i]];
  }
  return typeof node === "string" ? node : undefined;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);
  // Admin-entered overrides from the Translations screen, keyed "lang:key" —
  // additive over the static JSON dictionaries, fetched once per provider
  // mount. Empty object until the fetch resolves, so t() just falls through
  // to the static dictionaries in the meantime.
  const [overrides, setOverrides] = useState({});

  // Read the persisted preference after mount (localStorage isn't available
  // during SSR). Falls back to the default for absent/invalid values.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LANGS.includes(stored)) {
        setLangState(stored);
      }
    } catch {
      // localStorage can throw in private-browsing / disabled-storage
      // contexts — silently keep the default language.
    }
  }, []);

  useEffect(() => {
    axiosInstance
      .get("/translations")
      .then((res) => {
        const map = {};
        (res.data || []).forEach((o) => {
          map[`${o.lang}:${o.key}`] = o.value;
        });
        setOverrides(map);
      })
      .catch(() => {
        // No overrides yet, or the API is unreachable — static dictionaries
        // still work standalone, so this is safe to ignore.
      });
  }, []);

  const setLang = useCallback((next) => {
    if (!VALID_LANGS.includes(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore write failures (e.g. storage quota, private browsing).
    }
  }, []);

  const t = useCallback(
    (key, fallback) => {
      const overrideActive = overrides[`${lang}:${key}`];
      if (overrideActive !== undefined) return overrideActive;

      const active = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG];
      const activeValue = lookup(active, key);
      if (activeValue !== undefined) return activeValue;

      const overrideEn = overrides[`${DEFAULT_LANG}:${key}`];
      if (overrideEn !== undefined) return overrideEn;

      const enValue = lookup(DICTIONARIES[DEFAULT_LANG], key);
      if (enValue !== undefined) return enValue;

      if (fallback !== undefined) return fallback;
      return key;
    },
    [lang, overrides]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

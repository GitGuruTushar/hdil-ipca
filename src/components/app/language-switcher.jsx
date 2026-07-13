"use client";
import { useI18n } from "@/i18n/I18nProvider";

// Native-script labels — never transliterated, so a Hindi/Marathi reader
// recognizes their language at a glance.
const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

// Compact segmented control meant to sit inline in a header/toolbar next to
// the search bar, notification bell, and avatar — stays on one line even at
// a 375px viewport.
export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-0.5 rounded-full border border-line bg-white p-0.5 flex-none"
    >
      {LANGS.map((item) => {
        const active = item.code === lang;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            aria-pressed={active}
            className={`px-2 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap transition-colors ${
              active ? "bg-gradient-to-br from-madder to-grape text-white" : "text-body"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

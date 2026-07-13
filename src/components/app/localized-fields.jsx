"use client";
import { emptyLocalized, LANGS, langCompleteness } from "@/utils/localizedContent";

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13.5px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors";
const textareaCls =
  "w-full px-3 py-2.5 rounded-xl border border-line bg-white text-[13.5px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors resize-y";

// Bound to a single language of a { en, hi, mr } object at a time — which
// language is "active" is controlled by a ContentLanguageTabs instance
// elsewhere in the same form, so switching language never remounts the field.
// Forwards any other native <input> prop (id, name, aria-*, etc.) via `rest`.
export function LocalizedInput({ value = emptyLocalized(), lang, onChange, placeholder, className, maxLength, required, ...rest }) {
  return (
    <input
      value={value[lang] ?? ""}
      onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
      placeholder={placeholder}
      maxLength={maxLength}
      required={required && lang === "en"}
      className={className || inputCls}
      {...rest}
    />
  );
}

export function LocalizedTextarea({ value = emptyLocalized(), lang, onChange, placeholder, rows = 3, className, ...rest }) {
  return (
    <textarea
      value={value[lang] ?? ""}
      onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
      placeholder={placeholder}
      rows={rows}
      className={className || textareaCls}
      {...rest}
    />
  );
}

const LANG_LABEL = { en: "EN", hi: "HI", mr: "MR" };
const DOT_CLASS = { complete: "bg-ok", partial: "bg-amber-500", empty: "bg-line" };

// Compact language switcher for a single record's edit form (dialog or inline
// row), as opposed to the page-level switcher used by the Site Content editor.
// `completenessValue` is whatever localized object(s) the form is editing —
// pass a single field or a small object bundling several for a combined dot.
export function ContentLanguageTabs({ lang, onChange, completenessValue }) {
  const completeness = completenessValue ? langCompleteness(completenessValue) : null;
  return (
    <div className="flex items-center gap-1.5">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            lang === l ? "border-madder text-madder bg-madder/5" : "border-line text-body bg-white"
          }`}
        >
          {completeness && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[completeness[l]]}`} />}
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

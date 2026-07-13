"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// Unlimited free-text tags — used for the search-keywords fields on business
// listings, updates, vacancies, and gallery albums.
export default function ChipInput({ value = [], onChange, placeholder }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const resolvedPlaceholder = placeholder ?? t("shared.forms.chipInput.placeholder", "Add a keyword and press Enter…");

  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-line bg-white">
      {value.map((kw, i) => (
        <span key={kw + i} className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2.5 pr-1.5 py-1 rounded-full bg-[#E5E3FB] text-[#4338CA]">
          {kw}
          <button type="button" onClick={() => remove(i)} aria-label={`${t("shared.forms.chipInput.removeLabel", "Remove")} ${kw}`} className="opacity-60 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
          if (e.key === "Backspace" && !draft && value.length) remove(value.length - 1);
        }}
        onBlur={add}
        placeholder={value.length ? t("shared.forms.chipInput.addAnotherPlaceholder", "Add another…") : resolvedPlaceholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[12.5px] py-1"
      />
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Newspaper, Briefcase, Image as ImageIcon, Phone } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";

const ADMIN_TYPE_META = {
  business: { label: "Business", key: "typeBusiness", icon: Building2, href: (id) => `/admin/industries?highlight=${id}` },
  news: { label: "News", key: "typeNews", icon: Newspaper, href: (id) => `/admin/updates?highlight=${id}` },
  vacancy: { label: "Vacancy", key: "typeVacancy", icon: Briefcase, href: (id) => `/admin/vacancies?highlight=${id}` },
  gallery: { label: "Gallery", key: "gallery", icon: ImageIcon, href: (id) => `/admin/gallery?highlight=${id}` },
  emergency: { label: "Emergency", key: "typeEmergency", icon: Phone, href: (id) => `/admin/emergency?highlight=${id}` },
};

// Public mode links into the real public pages instead of admin screens —
// no per-item detail routes exist yet for news/gallery, so those land on the
// list page rather than a highlighted single record.
const PUBLIC_TYPE_META = {
  business: { label: "Business", key: "typeBusiness", icon: Building2, href: (id) => `/directory?highlight=${id}` },
  news: { label: "News", key: "typeNews", icon: Newspaper, href: () => `/updates` },
  vacancy: { label: "Vacancy", key: "typeVacancy", icon: Briefcase, href: () => `/vacancies` },
  gallery: { label: "Gallery", key: "gallery", icon: ImageIcon, href: () => `/gallery` },
  emergency: { label: "Emergency", key: "typeEmergency", icon: Phone, href: () => `/helpline` },
};

// Present everywhere in the app shell (and, in public mode, the marketing
// navbar) — search-as-you-type against the real search index from the very
// first character, plus a Cmd/Ctrl+K shortcut since that's the first place
// an experienced user's hand goes to find something fast.
export default function SearchBar({ mode = "admin" }) {
  const TYPE_META = mode === "public" ? PUBLIC_TYPE_META : ADMIN_TYPE_META;
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      axiosInstance
        .get("/search", { params: { q } })
        .then((res) => setResults(res.data.results || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-md">
      <div className="flex items-center gap-2 h-9 rounded-full border border-line bg-white px-3.5">
        <Search className="h-3.5 w-3.5 text-body/70 flex-none" strokeWidth={2} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("shared.nav.searchPlaceholder", "Search everything…")}
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-ink placeholder:text-body/60"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-body/60 border border-line rounded px-1.5 py-0.5">
          {t("shared.nav.searchShortcutHint", "⌘K")}
        </kbd>
      </div>

      {open && query.trim() && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 app-glass glass-shadow rounded-2xl p-1.5 z-30 max-h-96 overflow-y-auto">
          {loading && <div className="px-3 py-2.5 text-xs text-body">{t("shared.nav.searching", "Searching…")}</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-body">
              {t("shared.nav.noMatchesPrefix", "No matches for “")}
              {query}
              {t("shared.nav.noMatchesSuffix", "”.")}
            </div>
          )}
          {!loading &&
            // Grouped by result type (business/news/vacancy/gallery/emergency) rather than
            // a flat interleaved list, so results in the same category cluster together —
            // each group carries its own category subtitle line (e.g. business type) too.
            Object.entries(
              results.reduce((groups, r) => {
                (groups[r.type] = groups[r.type] || []).push(r);
                return groups;
              }, {})
            ).map(([type, items]) => {
              const meta = TYPE_META[type] || { label: type, icon: Search };
              const Icon = meta.icon;
              return (
                <div key={type} className="mb-1 last:mb-0">
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-body/60">
                    {meta.key ? t(`shared.nav.${meta.key}`, meta.label) : meta.label}
                  </div>
                  {items.map((r, i) => (
                    <button
                      key={type + r.id + i}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(meta.href(r.id));
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-ivory text-left"
                    >
                      <Icon className="h-3.5 w-3.5 text-body/70 flex-none" strokeWidth={2} />
                      <span className="text-[12.5px] font-semibold text-ink truncate">{r.title}</span>
                      {r.subtitle && (
                        <span className="ml-auto text-[10.5px] font-semibold text-madder bg-madder/8 rounded-full px-2 py-0.5 flex-none truncate max-w-[9rem]">
                          {r.subtitle}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

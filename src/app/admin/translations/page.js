"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Search } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { buildTranslationRows, getNamespaces, getSubNamespaces } from "@/utils/translationKeys";

const LANGS = ["en", "hi", "mr"];
const LANG_LABEL = { en: "English", hi: "हिंदी", mr: "मराठी" };
// 1,068 keys total — never render them all at once (per the approved plan);
// require a search/namespace filter first and cap what actually hits the DOM.
const RENDER_CAP = 150;

// Built once at module load from the static JSON dictionaries — this list
// never changes at runtime, only the DB overrides layered on top of it do.
const ALL_ROWS = buildTranslationRows();
const NAMESPACES = getNamespaces();

function TranslationCell({ rowKey, lang, value, overridden, onSave, onRevert }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(value), [value]);

  const commit = async () => {
    if (draft === value) return;
    if (!draft.trim()) {
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(lang, rowKey, draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative group rounded-lg border ${overridden ? "border-madder/40 bg-madder/5" : "border-line bg-white"}`}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-full h-9 px-2.5 pr-7 rounded-lg bg-transparent text-[12.5px] text-ink outline-none"
      />
      {saving && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-madder" />}
      {!saving && overridden && (
        <button
          type="button"
          onClick={() => onRevert(lang, rowKey)}
          title="Revert to default"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-madder opacity-0 group-hover:opacity-100 hover:bg-madder/10 transition-opacity"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function TranslationsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [namespace, setNamespace] = useState("");
  const [subNamespace, setSubNamespace] = useState("");
  const [search, setSearch] = useState("");

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
      .catch((err) => {
        toast({ title: apiErrorMessage(err, t("admin.website.translations.toast.loadFailed", "Couldn't load translation overrides")), variant: "destructive" });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subNamespaces = useMemo(() => (namespace ? getSubNamespaces(namespace) : []), [namespace]);

  const filtered = useMemo(() => {
    if (!namespace && !search.trim()) return [];
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter((row) => {
      if (namespace && row.key !== namespace && !row.key.startsWith(`${namespace}.`)) return false;
      if (subNamespace && !row.key.startsWith(`${subNamespace}.`)) return false;
      if (!q) return true;
      return row.key.toLowerCase().includes(q) || row.en.toLowerCase().includes(q) || row.hi.includes(search.trim()) || row.mr.includes(search.trim());
    });
  }, [namespace, subNamespace, search]);

  const visible = filtered.slice(0, RENDER_CAP);
  const hiddenCount = filtered.length - visible.length;

  const handleSave = useCallback(
    async (lang, key, value) => {
      try {
        await axiosInstance.put("/translations", { lang, key, value });
        setOverrides((prev) => ({ ...prev, [`${lang}:${key}`]: value }));
      } catch (err) {
        toast({ title: apiErrorMessage(err, t("admin.website.translations.toast.saveFailed", "Couldn't save translation")), variant: "destructive" });
      }
    },
    [t, toast]
  );

  const handleRevert = useCallback(
    async (lang, key) => {
      try {
        await axiosInstance.delete(`/translations/${lang}/${encodeURIComponent(key)}`);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[`${lang}:${key}`];
          return next;
        });
      } catch (err) {
        toast({ title: apiErrorMessage(err, t("admin.website.translations.toast.revertFailed", "Couldn't revert translation")), variant: "destructive" });
      }
    },
    [t, toast]
  );

  return (
    <div>
      <PageHeader
        title={t("admin.website.translations.title", "Translations")}
        description={t("admin.website.translations.description", `${ALL_ROWS.length} keys across English, Hindi and Marathi — search or pick a namespace to edit.`)}
      />

      <div className="app-glass rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-body/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.website.translations.searchPlaceholder", "Search keys or text…")}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
          />
        </div>
        <select
          value={namespace}
          onChange={(e) => {
            setNamespace(e.target.value);
            setSubNamespace("");
          }}
          className="h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink"
        >
          <option value="">{t("admin.website.translations.allNamespaces", "All namespaces")}</option>
          {NAMESPACES.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
        {namespace && subNamespaces.length > 0 && (
          <select value={subNamespace} onChange={(e) => setSubNamespace(e.target.value)} className="h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink">
            <option value="">{t("admin.website.translations.allSections", "All sections")}</option>
            {subNamespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="app-glass glass-shadow rounded-2xl flex items-center justify-center gap-3 p-16 text-sm text-body">
          <Loader2 className="h-5 w-5 animate-spin text-madder" />
          {t("admin.website.translations.loading", "Loading…")}
        </div>
      ) : !namespace && !search.trim() ? (
        <div className="app-glass glass-shadow rounded-2xl flex flex-col items-center justify-center gap-2 p-16 text-center">
          <Search className="h-6 w-6 text-body/40" />
          <p className="text-sm text-body">{t("admin.website.translations.emptyPrompt", "Search for a key or phrase, or pick a namespace above, to start editing.")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-glass glass-shadow rounded-2xl flex items-center justify-center p-16 text-sm text-body">{t("admin.website.translations.noResults", "No matching keys.")}</div>
      ) : (
        <>
          <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[180px_1fr_1fr_1fr] gap-2 px-4 py-2.5 border-b border-line bg-white/50 text-[11px] font-bold uppercase tracking-wide text-body/60">
              <span>{t("admin.website.translations.key", "Key")}</span>
              {LANGS.map((l) => (
                <span key={l}>{LANG_LABEL[l]}</span>
              ))}
            </div>
            <div className="divide-y divide-line">
              {visible.map((row) => (
                <div key={row.key} className="grid grid-cols-[180px_1fr_1fr_1fr] gap-2 px-4 py-2.5 items-center">
                  <span className="text-[11px] font-mono text-body/70 truncate" title={row.key}>
                    {row.key}
                  </span>
                  {LANGS.map((lang) => (
                    <TranslationCell
                      key={lang}
                      rowKey={row.key}
                      lang={lang}
                      value={overrides[`${lang}:${row.key}`] ?? row[lang]}
                      overridden={overrides[`${lang}:${row.key}`] !== undefined}
                      onSave={handleSave}
                      onRevert={handleRevert}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {hiddenCount > 0 && (
            <p className="text-[12px] text-body/60 text-center mt-3">
              {t("admin.website.translations.hiddenCount", `${hiddenCount} more match — narrow your search to see them.`)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

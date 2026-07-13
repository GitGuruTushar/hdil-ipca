"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { LANGS, langCompleteness } from "@/utils/localizedContent";
import HomeTab from "./home-tab";
import AboutTab from "./about-tab";
import ContactTab from "./contact-tab";
import HeroOnlyTab from "./hero-only-tab";

const PAGES = ["home", "about", "contact", "gallery", "updates", "helpline"];
const HERO_ONLY_PAGES = ["gallery", "updates", "helpline"];
const LANG_LABEL = { en: "EN", hi: "HI", mr: "MR" };
const DOT_CLASS = { complete: "bg-ok", partial: "bg-amber-500", empty: "bg-line" };

export default function SiteContentPage() {
  const { t, lang: uiLang } = useI18n();
  const { toast } = useToast();

  const [activePage, setActivePage] = useState("home");
  const [activeLang, setActiveLang] = useState(uiLang || "en");
  const [pagesData, setPagesData] = useState({});
  const [loadingPage, setLoadingPage] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    (page) => {
      setLoadingPage(page);
      axiosInstance
        .get(`/site-content/${page}`)
        .then((res) => {
          setPagesData((prev) => ({ ...prev, [page]: res.data?.data || {} }));
        })
        .catch((err) => {
          if (err?.response?.status === 404) {
            setPagesData((prev) => ({ ...prev, [page]: {} }));
            return;
          }
          toast({ title: apiErrorMessage(err, t("admin.website.siteContent.toast.loadFailed", "Couldn't load site content")), variant: "destructive" });
        })
        .finally(() => setLoadingPage(null));
    },
    [t, toast]
  );

  useEffect(() => {
    if (!(activePage in pagesData)) load(activePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  const data = pagesData[activePage];

  const handleChange = (next) => {
    setPagesData((prev) => ({ ...prev, [activePage]: next }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`/site-content/${activePage}`, { data: data || {} });
      toast({ title: t("admin.website.siteContent.toast.saved", "Site content saved") });
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.website.siteContent.toast.saveFailed", "Couldn't save site content")), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const completeness = data ? langCompleteness(data) : null;

  return (
    <div>
      <PageHeader
        title={t("admin.website.siteContent.title", "Site content")}
        description={t("admin.website.siteContent.description", "Changes go live on the public site immediately after saving.")}
        action={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingPage === activePage}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? t("admin.website.siteContent.saving", "Saving…") : t("admin.website.siteContent.save", "Save changes")}
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        {PAGES.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setActivePage(page)}
            className={`text-[13px] font-semibold px-4 py-1.5 rounded-full transition-colors ${
              activePage === page ? "bg-ink text-white" : "text-body hover:bg-white border border-line"
            }`}
          >
            {t(`admin.website.siteContent.pages.${page}`, page[0].toUpperCase() + page.slice(1))}
          </button>
        ))}
      </div>

      <div className="app-glass rounded-2xl flex items-center justify-between px-4 py-2.5 mb-4">
        <span className="text-[12px] text-body">
          {t("admin.website.siteContent.editingLanguage", "Editing language")}{" "}
          <span className="text-ink font-semibold">— {t(`shared.languages.${activeLang}`, activeLang.toUpperCase())}</span>
        </span>
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setActiveLang(l)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                activeLang === l ? "border-madder text-madder bg-madder/5" : "border-line text-body bg-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${completeness ? DOT_CLASS[completeness[l]] : "bg-line"}`} />
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {loadingPage === activePage && !data ? (
        <div className="app-glass glass-shadow rounded-2xl flex items-center justify-center gap-3 p-16 text-sm text-body">
          <Loader2 className="h-5 w-5 animate-spin text-madder" />
          {t("admin.website.siteContent.loading", "Loading…")}
        </div>
      ) : (
        <>
          {activePage === "home" && <HomeTab data={data} lang={activeLang} onChange={handleChange} />}
          {activePage === "about" && <AboutTab data={data} lang={activeLang} onChange={handleChange} />}
          {activePage === "contact" && <ContactTab data={data} lang={activeLang} onChange={handleChange} />}
          {HERO_ONLY_PAGES.includes(activePage) && <HeroOnlyTab data={data} lang={activeLang} onChange={handleChange} />}
        </>
      )}
    </div>
  );
}

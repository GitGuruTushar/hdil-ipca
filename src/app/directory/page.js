"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, AlertTriangle, X, Search, ArrowRight } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { pickLang } from "@/utils/localizedContent";
import { buildIdSlug } from "@/utils/slugify";
import { PageHero } from "@/components/site/ui";
import { Stagger, Item } from "@/components/site/motion";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import { useI18n } from "@/i18n/I18nProvider";
import { tel, hasBusinessHours, BusinessHoursList, hasSocialLinks, SocialLinksList } from "@/components/site/business-display-helpers";
import { BusinessDetailView } from "@/components/site/business-detail-view";

const LIMIT = 12;

function BusinessCard({ industry, lang, onOpen }) {
  const { t } = useI18n();
  const image = industry.images?.[0];
  return (
    <button
      type="button"
      onClick={() => onOpen(industry)}
      className="group glass glass-shadow hover-lift block h-full w-full rounded-[1.5rem] p-3 text-left"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-ivory">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-8 w-8 text-body/40" strokeWidth={1.5} />
          </div>
        )}
        {industry.verified && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ok">
            <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
            {t("directory.verifiedBadge", "Verified")}
          </span>
        )}
      </div>
      <div className="px-2 pb-1 pt-3.5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-madder truncate">
          {pickLang(industry.businessType, lang)}
        </p>
        <h3 className="mt-1.5 font-display text-[15px] font-bold leading-snug text-ink">{pickLang(industry.name, lang)}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-body line-clamp-2">{pickLang(industry.description, lang)}</p>
        <p className="mt-2.5 text-[11px] font-semibold text-body/70">
          {t("directory.buildingPrefix", "Bldg")} {industry.buildingNumber} &middot; {t("directory.galaPrefix", "Gala")} {industry.galaNumber}
        </p>
      </div>
    </button>
  );
}

function DetailModal({ industry, lang, onClose, onViewFullPage }) {
  const { t } = useI18n();

  useEffect(() => {
    if (!industry) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [industry]);

  if (!industry) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/50 px-4 py-16 md:py-24"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-lenis-prevent
        className="glass glass-shadow max-h-[calc(100vh-8rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white/95 p-6 md:max-h-[calc(100vh-12rem)] md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-madder">{pickLang(industry.businessType, lang)}</p>
            <h2 className="mt-1.5 font-display text-2xl font-bold leading-tight text-ink">{pickLang(industry.name, lang)}</h2>
            {industry.verified && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                {t("directory.verifiedBadge", "Verified")}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("directory.closeAriaLabel", "Close")}
            className="tap-shrink flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line bg-white"
          >
            <X size={16} />
          </button>
        </div>

        {industry.images?.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {industry.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-24 w-24 flex-none rounded-xl object-cover" />
            ))}
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-body">{pickLang(industry.description, lang)}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-[12.5px]">
          <div className="rounded-xl bg-ivory p-3">
            <p className="font-bold text-ink">{t("directory.buildingLabel", "Building")}</p>
            <p className="text-body">{industry.buildingNumber}</p>
          </div>
          <div className="rounded-xl bg-ivory p-3">
            <p className="font-bold text-ink">{t("directory.galaLabel", "Gala")}</p>
            <p className="text-body">{industry.galaNumber}</p>
          </div>
        </div>

        {industry.materials?.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1.5">{t("directory.materialsLabel", "Materials")}</p>
            <div className="flex flex-wrap gap-1.5">
              {industry.materials.map((m, i) => (
                <span key={m + i} className="rounded-full bg-[#E5E3FB] px-2.5 py-1 text-[11px] font-semibold text-[#4338CA]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {industry.keywords?.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1.5">{t("directory.keywordsLabel", "Keywords")}</p>
            <div className="flex flex-wrap gap-1.5">
              {industry.keywords.map((k, i) => (
                <span key={k + i} className="rounded-full bg-[#E5E3FB] px-2.5 py-1 text-[11px] font-semibold text-[#4338CA]">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {industry.products?.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-2">{t("directory.productsLabel", "Products")}</p>
            <div className="space-y-2">
              {industry.products.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-ivory p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{pickLang(p.name, lang)}</p>
                    {pickLang(p.description, lang) && <p className="truncate text-[11.5px] text-body">{pickLang(p.description, lang)}</p>}
                  </div>
                  {p.price != null && <p className="flex-none text-[13px] font-bold text-ink">₹{Number(p.price).toLocaleString("en-IN")}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBusinessHours(industry.businessHours) && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1.5">{t("directory.hoursLabel", "Business hours")}</p>
            <BusinessHoursList businessHours={industry.businessHours} compact />
          </div>
        )}

        {hasSocialLinks(industry.socialLinks) && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1.5">{t("directory.socialLabel", "Website & social")}</p>
            <SocialLinksList socialLinks={industry.socialLinks} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <a
            href={tel(industry.contactNumber)}
            className="tap-shrink inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-madder to-grape px-5 text-[13px] font-bold text-white"
          >
            {t("directory.callButton", "Call")} {industry.contactNumber}
          </a>
          <button
            type="button"
            onClick={() => onViewFullPage(industry)}
            className="tap-shrink inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-5 text-[13px] font-bold text-ink"
          >
            {t("directory.viewFullPageButton", "View full page")} <ArrowRight size={14} />
          </button>
          <span className="text-[11.5px] text-body/70">
            {t("directory.gstLabel", "GST:")} {industry.gstInfo}
          </span>
        </div>
      </div>
    </div>
  );
}

function DirectoryContent() {
  const { t } = useI18n();
  const router = useRouter();
  const [lang] = useState("en"); // public language switcher lands in Milestone 4

  const [viewId, setViewId] = useState(undefined); // undefined = not yet read from URL, null = grid mode, string = detail mode

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [industries, setIndustries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [selected, setSelected] = useState(null);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  // Reads ?id= (full-page view) and ?highlight= (open the quick-view popup,
  // e.g. arriving from the site search bar) once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setViewId(params.get("id") || null);

    const highlightId = params.get("highlight");
    if (highlightId) {
      axiosInstance
        .get(`/industries/${highlightId}`)
        .then((res) => setSelected(res.data))
        .catch(() => {});
    }
  }, []);

  const backToGrid = () => {
    setViewId(null);
    window.history.pushState(null, "", "/directory");
  };

  const viewFullPage = (industry) => {
    setSelected(null);
    router.push(`/directory/${buildIdSlug(industry._id, industry.name?.en)}`);
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [qInput]);

  const load = useCallback(() => {
    setStatus("loading");
    const params = { page, limit: LIMIT };
    if (q) params.q = q;
    axiosInstance
      .get("/industries", { params })
      .then((res) => {
        setIndustries(res.data.industries || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(apiErrorMessage(err, "Couldn't load the directory"));
        setStatus("error");
      });
  }, [page, q]);

  useEffect(() => {
    if (viewId === null) load();
  }, [load, viewId]);

  if (viewId === undefined) return null; // avoids a grid flash before the URL has been read

  if (viewId) return <BusinessDetailView idSlug={viewId} onBack={backToGrid} />;

  return (
    <>
      <PageHero
        eyebrow={t("directory.hero.eyebrow", "Business directory")}
        titleLead={t("directory.hero.titleLead", "Every business,")}
        titleEm={t("directory.hero.titleEm", "one search away.")}
        sub={t("directory.hero.sub", "Search the entire federation — no login required.")}
      />

      <div className="mx-auto max-w-site px-5 pb-24 md:px-8 md:pb-36">
        <div className="glass glass-shadow mt-8 flex items-center gap-2.5 rounded-full px-5 py-3.5 md:mt-10">
          <Search className="h-4 w-4 flex-none text-body/70" strokeWidth={2} />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("directory.searchPlaceholder", "Search by name, type, product, or material…")}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-body/50"
          />
        </div>

        {status === "loading" && (
          <div className="glass glass-shadow mt-8 flex flex-col items-center justify-center gap-3 rounded-[1.75rem] p-16 text-sm text-body">
            <Loader2 className="h-5 w-5 animate-spin text-madder" />
            {t("directory.loading", "Loading the directory…")}
          </div>
        )}

        {status === "error" && (
          <div className="glass glass-shadow mt-8 flex flex-col items-center justify-center gap-3 rounded-[1.75rem] p-16 text-sm text-body">
            <AlertTriangle className="h-5 w-5 text-alarm" />
            {errorMsg}
          </div>
        )}

        {status === "ready" && industries.length === 0 && (
          <div className="glass glass-shadow mt-8 rounded-[1.75rem]">
            <EmptyState
              icon={Building2}
              title={q ? t("directory.emptyState.filteredTitle", "No businesses match your search") : t("directory.emptyState.title", "No businesses listed yet")}
              description={
                q
                  ? t("directory.emptyState.filteredDescription", "Try a different search term.")
                  : t("directory.emptyState.description", "Members can list their business from the member dashboard.")
              }
            />
          </div>
        )}

        {status === "ready" && industries.length > 0 && (
          <>
            <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map((industry) => (
                <Item key={industry._id}>
                  <BusinessCard industry={industry} lang={lang} onOpen={setSelected} />
                </Item>
              ))}
            </Stagger>
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </div>

      <DetailModal industry={selected} lang={lang} onClose={() => setSelected(null)} onViewFullPage={viewFullPage} />
    </>
  );
}

export default function DirectoryPage() {
  return <DirectoryContent />;
}

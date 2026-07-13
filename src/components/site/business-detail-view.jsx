"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { pickLang } from "@/utils/localizedContent";
import { idFromIdSlug } from "@/utils/slugify";
import EmptyState from "@/components/app/empty-state";
import { useI18n } from "@/i18n/I18nProvider";
import { tel, hasBusinessHours, BusinessHoursList, hasSocialLinks, SocialLinksList } from "@/components/site/business-display-helpers";

// Full-page single-business view. Reached either via the static
// /directory/[idSlug] route (pre-rendered per listing at build time) or via
// /directory?id=<industryId> (the always-works fallback for a listing not
// yet in a build — see not-found.js). idSlug is parsed by its leading
// 24-hex-char ObjectId, so both callers can pass either shape.
export function BusinessDetailView({ idSlug, onBack }) {
  const { t } = useI18n();
  const router = useRouter();
  const id = idFromIdSlug(idSlug);
  const [status, setStatus] = useState("loading"); // loading | ready | notFound | error
  const [industry, setIndustry] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleBack = onBack || (() => router.push("/directory"));

  useEffect(() => {
    setStatus("loading");
    axiosInstance
      .get(`/industries/${id}`)
      .then((res) => {
        setIndustry(res.data);
        setStatus("ready");
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setStatus("notFound");
          return;
        }
        setErrorMsg(apiErrorMessage(err, "Couldn't load this business"));
        setStatus("error");
      });
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-36">
      <button type="button" onClick={handleBack} className="link-wipe inline-flex items-center gap-1.5 text-sm font-semibold text-madder">
        <ArrowLeft size={15} /> {t("directory.backToDirectory", "Back to directory")}
      </button>

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

      {status === "notFound" && (
        <div className="glass glass-shadow mt-8 rounded-[1.75rem]">
          <EmptyState
            icon={Sparkles}
            title={t("directory.detail.notFoundTitle", "This listing isn't available")}
            description={t("directory.detail.notFoundDescription", "It may have been removed. Try browsing the directory instead.")}
            action={
              <button
                type="button"
                onClick={handleBack}
                className="h-9 rounded-full bg-gradient-to-r from-madder to-grape px-4 text-[13px] font-bold text-white inline-flex items-center"
              >
                {t("directory.backToDirectory", "Back to directory")}
              </button>
            }
          />
        </div>
      )}

      {status === "ready" && industry && (
        <div className="glass glass-shadow mt-6 rounded-[1.75rem] p-6 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-madder">{pickLang(industry.businessType, "en")}</p>
          <h1 className="mt-2 font-display text-[clamp(1.7rem,4vw,2.4rem)] font-bold leading-tight tracking-[-0.015em] text-ink">
            {pickLang(industry.name, "en")}
          </h1>
          {(industry.verified || industry.foundedYear) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {industry.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {t("directory.verifiedBadge", "Verified")}
                </span>
              )}
              {industry.foundedYear && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ivory px-2.5 py-1 text-[11px] font-bold text-body">
                  {t("directory.foundedBadge", "Est.")} {industry.foundedYear}
                </span>
              )}
            </div>
          )}

          {industry.images?.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {industry.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex aspect-[3/1] w-full items-center justify-center rounded-xl bg-ivory">
              <Building2 className="h-10 w-10 text-body/40" strokeWidth={1.5} />
            </div>
          )}

          <p className="mt-6 text-base leading-relaxed text-body">{pickLang(industry.description, "en")}</p>

          {pickLang(industry.aboutUs, "en") && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-body/70">{t("directory.aboutUsLabel", "About us")}</p>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-body">{pickLang(industry.aboutUs, "en")}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            <div className="rounded-xl bg-ivory p-3.5">
              <p className="font-bold text-ink">{t("directory.buildingLabel", "Building")}</p>
              <p className="text-body">{industry.buildingNumber}</p>
            </div>
            <div className="rounded-xl bg-ivory p-3.5">
              <p className="font-bold text-ink">{t("directory.galaLabel", "Gala")}</p>
              <p className="text-body">{industry.galaNumber}</p>
            </div>
            <div className="rounded-xl bg-ivory p-3.5 col-span-2 sm:col-span-1">
              <p className="font-bold text-ink">{t("directory.occupancyLabel", "Occupancy")}</p>
              <p className="text-body capitalize">{industry.occupancyType}</p>
            </div>
            <div className="rounded-xl bg-ivory p-3.5 col-span-2 sm:col-span-1">
              <p className="font-bold text-ink">{t("directory.gstLabel", "GST:")}</p>
              <p className="truncate text-body">{industry.gstInfo}</p>
            </div>
          </div>

          {industry.materials?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-body/70">{t("directory.materialsLabel", "Materials")}</p>
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
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-body/70">{t("directory.keywordsLabel", "Keywords")}</p>
              <div className="flex flex-wrap gap-1.5">
                {industry.keywords.map((k, i) => (
                  <span key={k + i} className="rounded-full bg-[#E5E3FB] px-2.5 py-1 text-[11px] font-semibold text-[#4338CA]">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasBusinessHours(industry.businessHours) && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-body/70">{t("directory.hoursLabel", "Business hours")}</p>
              <BusinessHoursList businessHours={industry.businessHours} />
            </div>
          )}

          {hasSocialLinks(industry.socialLinks) && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-body/70">{t("directory.socialLabel", "Website & social")}</p>
              <SocialLinksList socialLinks={industry.socialLinks} />
            </div>
          )}

          {industry.products?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-body/70">{t("directory.productsLabel", "Products")}</p>
              <div className="space-y-2.5">
                {industry.products.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-ivory p-3.5">
                    {p.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-14 w-14 flex-none rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{pickLang(p.name, "en")}</p>
                      {pickLang(p.description, "en") && <p className="text-[12.5px] text-body">{pickLang(p.description, "en")}</p>}
                    </div>
                    {p.price != null && <p className="flex-none text-[14px] font-bold text-ink">₹{Number(p.price).toLocaleString("en-IN")}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-line pt-6">
            <a
              href={tel(industry.contactNumber)}
              className="tap-shrink inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-madder to-grape px-6 text-[13.5px] font-bold text-white shadow-lg shadow-madder/25"
            >
              {t("directory.callButton", "Call")} {industry.contactNumber}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

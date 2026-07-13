"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Newspaper, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { pickLang } from "@/utils/localizedContent";
import { EASE_EXPO, Stagger, Item, ZoomFrame } from "@/components/site/motion";
import { useI18n } from "@/i18n/I18nProvider";

const CATEGORY_LABELS = { maintenance: "Maintenance", events: "Events", achievements: "Achievements", general: "General" };

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const excerptFromHtml = (html, maxLength = 160) => {
  const text = (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

// Defensive normalization in case any pre-existing DB row still lacks a protocol
// (saved before the backend started normalizing redirectUrl on save) — without
// this, window.open("facebook.com") resolves relative to this site's own domain
// instead of opening the external page.
const normalizeExternalUrl = (raw) => {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

function Thumb({ src, alt, sizes, className }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-ivory ${className}`}>
        <Newspaper className="h-8 w-8 text-body/40" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <ZoomFrame className={className}>
      <Image src={src} alt={alt || ""} fill sizes={sizes} className="object-cover" />
    </ZoomFrame>
  );
}

export default function NewsExplorer() {
  const { lang: LANG } = useI18n();
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [category, setCategory] = useState("All");
  const [openItem, setOpenItem] = useState(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    setStatus("loading");
    axiosInstance
      .get("/updates")
      .then((res) => {
        setItems(res.data || []);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(apiErrorMessage(err, "Couldn't load updates"));
        setStatus("error");
      });
  }, []);

  const categories = ["All", ...Object.keys(CATEGORY_LABELS).filter((c) => items.some((n) => n.category === c))];
  const filtered = category === "All" ? items : items.filter((n) => n.category === category);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  useEffect(() => {
    if (!openItem) return;
    const onKey = (e) => e.key === "Escape" && setOpenItem(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openItem]);

  const openArticle = (n) => {
    if (n.type === "blogs" && n.redirectUrl) {
      window.open(normalizeExternalUrl(n.redirectUrl), "_blank", "noopener,noreferrer");
      return;
    }
    setOpenItem(n);
  };

  return (
    <div className="mx-auto max-w-site px-5 pb-20 md:px-8 md:pb-28">
      {status === "loading" && (
        <div className="glass glass-shadow mt-10 flex flex-col items-center justify-center gap-3 rounded-[1.75rem] p-16 text-sm text-body">
          <Loader2 className="h-5 w-5 animate-spin text-madder" />
          Loading updates…
        </div>
      )}

      {status === "error" && (
        <div className="glass glass-shadow mt-10 flex flex-col items-center justify-center gap-3 rounded-[1.75rem] p-16 text-sm text-body">
          <AlertTriangle className="h-5 w-5 text-alarm" />
          {errorMsg}
        </div>
      )}

      {status === "ready" && (
        <>
          {categories.length > 1 && (
            <div className="mt-10 flex flex-wrap gap-2.5 md:mt-12" role="tablist" aria-label="Filter updates by category">
              {categories.map((c) => {
                const active = c === category;
                return (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(c)}
                    className={`tap-shrink min-h-11 rounded-full px-5 text-xs font-bold transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-madder to-grape text-white shadow-lg shadow-madder/25"
                        : "glass-soft text-body [@media(hover:hover)]:hover:text-ink"
                    }`}
                  >
                    {c === "All" ? "All" : CATEGORY_LABELS[c]}
                  </button>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={category}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE_EXPO }}
            >
              {featured ? (
                <>
                  <button
                    onClick={() => openArticle(featured)}
                    className="group glass glass-shadow hover-lift mt-8 grid w-full gap-6 rounded-[1.75rem] p-3 text-left md:mt-10 md:grid-cols-12 md:p-4"
                  >
                    <Thumb
                      src={featured.images?.[0]}
                      sizes="(min-width: 768px) 66vw, 100vw"
                      className="relative aspect-[16/9] overflow-hidden rounded-[1.15rem] md:col-span-8"
                    />
                    <div className="px-3 pb-3 md:col-span-4 md:self-center md:px-2">
                      <p className="flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                        <span className="text-madder">{CATEGORY_LABELS[featured.category] || featured.category}</span>
                        <span className="text-body/70">{fmtDate(featured.createdAt)}</span>
                      </p>
                      <h2 className="mt-3 font-display text-xl font-bold leading-snug text-ink md:text-2xl">
                        {pickLang(featured.title, LANG)}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-body">{excerptFromHtml(pickLang(featured.content, LANG))}</p>
                      <span className="link-wipe mt-4 inline-block text-sm font-semibold text-madder">
                        {featured.type === "blogs" ? "Read on the blog" : "Read update"} <span aria-hidden>→</span>
                      </span>
                    </div>
                  </button>

                  <Stagger className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((n) => (
                      <Item key={n._id}>
                        <button
                          onClick={() => openArticle(n)}
                          className="group glass glass-shadow hover-lift block h-full w-full rounded-[1.5rem] p-3 text-left"
                        >
                          <Thumb
                            src={n.images?.[0]}
                            sizes="(min-width: 640px) 33vw, 100vw"
                            className="relative aspect-[16/10] overflow-hidden rounded-[1rem]"
                          />
                          <div className="px-2 pb-2 pt-4">
                            <p className="flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                              <span className="text-madder">{CATEGORY_LABELS[n.category] || n.category}</span>
                              <span className="text-body/70">{fmtDate(n.createdAt)}</span>
                            </p>
                            <h3 className="mt-2 font-display text-[15px] font-bold leading-snug text-ink md:text-base">
                              {pickLang(n.title, LANG)}
                            </h3>
                          </div>
                        </button>
                      </Item>
                    ))}
                  </Stagger>
                </>
              ) : (
                <p className="py-14 text-body">No updates in this category yet.</p>
              )}
            </motion.div>
          </AnimatePresence>

          <p className="mt-12 text-center text-xs font-semibold text-body/70">Updates are posted by the federation office.</p>
        </>
      )}

      {/* Reading overlay */}
      <AnimatePresence>
        {openItem && (
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: "rgba(238,242,247,0.98)" }}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: EASE_EXPO }}
            role="dialog"
            aria-modal="true"
            aria-label={pickLang(openItem.title, LANG)}
          >
            <button
              onClick={() => setOpenItem(null)}
              aria-label="Close"
              className="tap-shrink glass glass-shadow fixed right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-200 md:right-8 md:top-8 [@media(hover:hover)]:hover:bg-ink [@media(hover:hover)]:hover:text-white"
            >
              <X size={18} />
            </button>
            <div data-lenis-prevent className="h-full overflow-y-auto">
              <div className="mx-auto max-w-3xl px-5 py-24 md:px-8 md:py-28">
                <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em]">
                  <span className="text-madder">{CATEGORY_LABELS[openItem.category] || openItem.category}</span>
                  <span className="text-body/70">{fmtDate(openItem.createdAt)}</span>
                </p>
                <h1 className="mt-4 font-display text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold leading-[1.1] tracking-[-0.015em] text-ink">
                  {pickLang(openItem.title, LANG)}
                </h1>
                {openItem.images?.[0] && (
                  <div className="glass glass-shadow mt-8 rounded-[1.75rem] p-3">
                    <div className="relative aspect-video overflow-hidden rounded-[1.15rem]">
                      <Image src={openItem.images[0]} alt="" fill sizes="(min-width: 768px) 48rem, 100vw" className="object-cover" />
                    </div>
                  </div>
                )}
                <div
                  className="rich-content mt-8 text-base leading-relaxed text-body md:text-lg"
                  dangerouslySetInnerHTML={{ __html: pickLang(openItem.content, LANG) }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { site, fmtDate } from "@/content/site";
import { EASE_EXPO, Stagger, Item, ZoomFrame } from "@/components/site/motion";

const sorted = [...site.news.items].sort((a, b) => (a.date < b.date ? 1 : -1));

export default function NewsExplorer() {
  const [category, setCategory] = useState("All");
  const [openItem, setOpenItem] = useState(null);
  const reduce = useReducedMotion();

  const items =
    category === "All" ? sorted : sorted.filter((n) => n.category === category);
  const featured = items[0];
  const rest = items.slice(1);

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

  return (
    <div className="mx-auto max-w-site px-5 pb-20 md:px-8 md:pb-28">
      {/* Filter pills */}
      <div
        className="mt-10 flex flex-wrap gap-2.5 md:mt-12"
        role="tablist"
        aria-label="Filter updates by category"
      >
        {site.news.categories.map((c) => {
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
              {c}
            </button>
          );
        })}
      </div>

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
              {/* Featured story — wide glass card */}
              <button
                onClick={() => setOpenItem(featured)}
                className="group glass glass-shadow hover-lift mt-8 grid w-full gap-6 rounded-[1.75rem] p-3 text-left md:mt-10 md:grid-cols-12 md:p-4"
              >
                <ZoomFrame className="relative aspect-[16/9] overflow-hidden rounded-[1.15rem] md:col-span-8">
                  <Image
                    src={featured.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 66vw, 100vw"
                    className="object-cover"
                  />
                </ZoomFrame>
                <div className="px-3 pb-3 md:col-span-4 md:self-center md:px-2">
                  <p className="flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                    <span className="text-madder">{featured.category}</span>
                    <span className="text-body/70">{fmtDate(featured.date)}</span>
                  </p>
                  <h2 className="mt-3 font-display text-xl font-bold leading-snug text-ink md:text-2xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-body">
                    {featured.excerpt}
                  </p>
                  <span className="link-wipe mt-4 inline-block text-sm font-semibold text-madder">
                    Read update <span aria-hidden>→</span>
                  </span>
                </div>
              </button>

              {/* The rest — glass card grid */}
              <Stagger className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((n) => (
                  <Item key={n.slug}>
                    <button
                      onClick={() => setOpenItem(n)}
                      className="group glass glass-shadow hover-lift block h-full w-full rounded-[1.5rem] p-3 text-left"
                    >
                      <ZoomFrame className="relative aspect-[16/10] overflow-hidden rounded-[1rem]">
                        <Image
                          src={n.image}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 33vw, 100vw"
                          className="object-cover"
                        />
                      </ZoomFrame>
                      <div className="px-2 pb-2 pt-4">
                        <p className="flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                          <span className="text-madder">{n.category}</span>
                          <span className="text-body/70">{fmtDate(n.date)}</span>
                        </p>
                        <h3 className="mt-2 font-display text-[15px] font-bold leading-snug text-ink md:text-base">
                          {n.title}
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

      <p className="mt-12 text-center text-xs font-semibold text-body/70">
        Updates are posted by the federation office.
      </p>

      {/* Reading overlay */}
      <AnimatePresence>
        {openItem && (
          <motion.div
            className="fixed inset-0 z-[60] overflow-y-auto"
            style={{ backgroundColor: "rgba(238,242,247,0.98)" }}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: EASE_EXPO }}
            role="dialog"
            aria-modal="true"
            aria-label={openItem.title}
          >
            <div className="mx-auto max-w-3xl px-5 py-24 md:px-8 md:py-28">
              <button
                onClick={() => setOpenItem(null)}
                aria-label="Close"
                className="tap-shrink glass glass-shadow fixed right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-200 md:right-8 md:top-8 [@media(hover:hover)]:hover:bg-ink [@media(hover:hover)]:hover:text-white"
              >
                <X size={18} />
              </button>
              <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em]">
                <span className="text-madder">{openItem.category}</span>
                <span className="text-body/70">{fmtDate(openItem.date)}</span>
              </p>
              <h1 className="mt-4 font-display text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold leading-[1.1] tracking-[-0.015em] text-ink">
                {openItem.title}
              </h1>
              <div className="glass glass-shadow mt-8 rounded-[1.75rem] p-3">
                <div className="relative aspect-video overflow-hidden rounded-[1.15rem]">
                  <Image
                    src={openItem.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 48rem, 100vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="mt-8 space-y-5">
                {(openItem.body || openItem.excerpt)
                  .split("\n\n")
                  .map((p, i) => (
                    <p
                      key={i}
                      className="text-base leading-relaxed text-body md:text-lg"
                    >
                      {p}
                    </p>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

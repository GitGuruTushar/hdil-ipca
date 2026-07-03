"use client";

// Brand-tinted map facade — the live Google embed loads only on tap,
// keeping the page fast and the design consistent.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";

export default function MapFacade() {
  const [loaded, setLoaded] = useState(false);
  const reduce = useReducedMotion();
  const c = site.contact;

  return (
    <div className="glass glass-shadow relative aspect-square w-full overflow-hidden rounded-[1.75rem] md:aspect-[16/7]">
      {loaded ? (
        <motion.iframe
          title="Map — HDIL Industrial Park"
          src={c.mapEmbedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0 grayscale-[0.85] sepia-[0.12] contrast-[0.95]"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="max-w-xl font-display text-xl font-bold leading-snug tracking-[-0.015em] text-ink md:text-2xl">
            {c.addressLines.join(", ")}
          </p>
          <button
            onClick={() => setLoaded(true)}
            className="tap-shrink inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-madder to-grape px-7 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-madder/25 transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:brightness-110"
          >
            Load map <span aria-hidden>→</span>
          </button>
        </div>
      )}
      <a
        href={c.directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="link-wipe glass absolute bottom-4 right-4 rounded-full px-4 py-2.5 text-xs font-bold text-ink"
      >
        Get directions <span aria-hidden>→</span>
      </a>
    </div>
  );
}

"use client";

// Signature moment of the About page: on desktop the era year is pinned
// on the left and crossfades as the story scrolls on the right.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE_EXPO } from "@/components/site/motion";

export default function HistoryTimeline({ timeline }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const observers = timeline.map((_, i) => {
      const el = refs.current[i];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(i);
        },
        { rootMargin: "-35% 0px -55% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o && o.disconnect());
  }, [timeline]);

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Pinned year — desktop only */}
      <div className="hidden lg:block lg:col-span-5">
        <div className="sticky top-36 h-[12rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={timeline[active].year}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: EASE_EXPO }}
              className="text-gradient font-display text-[clamp(5rem,8vw,8.5rem)] font-bold leading-none tracking-[-0.02em]"
            >
              {timeline[active].year}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Era blocks */}
      <div className="lg:col-span-7">
        {timeline.map((era, i) => (
          <div
            key={era.year}
            ref={(el) => (refs.current[i] = el)}
            className="glass glass-shadow mb-5 rounded-[1.5rem] p-6 md:mb-6 md:p-8"
          >
            <p className="text-gradient font-display text-4xl font-bold leading-none tracking-[-0.02em] lg:hidden">
              {era.year}
            </p>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-madder lg:mt-0">
              {era.year}
            </p>
            {era.title && (
              <h3 className="mt-2 font-display text-xl font-bold leading-tight text-ink md:text-2xl">
                {era.title}
              </h3>
            )}
            <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-body">
              {era.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

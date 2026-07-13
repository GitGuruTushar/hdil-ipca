"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { pickLang } from "@/utils/localizedContent";
import { MaskLines, Counter, EASE_EXPO } from "@/components/site/motion";
import { PillButton, Kicker } from "@/components/site/ui";

const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";

const FALLBACK = {
  eyebrow: "HDIL Industrial Park · Virar (East)",
  titleLead: "Where Virar",
  titleEm: "builds.",
  sub: "600+ businesses. One address. One voice.",
  primaryCtaLabel: "Explore the federation",
  secondaryCtaLabel: "Our story",
  image: `${bp}/home/hero.jpg`,
  imageAlt: "Buildings of the HDIL Industrial Park with IPCA billboards",
};

// `data` is the CMS's SiteContent.home document (fetched once by HomeContent);
// `stats` is the same document's stats array, shared with StatsBand below it.
export default function HomeHero({ data, lang, stats }) {
  const reduce = useReducedMotion();
  const fadeUp = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: EASE_EXPO },
  });

  const p = (field) => pickLang(field, lang);
  const hero = {
    eyebrow: p(data?.heroKicker) || FALLBACK.eyebrow,
    titleLead: p(data?.heroTitleLead) || FALLBACK.titleLead,
    titleEm: p(data?.heroTitleEm) || FALLBACK.titleEm,
    sub: p(data?.heroSubtitle) || FALLBACK.sub,
    primaryCta: { label: p(data?.heroPrimaryCtaLabel) || FALLBACK.primaryCtaLabel, href: data?.heroPrimaryCtaHref || "/about" },
    secondaryCtaLabel: p(data?.heroSecondaryCtaLabel) || FALLBACK.secondaryCtaLabel,
    secondaryCtaHref: data?.heroSecondaryCtaHref || "/about",
    image: data?.heroImageUrl || FALLBACK.image,
    imageAlt: p(data?.heroImageAlt) || FALLBACK.imageAlt,
  };

  // Buildings/galas/members chips — skips the first ("Years") stat by design,
  // matching the 3-chip overlay this layout was built for.
  const chipStats = (stats || []).slice(1);

  return (
    <section className="mx-auto max-w-site px-5 pt-32 md:px-8 md:pt-44">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Copy */}
        <div className="lg:col-span-6">
          <motion.div {...fadeUp(0.05)}>
            <Kicker>{hero.eyebrow}</Kicker>
          </motion.div>
          <h1 className="mt-6 font-display text-[clamp(2.5rem,5.8vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
            <MaskLines
              lines={[
                hero.titleLead,
                <span key="em" className="text-gradient">
                  {hero.titleEm}
                </span>,
              ]}
              delay={0.12}
            />
          </h1>
          <motion.p
            className="mt-5 max-w-md text-base leading-relaxed text-body md:text-lg"
            {...fadeUp(0.4)}
          >
            {hero.sub}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            {...fadeUp(0.5)}
          >
            <PillButton href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </PillButton>
            <PillButton href={hero.secondaryCtaHref} glass>
              {hero.secondaryCtaLabel}
            </PillButton>
          </motion.div>
          <motion.p
            className="mt-8 flex items-center gap-2 text-[13px] font-medium text-body"
            {...fadeUp(0.6)}
          >
            <ShieldCheck size={16} className="text-ok" aria-hidden />
            24×7 park security ·{" "}
            <Link href="/helpline" className="link-wipe font-semibold text-alarm">
              Emergency lines one tap away
            </Link>
          </motion.p>
        </div>

        {/* Floating glass-framed photograph with stat chip */}
        <motion.div className="relative lg:col-span-6" {...fadeUp(0.3)}>
          <div className={reduce ? "" : "float-soft"}>
            <div className="glass glass-shadow rounded-[1.75rem] p-3">
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.15rem] md:aspect-[16/10]">
                <Image
                  src={hero.image}
                  alt={hero.imageAlt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
          <motion.div
            className="glass glass-shadow absolute -bottom-6 left-4 flex gap-6 rounded-2xl px-5 py-3.5 md:-left-4 md:gap-8 md:px-7 md:py-4"
            {...fadeUp(0.75)}
          >
            {chipStats.map((s, i) => (
              <span key={i}>
                <span className="block font-display text-lg font-bold text-ink md:text-xl">
                  <Counter to={s.value} suffix={s.suffix} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-body">
                  {p(s.short)}
                </span>
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

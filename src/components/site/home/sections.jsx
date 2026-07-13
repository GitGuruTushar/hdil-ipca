import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";
import { pickLang } from "@/utils/localizedContent";
import {
  Reveal,
  Stagger,
  Item,
  Counter,
  ZoomFrame,
} from "@/components/site/motion";
import { SectionHeading, PillButton, WipeLink } from "@/components/site/ui";

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ------------------------------------------------------------------ */
/* Stats strip — one slim glass bar                                    */
/* ------------------------------------------------------------------ */
export function StatsBand({ stats, lang }) {
  if (!stats?.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 pb-4 pt-20 md:px-8 md:pt-28">
      <Reveal>
        <div className="glass glass-shadow grid grid-cols-2 gap-y-6 rounded-[1.75rem] px-6 py-7 md:grid-cols-4 md:px-10 md:py-8">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="font-display text-3xl font-bold tracking-[-0.02em] text-ink md:text-4xl">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-body">
                {pickLang(s.label, lang)}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Intro — text + glass-framed image                                   */
/* ------------------------------------------------------------------ */
export function Intro({ data, lang }) {
  const p = (field) => pickLang(field, lang);
  const text = p(data?.introText);
  if (!text) return null;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading eyebrow={p(data.introEyebrow)} title={p(data.introTitle)} />
          <p className="mt-5 max-w-sm text-base leading-relaxed text-body md:text-lg">{text}</p>
          {data.introLinkHref && (
            <div className="mt-6">
              <WipeLink href={data.introLinkHref}>{p(data.introLinkLabel)}</WipeLink>
            </div>
          )}
        </div>
        {data.introImageUrl && (
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="group glass glass-shadow hover-lift rounded-[1.75rem] p-3">
              <ZoomFrame className="relative aspect-[16/10] overflow-hidden rounded-[1.15rem]">
                <Image
                  src={data.introImageUrl}
                  alt={p(data.introImageAlt)}
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                />
              </ZoomFrame>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Industries marquee — one quiet glass strip                          */
/* ------------------------------------------------------------------ */
export function IndustriesMarquee({ items, lang }) {
  if (!items?.length) return null;

  const row = (hidden) => (
    <div
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center"
    >
      {items.map((name, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-6 text-[13px] font-bold uppercase tracking-[0.14em] text-body md:px-8">
            {pickLang(name, lang)}
          </span>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-madder/50" />
        </span>
      ))}
    </div>
  );

  return (
    <section
      className="mx-auto max-w-site px-5 md:px-8"
      aria-label="Industries in the park"
    >
      <div className="glass-soft marquee-hover overflow-hidden rounded-full py-4">
        <div className="marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* News teaser — three glass cards with tall images                    */
/* ------------------------------------------------------------------ */
export function NewsTeaser({ eyebrow, title, linkLabel, count, lang }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axiosInstance
      .get("/updates")
      .then((res) => setItems((res.data || []).slice(0, count || 3)))
      .catch(() => {});
  }, [count]);

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <Reveal delay={0.08}>
          <WipeLink href="/updates">{linkLabel}</WipeLink>
        </Reveal>
      </div>
      <Stagger className="grid gap-6 md:grid-cols-3">
        {items.map((n) => (
          <Item key={n._id}>
            <Link
              href="/updates"
              className="group glass glass-shadow hover-lift block rounded-[1.5rem] p-3"
            >
              <ZoomFrame className="relative aspect-[16/10] overflow-hidden rounded-[1rem]">
                <Image
                  src={n.images?.[0] || "/home/hero.jpg"}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </ZoomFrame>
              <div className="px-2 pb-2 pt-4">
                <p className="flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                  <span className="text-madder">{n.category}</span>
                  <span className="text-body/70">{fmtDate(n.createdAt)}</span>
                </p>
                <h3 className="mt-2 font-display text-[15px] font-bold leading-snug text-ink md:text-base">
                  {pickLang(n.title, lang)}
                </h3>
              </div>
            </Link>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery teaser — glass-framed offset strip                          */
/* ------------------------------------------------------------------ */
export function GalleryTeaser({ eyebrow, title, linkLabel, lang }) {
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    axiosInstance
      .get("/gallery", { params: { page: 1, limit: 4 } })
      .then((res) => setAlbums(res.data.albums || []))
      .catch(() => {});
  }, []);

  const cards = albums
    .filter((a) => a.items?.length)
    .map((a) => ({ id: a._id, title: pickLang(a.title, lang), item: a.items[0] }));

  if (!cards.length) return null;

  return (
    <section className="mx-auto max-w-site px-5 pb-16 md:px-8 md:pb-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <Reveal delay={0.08}>
          <WipeLink href="/gallery">{linkLabel}</WipeLink>
        </Reveal>
      </div>
      <Stagger className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Item key={c.id} className={i % 2 === 1 ? "lg:translate-y-8" : ""}>
            <Link
              href="/gallery"
              className="group glass glass-shadow hover-lift block rounded-[1.5rem] p-2.5"
            >
              <ZoomFrame
                className={`relative overflow-hidden rounded-[1rem] ${
                  i % 2 === 1 ? "aspect-[4/5]" : "aspect-[4/3]"
                }`}
              >
                <Image
                  src={c.item.url}
                  alt={pickLang(c.item.caption, lang) || c.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </ZoomFrame>
              <p className="px-2 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                {c.title}
              </p>
            </Link>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Helpline strip — red-tinted glass band                              */
/* ------------------------------------------------------------------ */
export function HelplineStrip({ title, text, ctaLabel }) {
  if (!title && !text) return null;
  return (
    <section className="mx-auto max-w-site px-5 pb-20 md:px-8 md:pb-28">
      <Reveal>
        <div
          className="flex flex-col gap-6 rounded-[1.75rem] border border-alarm/15 px-7 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-9"
          style={{ background: "rgba(220,38,38,0.06)" }}
        >
          <div>
            <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-alarm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alarm/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-alarm" />
              </span>
              Emergency helpline
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.4rem,3vw,2rem)] font-bold leading-tight text-ink">{title}</h2>
            <p className="mt-1.5 text-sm text-body md:text-base">{text}</p>
          </div>
          <PillButton href="/helpline" alarm>
            {ctaLabel}
          </PillButton>
        </div>
      </Reveal>
    </section>
  );
}

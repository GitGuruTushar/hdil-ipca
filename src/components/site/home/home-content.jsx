"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";
import HomeHero from "./hero";
import { StatsBand, Intro, IndustriesMarquee, NewsTeaser, GalleryTeaser, HelplineStrip } from "./sections";

export default function HomeContent() {
  const { lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/site-content/home")
      .then((res) => setData(res.data?.data || null))
      .catch(() => {});
  }, []);

  const p = (field) => pickLang(field, lang);

  return (
    <>
      <HomeHero data={data} lang={lang} stats={data?.stats} />
      <StatsBand stats={data?.stats} lang={lang} />
      <Intro data={data} lang={lang} />
      <IndustriesMarquee items={data?.industriesMarqueeItems} lang={lang} />
      <NewsTeaser
        eyebrow={p(data?.newsTeaserEyebrow)}
        title={p(data?.newsTeaserTitle)}
        linkLabel={p(data?.newsTeaserLinkLabel)}
        count={data?.newsTeaserCount}
        lang={lang}
      />
      <GalleryTeaser eyebrow={p(data?.galleryTeaserEyebrow)} title={p(data?.galleryTeaserTitle)} linkLabel={p(data?.galleryTeaserLinkLabel)} lang={lang} />
      <HelplineStrip title={p(data?.helplineStripTitle)} text={p(data?.helplineStripText)} ctaLabel={p(data?.helplineStripCtaLabel)} />
    </>
  );
}

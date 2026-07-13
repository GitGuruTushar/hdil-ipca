"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";
import { PageHero } from "@/components/site/ui";
import { History, MissionVision, AboutStats, Leadership } from "./sections";

const FALLBACK = {
  eyebrow: "About the federation",
  titleLead: "Built by industry,",
  titleEm: "run by its people.",
  sub: "The story, the mission, the people.",
};

export default function AboutContent() {
  const { lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/site-content/about")
      .then((res) => setData(res.data?.data || null))
      .catch(() => {});
  }, []);

  const p = (field) => pickLang(field, lang);

  return (
    <>
      <PageHero
        eyebrow={p(data?.heroEyebrow) || FALLBACK.eyebrow}
        titleLead={p(data?.heroTitleLead) || FALLBACK.titleLead}
        titleEm={p(data?.heroTitleEm) || FALLBACK.titleEm}
        sub={p(data?.heroSub) || FALLBACK.sub}
      />
      <History data={data} lang={lang} />
      <AboutStats stats={data?.stats} lang={lang} />
      <div className="pt-16 md:pt-24">
        <MissionVision data={data} lang={lang} />
      </div>
      <Leadership data={data} lang={lang} />
    </>
  );
}

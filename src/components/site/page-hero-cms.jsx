"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";
import { PageHero } from "@/components/site/ui";

// CMS-backed hero for pages whose SiteContent document only holds hero copy
// (gallery/updates/helpline — their body content lives in its own model, see
// Milestone 2). Renders the static `fallback` copy until the fetch resolves,
// so there's no loading-skeleton flash for a section this small.
export default function PageHeroCms({ page, fallback }) {
  const { lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosInstance
      .get(`/site-content/${page}`)
      .then((res) => setData(res.data?.data || null))
      .catch(() => {});
  }, [page]);

  const p = (field) => pickLang(field, lang);

  return (
    <PageHero
      eyebrow={p(data?.heroEyebrow) || fallback.eyebrow}
      titleLead={p(data?.heroTitleLead) || fallback.titleLead}
      titleEm={p(data?.heroTitleEm) || fallback.titleEm}
      sub={p(data?.heroSub) || fallback.sub}
    />
  );
}

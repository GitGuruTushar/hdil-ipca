"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";
import { PageHero } from "@/components/site/ui";
import ChannelRail from "./channel-rail";
import ContactForm from "./contact-form";
import MapFacade from "./map-facade";

const FALLBACK = {
  eyebrow: "Contact us",
  titleLead: "Baat",
  titleEm: "karein?",
  sub: "The federation office is listening.",
};

export default function ContactContent() {
  const { lang } = useI18n();
  const [content, setContent] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/site-content/contact")
      .then((res) => setContent(res.data?.data || null))
      .catch(() => {});
    axiosInstance
      .get("/site-settings")
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  const p = (field) => pickLang(field, lang);

  return (
    <>
      <PageHero
        eyebrow={p(content?.heroEyebrow) || FALLBACK.eyebrow}
        titleLead={p(content?.heroTitleLead) || FALLBACK.titleLead}
        titleEm={p(content?.heroTitleEm) || FALLBACK.titleEm}
        sub={p(content?.heroSub) || FALLBACK.sub}
      />

      <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <ChannelRail contactInfo={settings?.contactInfo} responsePromise={p(content?.responsePromise)} directionsUrl={content?.directionsUrl} />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ContactForm data={content} lang={lang} email={settings?.contactInfo?.email} phone={settings?.contactInfo?.phone} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-site px-5 pb-24 md:px-8 md:pb-36">
        <MapFacade mapEmbedUrl={content?.mapEmbedUrl} directionsUrl={content?.directionsUrl} addressLines={settings?.contactInfo?.addressLines} />
      </section>
    </>
  );
}

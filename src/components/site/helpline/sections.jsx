"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { pickLang } from "@/utils/localizedContent";
import { Stagger, Item, Reveal } from "@/components/site/motion";
import { SectionHeading } from "@/components/site/ui";
import { useI18n } from "@/i18n/I18nProvider";

const tel = (n) => `tel:${n.replace(/[^\d+]/g, "")}`;

/* ------------------------------------------------------------------ */
/* National emergency numbers — giant tap-to-call glass cards          */
/* ------------------------------------------------------------------ */
function EmergencyNumbers({ contacts, LANG }) {
  if (!contacts.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 py-12 md:px-8 md:py-16">
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {contacts.map((c) => (
          <Item key={c._id}>
            <a
              href={tel(c.number)}
              className="group glass glass-shadow hover-lift tap-shrink flex h-full flex-col justify-between gap-6 rounded-[1.75rem] p-6 md:p-7"
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-ink md:text-lg">{pickLang(c.name, LANG)}</span>
                <span className="rounded-full bg-alarm/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-alarm transition-colors duration-200 [@media(hover:hover)]:group-hover:bg-alarm [@media(hover:hover)]:group-hover:text-white">
                  Call →
                </span>
              </span>
              <span>
                <span className="block font-display text-5xl font-bold leading-none tracking-[-0.02em] text-alarm md:text-6xl">
                  {c.number}
                </span>
                {pickLang(c.note, LANG) && <span className="mt-2.5 block text-sm text-body">{pickLang(c.note, LANG)}</span>}
              </span>
            </a>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Park lines — dark glass panel                                       */
/* ------------------------------------------------------------------ */
function ParkLines({ contacts, LANG }) {
  if (!contacts.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 md:px-8">
      <Reveal>
        <div className="glass-shadow rounded-[2rem] bg-ink p-7 text-white md:p-12">
          <SectionHeading eyebrow="Park lines" title="Inside the park" dark />
          <Stagger className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            {contacts.map((c) => (
              <Item key={c._id}>
                <a
                  href={tel(c.number)}
                  className="group tap-shrink flex h-full flex-col justify-between gap-6 rounded-[1.5rem] border border-white/12 bg-white/5 p-6 transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${c.available247 ? "bg-ok" : "bg-white/30"}`} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
                      {c.available247 ? "24/7" : pickLang(c.hours, LANG)}
                    </span>
                  </span>
                  <span>
                    <span className="block font-display text-base font-bold leading-tight md:text-lg">{pickLang(c.name, LANG)}</span>
                    <span className="mt-2 block font-display text-xl font-bold text-white md:text-2xl">{c.number}</span>
                  </span>
                </a>
              </Item>
            ))}
          </Stagger>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Empanelled service providers — no public ratings (admin-only)       */
/* ------------------------------------------------------------------ */
function Providers({ contacts, LANG }) {
  if (!contacts.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <SectionHeading eyebrow="Service providers" title="Empanelled providers" />
      <Reveal delay={0.1} className="mt-8 md:mt-10">
        <div className="glass glass-shadow rounded-[1.75rem] px-5 md:px-8">
          {contacts.map((c, i) => (
            <div
              key={c._id}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 py-5 md:py-6 ${i > 0 ? "border-t border-line/70" : ""}`}
            >
              <span>
                <span className="block font-display text-[15px] font-bold text-ink md:text-base">{pickLang(c.name, LANG)}</span>
                {pickLang(c.note, LANG) && <span className="mt-0.5 block text-sm text-body">{pickLang(c.note, LANG)}</span>}
              </span>
              <a href={tel(c.number)} className="link-wipe self-center justify-self-end text-sm font-semibold text-madder">
                Call <span aria-hidden>→</span>
              </a>
            </div>
          ))}
        </div>
      </Reveal>
      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-body/80">
        Ratings for these providers are collected privately for internal accountability and aren't shown publicly.
      </p>
    </section>
  );
}

export default function HelplineSections() {
  const { lang: LANG } = useI18n();
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [contacts, setContacts] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setStatus("loading");
    axiosInstance
      .get("/emergency")
      .then((res) => {
        setContacts(res.data || []);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(apiErrorMessage(err, "Couldn't load the helpline numbers"));
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-site px-5 py-16 md:px-8">
        <div className="glass glass-shadow flex flex-col items-center justify-center gap-3 rounded-[1.75rem] p-16 text-sm text-body">
          <Loader2 className="h-5 w-5 animate-spin text-madder" />
          Loading helpline numbers…
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-site px-5 py-16 md:px-8">
        <div className="glass glass-shadow flex flex-col items-center justify-center gap-3 rounded-[1.75rem] p-16 text-sm text-body">
          <AlertTriangle className="h-5 w-5 text-alarm" />
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <>
      <EmergencyNumbers contacts={contacts.filter((c) => c.category === "Emergency")} LANG={LANG} />
      <ParkLines contacts={contacts.filter((c) => c.category === "Park")} LANG={LANG} />
      <Providers contacts={contacts.filter((c) => c.category === "Service Provider")} LANG={LANG} />
    </>
  );
}

"use client";

import Link from "next/link";
import { pickLang } from "@/utils/localizedContent";
import { useI18n } from "@/i18n/I18nProvider";
import { PillButton } from "./ui";
import { Reveal } from "./motion";

// `settings` is fetched once in template.js and shared with the navbar.
export default function SiteFooter({ settings }) {
  const { lang } = useI18n();
  if (!settings) return null;

  const nav = settings.nav || [];
  const brandName = settings.brand?.name || "HDIL-IPCA";
  const contact = settings.contactInfo || {};
  const footer = settings.footer || {};

  return (
    <footer className="px-3 pb-3 md:px-6 md:pb-6">
      <div className="mx-auto max-w-site rounded-[2rem] bg-ink text-white">
        <div className="px-6 md:px-12">
          {/* CTA row — compact */}
          <div className="flex flex-col gap-6 border-b border-white/10 py-10 md:flex-row md:items-center md:justify-between md:py-12">
            <Reveal>
              <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.4rem)] font-bold leading-tight tracking-[-0.015em]">
                {pickLang(footer.ctaHeading, lang) || "Let's build,"}{" "}
                <span className="text-gradient" style={{ filter: "brightness(1.6)" }}>
                  {pickLang(footer.ctaHeadingEm, lang) || "together."}
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <PillButton href={footer.ctaButtonHref || "/contact"}>
                {pickLang(footer.ctaButtonLabel, lang) || "Contact the federation"}
              </PillButton>
            </Reveal>
          </div>

          {/* Single info row */}
          <div className="grid grid-cols-1 gap-8 py-8 text-sm sm:grid-cols-3 md:py-10">
            <div>
              <p className="font-display text-base font-bold tracking-tight">{brandName}</p>
              <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-white/55">{pickLang(footer.blurb, lang)}</p>
            </div>

            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-6 gap-y-2.5 sm:flex-col">
                {nav.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`link-wipe text-[13px] font-semibold ${
                        l.variant === "emergency"
                          ? "text-red-400"
                          : "text-white/70 [@media(hover:hover)]:hover:text-white"
                      }`}
                    >
                      {pickLang(l.label, lang)}
                    </Link>
                  </li>
                ))}
                {settings.loginLink && (
                  <li>
                    <Link
                      href={settings.loginLink.href}
                      className="link-wipe text-[13px] font-semibold text-white/70 [@media(hover:hover)]:hover:text-white"
                    >
                      {pickLang(settings.loginLink.label, lang)}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>

            <div className="space-y-2 text-[13px] text-white/70">
              {contact.addressLines?.length > 0 && <p>{contact.addressLines.join(", ")}</p>}
              {contact.email && (
                <p>
                  <a href={`mailto:${contact.email}`} className="link-wipe [@media(hover:hover)]:hover:text-white">
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.phone && (
                <p>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="link-wipe [@media(hover:hover)]:hover:text-white">
                    {contact.phone}
                  </a>
                </p>
              )}
              {contact.hours?.map((h, i) => (
                <p key={i} className="text-white/40">
                  {h.days} · {h.time}
                </p>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-1.5 border-t border-white/10 py-5 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>{pickLang(footer.copyright, lang)}</p>
            <p>{pickLang(settings.brand?.fullForm, lang)}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

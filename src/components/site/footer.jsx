import Link from "next/link";
import { site } from "@/content/site";
import { PillButton } from "./ui";
import { Reveal } from "./motion";

export default function SiteFooter() {
  return (
    <footer className="px-3 pb-3 md:px-6 md:pb-6">
      <div className="mx-auto max-w-site rounded-[2rem] bg-ink text-white">
        <div className="px-6 md:px-12">
          {/* CTA row — compact */}
          <div className="flex flex-col gap-6 border-b border-white/10 py-10 md:flex-row md:items-center md:justify-between md:py-12">
            <Reveal>
              <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.4rem)] font-bold leading-tight tracking-[-0.015em]">
                Let&rsquo;s build,{" "}
                <span className="text-gradient" style={{ filter: "brightness(1.6)" }}>
                  together.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <PillButton href="/contact">Contact the federation</PillButton>
            </Reveal>
          </div>

          {/* Single info row */}
          <div className="grid grid-cols-1 gap-8 py-8 text-sm sm:grid-cols-3 md:py-10">
            <div>
              <p className="font-display text-base font-bold tracking-tight">
                {site.brand.name}
              </p>
              <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-white/55">
                {site.footer.blurb}
              </p>
            </div>

            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-6 gap-y-2.5 sm:flex-col">
                {site.nav.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`link-wipe text-[13px] font-semibold ${
                        l.href === "/helpline"
                          ? "text-red-400"
                          : "text-white/70 [@media(hover:hover)]:hover:text-white"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-2 text-[13px] text-white/70">
              <p>{site.contact.addressLines.join(", ")}</p>
              <p>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="link-wipe [@media(hover:hover)]:hover:text-white"
                >
                  {site.contact.email}
                </a>
              </p>
              <p>
                <a
                  href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  className="link-wipe [@media(hover:hover)]:hover:text-white"
                >
                  {site.contact.phone}
                </a>
              </p>
              <p className="text-white/40">
                {site.contact.hours[0].days} · {site.contact.hours[0].time}
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-1.5 border-t border-white/10 py-5 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>{site.footer.copyright}</p>
            <p>{site.brand.fullForm}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { site } from "@/content/site";
import { Stagger, Item, Reveal } from "@/components/site/motion";
import { SectionHeading } from "@/components/site/ui";

const tel = (n) => `tel:${n.replace(/[^\d+]/g, "")}`;

/* ------------------------------------------------------------------ */
/* National emergency numbers — giant tap-to-call glass cards          */
/* ------------------------------------------------------------------ */
export function EmergencyNumbers() {
  return (
    <section className="mx-auto max-w-site px-5 py-12 md:px-8 md:py-16">
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {site.helpline.emergency.map((e) => (
          <Item key={e.name}>
            <a
              href={tel(e.number)}
              className="group glass glass-shadow hover-lift tap-shrink flex h-full flex-col justify-between gap-6 rounded-[1.75rem] p-6 md:p-7"
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-ink md:text-lg">
                  {e.name}
                </span>
                <span className="rounded-full bg-alarm/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-alarm transition-colors duration-200 [@media(hover:hover)]:group-hover:bg-alarm [@media(hover:hover)]:group-hover:text-white">
                  Call →
                </span>
              </span>
              <span>
                <span className="block font-display text-5xl font-bold leading-none tracking-[-0.02em] text-alarm md:text-6xl">
                  {e.number}
                </span>
                <span className="mt-2.5 block text-sm text-body">{e.note}</span>
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
export function ParkLines() {
  return (
    <section className="mx-auto max-w-site px-5 md:px-8">
      <Reveal>
        <div className="glass-shadow rounded-[2rem] bg-ink p-7 text-white md:p-12">
          <SectionHeading eyebrow="Park lines" title="Inside the park" dark />
          <Stagger className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            {site.helpline.park.map((p) => (
              <Item key={p.name}>
                <a
                  href={tel(p.number)}
                  className="group tap-shrink flex h-full flex-col justify-between gap-6 rounded-[1.5rem] border border-white/12 bg-white/5 p-6 transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        p.available247 ? "bg-ok" : "bg-white/30"
                      }`}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
                      {p.hours}
                    </span>
                  </span>
                  <span>
                    <span className="block font-display text-base font-bold leading-tight md:text-lg">
                      {p.name}
                    </span>
                    <span className="mt-2 block font-display text-xl font-bold text-white md:text-2xl">
                      {p.number}
                    </span>
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
/* Empanelled service providers                                        */
/* ------------------------------------------------------------------ */
export function Providers() {
  const { providers } = site.helpline;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <SectionHeading eyebrow={providers.eyebrow} title={providers.title} />
      <Reveal delay={0.1} className="mt-8 md:mt-10">
        <div className="glass glass-shadow rounded-[1.75rem] px-5 md:px-8">
          {providers.list.map((p, i) => (
            <div
              key={p.name}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 py-5 md:grid-cols-[1fr_auto_auto] md:gap-x-12 md:py-6 ${
                i > 0 ? "border-t border-line/70" : ""
              }`}
            >
              <span>
                <span className="block font-display text-[15px] font-bold text-ink md:text-base">
                  {p.name}
                </span>
                <span className="mt-0.5 block text-sm text-body">
                  {p.service}
                </span>
              </span>
              <span className="row-start-2 font-display text-base font-bold text-ink md:row-start-auto">
                <span aria-hidden className="text-amber-500">★</span>{" "}
                {p.rating.toFixed(1)}
              </span>
              <a
                href={tel(p.phone)}
                className="link-wipe self-center justify-self-end text-sm font-semibold text-madder"
              >
                Call <span aria-hidden>→</span>
              </a>
            </div>
          ))}
        </div>
      </Reveal>
      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-body/80">
        {providers.note}
      </p>
    </section>
  );
}

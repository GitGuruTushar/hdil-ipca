import Image from "next/image";
import { site } from "@/content/site";
import { Reveal, Stagger, Item, Counter } from "@/components/site/motion";
import { SectionHeading } from "@/components/site/ui";
import HistoryTimeline from "./history-timeline";

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */
export function History() {
  const { history } = site.about;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow={history.eyebrow} title={history.title} />
        <p className="max-w-sm text-base leading-relaxed text-body md:text-lg">
          {history.paragraphs[0]}
        </p>
      </div>
      <div className="mt-12 md:mt-16">
        <HistoryTimeline timeline={history.timeline} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mission, vision & values                                            */
/* ------------------------------------------------------------------ */
export function MissionVision() {
  const { missionVision } = site.about;
  return (
    <section className="mx-auto max-w-site px-5 pb-16 md:px-8 md:pb-24">
      <Reveal>
        <p className="mb-7 text-[11px] font-bold uppercase tracking-[0.15em] text-madder">
          {missionVision.eyebrow}
        </p>
      </Reveal>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <Reveal>
          <div className="glass glass-shadow h-full rounded-[1.75rem] p-7 md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-madder">
              {missionVision.mission.title}
            </p>
            <p className="mt-4 font-display text-xl font-bold leading-snug text-ink md:text-2xl">
              {missionVision.mission.text}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="glass-shadow h-full rounded-[1.75rem] bg-ink p-7 text-white md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-grape" style={{ filter: "brightness(1.5)" }}>
              {missionVision.vision.title}
            </p>
            <p className="mt-4 font-display text-xl font-bold leading-snug md:text-2xl">
              {missionVision.vision.text}
            </p>
          </div>
        </Reveal>
      </div>

      <Stagger className="mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
        {missionVision.values.map((v) => (
          <Item key={v.index}>
            <div className="glass glass-shadow hover-lift h-full rounded-[1.5rem] p-6 md:p-7">
              <span className="font-display text-lg font-bold text-gradient">
                {v.index}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-ink md:text-xl">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {v.text}
              </p>
            </div>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Compact stats strip                                                 */
/* ------------------------------------------------------------------ */
export function AboutStats() {
  return (
    <section className="mx-auto max-w-site px-5 md:px-8">
      <Reveal>
        <div className="glass glass-shadow grid grid-cols-2 gap-y-6 rounded-[1.75rem] px-6 py-7 md:grid-cols-4 md:px-10 md:py-8">
          {site.stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl font-bold tracking-[-0.02em] text-ink md:text-4xl">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-body">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Leadership — glass tiles                                            */
/* ------------------------------------------------------------------ */
const initials = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

export function Leadership() {
  const { leadership } = site.about;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10">
        <SectionHeading eyebrow={leadership.eyebrow} title={leadership.title} />
        <p className="text-sm font-semibold text-body">{leadership.text}</p>
      </div>
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {leadership.members.map((m) => (
          <Item key={m.name}>
            <div className="glass glass-shadow hover-lift flex h-full flex-col items-start gap-5 rounded-[1.5rem] p-5 md:flex-row md:items-center md:p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-madder to-grape font-display text-lg font-bold text-white md:h-16 md:w-16">
                {m.photo ? (
                  <Image
                    src={m.photo}
                    alt={m.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(m.name)
                )}
              </span>
              <span>
                <span className="block font-display text-base font-bold leading-tight text-ink md:text-lg">
                  {m.name}
                </span>
                <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-body">
                  {m.role}
                </span>
              </span>
            </div>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

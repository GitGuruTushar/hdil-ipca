import Image from "next/image";
import { pickLang } from "@/utils/localizedContent";
import { Reveal, Stagger, Item, Counter } from "@/components/site/motion";
import { SectionHeading } from "@/components/site/ui";
import HistoryTimeline from "./history-timeline";

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */
export function History({ data, lang }) {
  const p = (field) => pickLang(field, lang);
  if (!data?.history?.length && !p(data?.historyIntro)) return null;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow={p(data.historyEyebrow)} title={p(data.historyTitle)} />
        <p className="max-w-sm text-base leading-relaxed text-body md:text-lg">{p(data.historyIntro)}</p>
      </div>
      <div className="mt-12 md:mt-16">
        <HistoryTimeline timeline={(data.history || []).map((h) => ({ year: h.year, title: p(h.title), text: p(h.text) }))} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mission, vision & values                                            */
/* ------------------------------------------------------------------ */
export function MissionVision({ data, lang }) {
  const p = (field) => pickLang(field, lang);
  if (!p(data?.missionText) && !p(data?.visionText) && !data?.values?.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 pb-16 md:px-8 md:pb-24">
      <Reveal>
        <p className="mb-7 text-[11px] font-bold uppercase tracking-[0.15em] text-madder">{p(data.missionVisionEyebrow)}</p>
      </Reveal>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <Reveal>
          <div className="glass glass-shadow h-full rounded-[1.75rem] p-7 md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-madder">{p(data.missionTitle)}</p>
            <p className="mt-4 font-display text-xl font-bold leading-snug text-ink md:text-2xl">{p(data.missionText)}</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="glass-shadow h-full rounded-[1.75rem] bg-ink p-7 text-white md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-grape" style={{ filter: "brightness(1.5)" }}>
              {p(data.visionTitle)}
            </p>
            <p className="mt-4 font-display text-xl font-bold leading-snug md:text-2xl">{p(data.visionText)}</p>
          </div>
        </Reveal>
      </div>

      {data.values?.length > 0 && (
        <Stagger className="mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
          {data.values.map((v, i) => (
            <Item key={i}>
              <div className="glass glass-shadow hover-lift h-full rounded-[1.5rem] p-6 md:p-7">
                <span className="font-display text-lg font-bold text-gradient">{v.index}</span>
                <h3 className="mt-2 font-display text-lg font-bold text-ink md:text-xl">{p(v.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{p(v.text)}</p>
              </div>
            </Item>
          ))}
        </Stagger>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Compact stats strip                                                 */
/* ------------------------------------------------------------------ */
export function AboutStats({ stats, lang }) {
  if (!stats?.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 md:px-8">
      <Reveal>
        <div className="glass glass-shadow grid grid-cols-2 gap-y-6 rounded-[1.75rem] px-6 py-7 md:grid-cols-4 md:px-10 md:py-8">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="font-display text-3xl font-bold tracking-[-0.02em] text-ink md:text-4xl">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-body">{pickLang(s.label, lang)}</p>
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
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

export function Leadership({ data, lang }) {
  const p = (field) => pickLang(field, lang);
  if (!data?.leadership?.length) return null;
  return (
    <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10">
        <SectionHeading eyebrow={p(data.leadershipEyebrow)} title={p(data.leadershipTitle)} />
        <p className="text-sm font-semibold text-body">{p(data.leadershipText)}</p>
      </div>
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {data.leadership.map((m, i) => (
          <Item key={i}>
            <div className="glass glass-shadow hover-lift flex h-full flex-col items-start gap-5 rounded-[1.5rem] p-5 md:flex-row md:items-center md:p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-madder to-grape font-display text-lg font-bold text-white md:h-16 md:w-16">
                {m.photoUrl ? (
                  <Image src={m.photoUrl} alt={m.name || ""} width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  initials(m.name)
                )}
              </span>
              <span>
                <span className="block font-display text-base font-bold leading-tight text-ink md:text-lg">{m.name || "—"}</span>
                <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-body">{p(m.role)}</span>
              </span>
            </div>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

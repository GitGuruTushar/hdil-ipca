import Link from "next/link";
import { Reveal, MaskLines, Words } from "./motion";

/** Kicker chip — frosted pill with an indigo dot, used above headlines. */
export function Kicker({ children, className, dark }) {
  return (
    <span
      className={`glass-soft inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] ${
        dark ? "!bg-white/10 !border-white/20 text-white" : "text-madder"
      } ${className || ""}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-madder" />
      {children}
    </span>
  );
}

/**
 * Standard page hero: kicker chip + display headline (second line in the
 * indigo→violet gradient) + one-line sub. Sentence case, calm scale.
 */
export function PageHero({ eyebrow, titleLead, titleEm, sub, children }) {
  return (
    <section className="mx-auto max-w-site px-5 pt-32 md:px-8 md:pt-44">
      <Reveal y={10}>
        <Kicker>{eyebrow}</Kicker>
      </Reveal>
      <h1 className="mt-6 font-display text-[clamp(2.3rem,5.5vw,4rem)] font-bold leading-[1.06] tracking-[-0.02em] text-ink">
        <MaskLines
          lines={[
            titleLead,
            <span key="em" className="text-gradient">
              {titleEm}
            </span>,
          ]}
        />
      </h1>
      {sub && (
        <p className="mt-5 max-w-md text-base leading-relaxed text-body md:text-lg">
          {sub}
        </p>
      )}
      {children}
    </section>
  );
}

/** Section heading — kicker + display title, word-mask on scroll. */
export function SectionHeading({ eyebrow, title, className, dark }) {
  return (
    <div className={className}>
      {eyebrow && (
        <Reveal y={10}>
          <Kicker dark={dark}>{eyebrow}</Kicker>
        </Reveal>
      )}
      <h2
        className={`mt-5 font-display text-[clamp(1.6rem,3.2vw,2.4rem)] font-bold leading-[1.12] tracking-[-0.015em] ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        <Words text={title} />
      </h2>
    </div>
  );
}

/**
 * Primary CTA pill. Default: indigo→violet gradient. `glass`: frosted
 * secondary. `alarm`: emergency red (helpline only).
 */
export function PillButton({ href, children, className, glass, alarm, ...rest }) {
  const Comp = href ? Link : "button";
  const skin = alarm
    ? "bg-alarm text-white [@media(hover:hover)]:hover:bg-alarm-deep"
    : glass
      ? "glass-soft text-ink [@media(hover:hover)]:hover:!bg-white"
      : "bg-gradient-to-r from-madder to-grape text-white shadow-lg shadow-madder/25 [@media(hover:hover)]:hover:shadow-madder/40 [@media(hover:hover)]:hover:brightness-110";
  return (
    <Comp
      href={href}
      {...rest}
      className={`group/pill tap-shrink inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 ${skin} ${className || ""}`}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block transition-transform duration-200 ease-out-quint [@media(hover:hover)]:group-hover/pill:translate-x-1"
      >
        →
      </span>
    </Comp>
  );
}

/** Secondary link — indigo with underline slide. */
export function WipeLink({ href, children, className }) {
  return (
    <Link
      href={href}
      className={`link-wipe text-sm font-semibold text-madder ${className || ""}`}
    >
      {children}
      <span aria-hidden className="ml-1.5">→</span>
    </Link>
  );
}

/** 1px rule. */
export function Hairline({ className }) {
  return <div className={`h-px w-full bg-line ${className || ""}`} />;
}

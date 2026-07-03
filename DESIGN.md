# HDIL-IPCA — Design System v3 "Glass Serenity" (Phase 1 public site)

Premium glassmorphism on a softly tinted light base. A proper website — not
a dashboard. Approved via mockups on 2026-07-03. Admin/dashboard/login
(Phase 2) are out of scope and untouched.

## Palette (Tailwind names in `tailwind.config.mjs`)
| Role | Hex | Class |
|---|---|---|
| Page base | `#EEF2F7` | `ivory` |
| Ink / dark panels | `#171B26` | `ink` |
| Body text | `#525A6B` | `body` |
| Hairline | `#DFE5EE` | `line` |
| Accent indigo | `#4F46E2` | `madder` |
| Accent violet (gradient end) | `#7C3AED` | `grape` |
| Emergency red (helpline ONLY) | `#DC2626` | `alarm` |
| Open/24×7 dot | `#10B981` | `ok` |

The indigo→violet gradient (`bg-gradient-to-r from-madder to-grape`) is for
primary CTAs, active filter pills and monograms only. Red is exclusively for
emergency UI. The ambient background is `MeshBackground` (fixed radial tints
+ two slow-drifting blobs).

## Glass (utilities in `globals.css`)
- `.glass` — white 0.66 + blur 24px on md+; near-opaque white on mobile (perf)
- `.glass-soft` — lighter variant for chips/marquee
- `.glass-shadow` — soft elevation; `.hover-lift` — −6px lift on hover
- Radius: `rounded-[1.75rem]` panels, `rounded-[1.5rem]` cards, pills full.
  Images sit inside glass frames with `p-3` and `rounded-[1.15rem]`.

## Type — Schibsted Grotesk (display) + Plus Jakarta Sans (body)
Sentence case. Hero h1 `clamp(2.5rem,5.8vw,4.25rem)`; page h1
`clamp(2.3rem,5.5vw,4rem)`; section h2 `clamp(1.6rem,3.2vw,2.4rem)`;
body 16px `text-body`. The highlighted headline word uses `.text-gradient`.
No uppercase headlines; kickers are small bold uppercase inside `Kicker` chips.

## Motion (primitives in `src/components/site/motion.jsx`)
Short and elegant — nothing pops: `Reveal` (20px rise, 450ms expo, once),
`Stagger`/`Item` (45ms apart), `MaskLines` (hero lines on load), `Words`
(section headlines), `Counter` (count-up once), `.float-soft` (hero frame,
5.5s), `ZoomFrame` (image 1.05 on hover, desktop only), route fade 220ms,
Lenis smooth scroll desktop-only, `prefers-reduced-motion` collapses all.

## Components
`Kicker`, `PageHero`, `SectionHeading`, `PillButton` (gradient / `glass` /
`alarm`), `WipeLink` in `src/components/site/ui.jsx`. Navbar is a floating
glass pill (logo in a white tile); Emergency is a red pill in the navbar —
never a plain nav link. Footer is a compact dark rounded panel. All copy
lives in `src/content/site.js` (`[EDIT]` marks placeholders).

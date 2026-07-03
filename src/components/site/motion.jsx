"use client";

// Shared motion primitives — v2 "bold & kinetic": short, snappy, everywhere.
// Rules: transform/opacity only, reveals fire once, nothing over 700ms,
// reduced-motion collapses to static.

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  animate,
} from "framer-motion";

export const EASE_EXPO = [0.16, 1, 0.3, 1];
export const EASE_QUINT = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, margin: "0px 0px -8% 0px" };

/** Fade + 20px rise on first scroll into view. Short: 450ms. */
export function Reveal({ children, delay = 0, y = 20, className, as = "div" }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.45, delay, ease: EASE_EXPO }}
    >
      {children}
    </Tag>
  );
}

/** Parent for staggered child reveals (45ms apart). Use with <Item>. */
export function Stagger({ children, className, delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.045, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Item({ children, className, y = 20 }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: EASE_EXPO },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Line-by-line mask-up reveal for hero headlines. Runs on load, not scroll.
 * Short: 550ms per line, 90ms apart.
 */
export function MaskLines({ lines, className, lineClassName, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <motion.span
            className={`block ${lineClassName || ""}`}
            initial={reduce ? false : { y: "108%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.55,
              delay: delay + i * 0.09,
              ease: EASE_EXPO,
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Word-by-word mask reveal on scroll — for section headlines. */
export function Words({ text, className, delay = 0 }) {
  const reduce = useReducedMotion();
  const words = String(text).split(" ");
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "108%" },
              show: {
                y: "0%",
                transition: { duration: 0.5, ease: EASE_EXPO },
              },
            }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/** Count-up number that animates once when scrolled into view. */
export function Counter({ to, suffix = "", className, duration = 1.1 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration,
      ease: EASE_QUINT,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("en-IN")}
      {suffix && <span className="text-madder">{suffix}</span>}
    </span>
  );
}

/** Subtle scroll parallax — desktop pointers only, transform-based. */
export function Parallax({ children, className, amount = 40 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);

  useEffect(() => {
    setEnabled(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce
    );
  }, [reduce]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={enabled ? { y } : undefined} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

/** Image frame whose inner image zooms subtly on hover (desktop only). */
export function ZoomFrame({ children, className }) {
  return (
    <div className={`overflow-hidden ${className || ""}`}>
      <div className="relative h-full w-full transition-transform duration-500 ease-out-quint [@media(hover:hover)]:group-hover:scale-105">
        {children}
      </div>
    </div>
  );
}

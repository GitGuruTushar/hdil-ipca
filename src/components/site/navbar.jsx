"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Phone } from "lucide-react";
import { site } from "@/content/site";
import { EASE_EXPO } from "./motion";

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Emergency & Contact get their own treatments — bar links are the rest
  const barLinks = site.nav.filter(
    (l) => l.href !== "/helpline" && l.href !== "/contact"
  );

  return (
    <>
      <motion.header
        className="fixed inset-x-3 top-3 z-50 md:inset-x-6 md:top-5"
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_EXPO }}
      >
        <div className="glass glass-shadow mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full pl-2.5 pr-2.5 md:h-16 md:pl-3 md:pr-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="HDIL-IPCA home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-ink/5 md:h-10 md:w-10">
              <Image
                src={site.brand.logo}
                alt=""
                width={40}
                height={22}
                className="h-4 w-auto md:h-5"
              />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-ink md:text-base">
              {site.brand.name}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:block" aria-label="Primary">
            <ul className="flex items-center gap-7">
              {barLinks.map((l) => {
                const active =
                  l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <li key={l.href} className="relative">
                    <Link
                      href={l.href}
                      className={`link-wipe text-[13.5px] font-semibold transition-colors duration-200 ${
                        active
                          ? "text-madder"
                          : "text-body [@media(hover:hover)]:hover:text-ink"
                      }`}
                    >
                      {l.label}
                    </Link>
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute -bottom-1.5 left-0 h-[2px] w-full rounded-full bg-madder"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {/* Emergency — deliberately NOT a nav link */}
            <Link
              href="/helpline"
              className="tap-shrink inline-flex h-9 items-center gap-2 rounded-full bg-alarm px-3.5 text-[12px] font-bold text-white transition-all duration-200 md:h-10 md:px-5 [@media(hover:hover)]:hover:bg-alarm-deep [@media(hover:hover)]:hover:-translate-y-0.5"
              aria-label="Emergency helpline"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <Phone size={13} aria-hidden />
              <span className="hidden sm:inline">Emergency</span>
            </Link>

            <Link
              href="/contact"
              className="tap-shrink hidden h-10 items-center gap-2 rounded-full bg-gradient-to-r from-madder to-grape px-5 text-[12px] font-bold text-white shadow-lg shadow-madder/25 transition-all duration-200 lg:inline-flex [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:brightness-110"
            >
              Contact <span aria-hidden>→</span>
            </Link>

            {/* Mobile menu button */}
            <button
              className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-[6px] lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <motion.span
                animate={open ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.22, ease: EASE_EXPO }}
                className="block h-[2px] w-5 rounded-full bg-ink"
              />
              <motion.span
                animate={open ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.22, ease: EASE_EXPO }}
                className="block h-[2px] w-5 rounded-full bg-ink"
              />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col bg-ivory/97 lg:hidden"
            style={{ backgroundColor: "rgba(238,242,247,0.985)" }}
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_EXPO }}
          >
            <nav
              className="flex flex-1 flex-col justify-center px-8 pt-16"
              aria-label="Mobile"
            >
              <ul className="space-y-3">
                {site.nav.map((l, i) => {
                  const active =
                    l.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(l.href);
                  const isEmergency = l.href === "/helpline";
                  return (
                    <li key={l.href} className="overflow-hidden">
                      <motion.div
                        initial={reduce ? false : { y: "110%" }}
                        animate={{ y: "0%" }}
                        transition={{
                          duration: 0.4,
                          delay: 0.04 + i * 0.05,
                          ease: EASE_EXPO,
                        }}
                      >
                        <Link
                          href={l.href}
                          className={`flex items-center gap-3 font-display text-4xl font-bold tracking-[-0.02em] ${
                            isEmergency
                              ? "text-alarm"
                              : active
                                ? "text-madder"
                                : "text-ink"
                          }`}
                        >
                          {isEmergency && (
                            <span className="relative flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alarm/60" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-alarm" />
                            </span>
                          )}
                          {l.label}
                        </Link>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <motion.div
              className="border-t border-line px-8 py-5"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.3 }}
            >
              <p className="text-xs font-semibold text-body">
                {site.contact.addressLines[0]}, {site.contact.addressLines[1]}
              </p>
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                className="mt-1.5 block font-display text-xl font-bold text-ink"
              >
                {site.contact.phone}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

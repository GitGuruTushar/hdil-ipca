"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { EASE_EXPO } from "@/components/site/motion";

/* Clip-path + scale reveal used for every gallery image */
function ClipReveal({ children, delay = 0, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(8% 0 8% 0)", scale: 1.08, opacity: 0 }}
      whileInView={{ clipPath: "inset(0 0 0 0)", scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/* Asymmetric 12-col arrangements — alternate per album */
const LAYOUTS = [
  [
    "lg:col-span-7 aspect-[4/3] lg:-ml-8",
    "lg:col-span-5 aspect-[4/5] lg:translate-y-10",
    "lg:col-span-5 aspect-square",
    "lg:col-span-7 aspect-[16/10] lg:translate-y-6",
  ],
  [
    "lg:col-span-5 aspect-[4/5]",
    "lg:col-span-7 aspect-[4/3] lg:translate-y-10 lg:-mr-8",
    "lg:col-span-7 aspect-[16/10]",
    "lg:col-span-5 aspect-square lg:translate-y-6",
  ],
];

export default function GalleryAlbums() {
  const [open, setOpen] = useState(null); // { album: idx, img: idx }
  const reduce = useReducedMotion();
  const albums = site.gallery.albums;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  const step = (dir) =>
    setOpen((o) => {
      if (!o) return o;
      const imgs = albums[o.album].images;
      return { ...o, img: (o.img + dir + imgs.length) % imgs.length };
    });

  const current = open ? albums[open.album].images[open.img] : null;

  return (
    <div className="mx-auto max-w-site px-5 pb-24 md:px-8 md:pb-36">
      {albums.map((album, ai) => (
        <section key={album.title} className="mt-14 md:mt-20">
          <div className="mb-7 grid gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-madder">
                {album.date}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.015em] text-ink md:text-3xl">
                {album.title}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-body lg:col-span-4 lg:col-start-9 lg:text-right">
              {album.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
            {album.images.map((img, ii) => (
              <ClipReveal
                key={img.src + ii}
                delay={ii * 0.06}
                className={LAYOUTS[ai % 2][ii % 4]}
              >
                <button
                  onClick={() => setOpen({ album: ai, img: ii })}
                  className="group glass glass-shadow hover-lift block h-full w-full rounded-[1.5rem] p-2.5 text-left"
                  aria-label={`Open photo: ${img.alt}`}
                >
                  <div className="relative h-[calc(100%-2.4rem)] min-h-[10rem] w-full overflow-hidden rounded-[1rem]">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 ease-out-quint [@media(hover:hover)]:group-hover:scale-105"
                    />
                  </div>
                  <span className="block px-2 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-body">
                    {img.alt}
                  </span>
                </button>
              </ClipReveal>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-14 text-center text-xs font-semibold text-body/70 md:mt-20">
        Photographs from federation events and works across the park.
      </p>

      {/* Lightbox */}
      <AnimatePresence>
        {open && current && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-ink/95 text-white"
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_EXPO }}
            role="dialog"
            aria-modal="true"
            aria-label={`${albums[open.album].title} — photo viewer`}
          >
            <div className="flex items-center justify-between p-5 md:p-8">
              <p className="font-display text-lg font-bold md:text-xl">
                {open.img + 1} <span className="text-white/50">/ {albums[open.album].images.length}</span>
              </p>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close photo viewer"
                className="tap-shrink flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 transition-colors duration-200 [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center px-5 md:px-20">
              <button
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute left-4 z-10 hidden h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 transition-colors duration-200 md:flex [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-ink"
              >
                <ChevronLeft size={18} />
              </button>
              <AnimatePresence mode="wait">
                <motion.div
                  key={open.img}
                  className="relative h-[60svh] w-full max-w-5xl"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -60) step(1);
                    else if (info.offset.x > 60) step(-1);
                  }}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Image
                    src={current.src}
                    alt={current.alt}
                    fill
                    sizes="100vw"
                    className="pointer-events-none select-none object-contain"
                  />
                </motion.div>
              </AnimatePresence>
              <button
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute right-4 z-10 hidden h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 transition-colors duration-200 md:flex [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-ink"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="p-5 text-center md:p-8">
              <p className="text-sm font-medium text-white/90">{current.alt}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                {albums[open.album].title}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

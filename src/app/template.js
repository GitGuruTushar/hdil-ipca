// app/template.js
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import axiosInstance from "@/utils/axiosInstance";
import SiteNavbar from "@/components/site/navbar";
import SiteFooter from "@/components/site/footer";
import SmoothScroll from "@/components/site/smooth-scroll";
import MeshBackground from "@/components/site/mesh-background";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

// Keeps the root <html lang> in sync with the active language after
// hydration — the static export can't set this at build time per-visitor,
// so it's a client-side sync instead (standard pattern for statically
// exported, client-switched i18n).
function SyncHtmlLang() {
  const { lang } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

function PublicChrome({ children }) {
  const reduce = useReducedMotion();
  // Fetched once here (not per-page) so it persists across client-side route
  // changes and every public page shares one navbar/footer render of it.
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/site-settings")
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  return (
    <I18nProvider>
      <SyncHtmlLang />
      <div className="bg-ivory">
        <MeshBackground />
        <SmoothScroll />
        <SiteNavbar settings={settings} />
        <motion.main
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen"
        >
          {children}
        </motion.main>
        <SiteFooter settings={settings} />
      </div>
    </I18nProvider>
  );
}

export default function Template({ children }) {
  const pathname = usePathname();
  const isApp =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/checkin");

  // Admin, dashboard, and every auth/app-adjacent route keep their own chrome —
  // never the public site navbar/footer/mesh background.
  if (isApp) return children;

  return <PublicChrome>{children}</PublicChrome>;
}

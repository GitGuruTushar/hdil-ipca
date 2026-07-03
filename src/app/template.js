// app/template.js
"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import SiteNavbar from "@/components/site/navbar";
import SiteFooter from "@/components/site/footer";
import SmoothScroll from "@/components/site/smooth-scroll";
import MeshBackground from "@/components/site/mesh-background";

export default function Template({ children }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAdmin = pathname?.startsWith("/admin");

  // Admin & dashboard keep their own chrome (Phase 2 — untouched)
  if (isAdmin) return children;
  if (isDashboard) {
    return (
      <>
        <SiteNavbar />
        {children}
      </>
    );
  }

  return (
    <div className="bg-ivory">
      <MeshBackground />
      <SmoothScroll />
      <SiteNavbar />
      <motion.main
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen"
      >
        {children}
      </motion.main>
      <SiteFooter />
    </div>
  );
}

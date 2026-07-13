"use client";
import { useEffect } from "react";

// Renders nothing — registers the service worker on mount so the PWA is
// installable and can receive push. Guarded so it never throws on browsers
// without the serviceWorker API (older Safari, some in-app webviews, etc).
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

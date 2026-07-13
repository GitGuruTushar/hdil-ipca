"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Download, X } from "lucide-react";
import { subscribeToPush } from "@/utils/push";

// How long a dismissal of the install pill is remembered before we show it
// again on a later visit.
const DISMISS_KEY = "hdil-install-prompt-dismissed-until";
const DISMISS_DAYS = 14;

// Grace period to wait for `beforeinstallprompt` before assuming the browser
// doesn't support it (Safari, Firefox, etc. never fire it at all).
const UNSUPPORTED_GRACE_MS = 2500;

// Renders nothing unless the browser has offered an install prompt (Chrome/
// Edge/Android) or we can offer a lighter "enable notifications" nudge
// instead. Mounted site-wide, so it makes no assumptions about layout —
// purely a fixed-position overlay that stays clear of any bottom nav bar.
export default function InstallPrompt() {
  const deferredPromptRef = useRef(null);
  const beforeInstallFiredRef = useRef(false);

  const [showInstall, setShowInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let dismissedUntil = 0;
    try {
      dismissedUntil = Number(localStorage.getItem(DISMISS_KEY)) || 0;
    } catch {
      dismissedUntil = 0;
    }
    const isDismissed = Date.now() < dismissedUntil;

    const maybeShowNotifPrompt = () => {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "default") return;
      setShowNotif(true);
    };

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      beforeInstallFiredRef.current = true;
      deferredPromptRef.current = event;
      if (!isDismissed) setShowInstall(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setShowInstall(false);
      maybeShowNotifPrompt();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // If beforeinstallprompt never fires, this browser doesn't support the
    // install prompt at all — fall back to the lighter notification nudge.
    const fallbackTimer = window.setTimeout(() => {
      if (!beforeInstallFiredRef.current) {
        maybeShowNotifPrompt();
      }
    }, UNSUPPORTED_GRACE_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    const event = deferredPromptRef.current;
    if (!event) {
      setShowInstall(false);
      return;
    }
    setInstalling(true);
    try {
      event.prompt();
      await event.userChoice;
    } catch {
      // User dismissed the native prompt, or it failed — either way we're done with it.
    } finally {
      deferredPromptRef.current = null;
      setInstalling(false);
      setShowInstall(false);
    }
  };

  const handleDismissInstall = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      // localStorage unavailable (private mode, disabled) — just hide for this session.
    }
    setShowInstall(false);
  };

  const handleEnableNotifications = async () => {
    setSubscribing(true);
    await subscribeToPush();
    setSubscribing(false);
    setShowNotif(false);
  };

  const handleDismissNotif = () => {
    setShowNotif(false);
  };

  if (!showInstall && !showNotif) return null;

  // Bottom-center on mobile (well clear of member-shell's fixed bottom tab
  // bar, which sits at z-30), bottom-right on desktop. z-40 so it always
  // sits above any bottom nav.
  const positionClass =
    "fixed z-40 left-1/2 -translate-x-1/2 bottom-24 w-[calc(100%-2rem)] max-w-sm md:left-auto md:right-6 md:translate-x-0 md:bottom-6 md:w-96";

  if (showNotif) {
    return (
      <div className={positionClass}>
        <div className="app-glass glass-shadow rounded-2xl p-3.5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-madder to-grape text-white flex items-center justify-center flex-none">
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-ink">Stay in the loop</div>
            <div className="text-[11.5px] text-body mt-0.5">
              Turn on notifications for notices, dues reminders and updates from the federation.
            </div>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={subscribing}
              className="mt-2.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            >
              {subscribing ? "Enabling…" : "Enable notifications"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleDismissNotif}
            aria-label="Dismiss"
            className="h-6 w-6 rounded-full flex items-center justify-center text-body/70 flex-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={positionClass}>
      <div className="app-glass glass-shadow rounded-2xl p-3.5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-madder to-grape text-white flex items-center justify-center flex-none">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold text-ink">Install HDIL-IPCA</div>
          <div className="text-[11.5px] text-body mt-0.5">
            Add the app to your home screen for quick access and the latest updates.
          </div>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="mt-2.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
          >
            {installing ? "Installing…" : "Install"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleDismissInstall}
          aria-label="Dismiss"
          className="h-6 w-6 rounded-full flex items-center justify-center text-body/70 flex-none"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("shared.nav.justNow", "just now");
  if (mins < 60) return `${mins}${t("shared.nav.minutesAgoSuffix", "m ago")}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t("shared.nav.hoursAgoSuffix", "h ago")}`;
  return `${Math.floor(hrs / 24)}${t("shared.nav.daysAgoSuffix", "d ago")}`;
}

// Unread count polls every 30s so the badge stays current without the user
// needing to refresh — the dropdown itself fetches fresh on open.
export default function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const fetchUnread = useCallback(() => {
    axiosInstance
      .get("/notifications/unread-count")
      .then((res) => setUnread(res.data.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const openDropdown = () => {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      axiosInstance
        .get("/notifications")
        .then((res) => setNotifications(res.data || []))
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    }
  };

  const markAllRead = () => {
    axiosInstance.put("/notifications/read-all").then(() => {
      setUnread(0);
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    });
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        aria-label={t("shared.nav.notifications", "Notifications")}
        className="relative h-9 w-9 rounded-full border border-line bg-white flex items-center justify-center"
      >
        <Bell className="h-4 w-4 text-ink" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-alarm text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? t("shared.nav.countOverflow", "9+") : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-80 app-glass glass-shadow rounded-2xl p-1.5 z-30">
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-body">{t("shared.nav.notifications", "Notifications")}</span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-[11px] font-semibold text-madder">
                {t("shared.nav.markAllRead", "Mark all read")}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <div className="px-3 py-3 text-xs text-body">{t("shared.nav.loading", "Loading…")}</div>}
            {!loading && notifications.length === 0 && (
              <div className="px-3 py-4 text-xs text-body text-center">{t("shared.nav.allCaughtUp", "You’re all caught up.")}</div>
            )}
            {!loading &&
              notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => {
                    if (!n.read) {
                      axiosInstance.put(`/notifications/${n._id}/read`).then(() => {
                        setUnread((u) => Math.max(0, u - 1));
                      });
                    }
                    if (n.link) window.location.href = n.link;
                  }}
                  className="w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-ivory text-left"
                >
                  <span className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-none ${n.read ? "bg-line" : "bg-madder"}`} />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold text-ink">{n.title}</span>
                    {n.body && <span className="block text-[11.5px] text-body mt-0.5 line-clamp-2">{n.body}</span>}
                    <span className="block text-[10px] text-body/70 mt-1">{timeAgo(n.createdAt, t)}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

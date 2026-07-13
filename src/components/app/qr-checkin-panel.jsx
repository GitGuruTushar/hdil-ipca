"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import axiosInstance from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

// One shared code per workshop — the organizer displays/prints this at the
// venue and each attendee scans it with their own phone's camera app (it's
// just a normal URL, no in-app scanner needed). Manual fallback below covers
// attendees without a smartphone or with a connectivity issue.
export default function QrCheckinPanel({ workshop }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [info, setInfo] = useState(null);
  const [manualQuery, setManualQuery] = useState("");
  const [checkedInCount, setCheckedInCount] = useState(workshop.checkedInUsers?.length || 0);

  useEffect(() => {
    axiosInstance
      .get(`/workshops/${workshop._id}/checkin-info`)
      .then((res) => setInfo(res.data))
      .catch(() => {});
  }, [workshop._id]);

  const sendReminder = () => {
    axiosInstance
      .post(`/workshops/${workshop._id}/send-reminder`)
      .then(() => toast({ title: t("shared.forms.qrCheckinPanel.reminderSentTitle", "Reminder sent") }))
      .catch(() => toast({ title: t("shared.forms.qrCheckinPanel.reminderFailedTitle", "Couldn't send reminder"), variant: "destructive" }));
  };

  const registered = workshop.registeredUsers?.length || 0;
  const capacity = workshop.capacity || 1;

  return (
    <div>
      <div className="w-full h-1.5 rounded-full bg-ivory overflow-hidden mb-1.5">
        <div className="h-full bg-gradient-to-r from-madder to-grape" style={{ width: `${Math.min(100, (registered / capacity) * 100)}%` }} />
      </div>
      <div className="text-[11.5px] text-body mb-4">
        {registered} / {capacity} {t("shared.forms.qrCheckinPanel.registeredLabel", "registered")} &middot; {checkedInCount}{" "}
        {t("shared.forms.qrCheckinPanel.checkedInLabel", "checked in")}
      </div>

      {info?.checkinUrl ? (
        <div className="flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl border border-line">
            <QRCodeSVG value={info.checkinUrl} size={140} fgColor="#171B26" />
          </div>
          <p className="text-[11px] text-body text-center mt-2 max-w-[220px]">
            {t(
              "shared.forms.qrCheckinPanel.qrInstructions",
              "Print or display at the venue — each attendee scans with their own phone to self-check-in."
            )}
          </p>
        </div>
      ) : (
        <div className="text-[12px] text-body">{t("shared.forms.qrCheckinPanel.loadingCode", "Loading check-in code…")}</div>
      )}

      <ManualCheckin workshopId={workshop._id} onChecked={() => setCheckedInCount((c) => c + 1)} />

      <button
        onClick={sendReminder}
        className="w-full mt-3 h-9 rounded-full bg-gradient-to-r from-madder to-grape text-white text-[12.5px] font-bold"
      >
        {t("shared.forms.qrCheckinPanel.sendReminderButton", "Send reminder now")}
      </button>
    </div>
  );
}

// Public search only indexes public content (never member accounts, by design)
// so this looks members up via the admin-only members list instead, filtered
// client-side — fine at this scale (a few hundred members per federation).
function ManualCheckin({ workshopId, onChecked }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState(null);

  useEffect(() => {
    if (!open || members.length) return;
    setLoading(true);
    axiosInstance
      .get("/auth/users", { params: { limit: 200 } })
      .then((res) => setMembers(res.data.users || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open, members.length]);

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return m.fullName?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  const checkIn = (userId) => {
    setCheckingId(userId);
    axiosInstance
      .post(`/workshops/${workshopId}/checkin-manual`, { userId })
      .then(() => {
        toast({ title: t("shared.forms.qrCheckinPanel.checkedInToastTitle", "Checked in") });
        onChecked?.();
      })
      .catch(() => toast({ title: t("shared.forms.qrCheckinPanel.checkInFailedTitle", "Couldn't check them in"), variant: "destructive" }))
      .finally(() => setCheckingId(null));
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 rounded-full border border-line bg-white text-[12.5px] font-bold text-ink"
      >
        {open
          ? t("shared.forms.qrCheckinPanel.closeManualCheckinButton", "Close manual check-in")
          : t("shared.forms.qrCheckinPanel.openManualCheckinButton", "+ Manual check-in")}
      </button>
      {open && (
        <div className="mt-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("shared.forms.qrCheckinPanel.searchPlaceholder", "Search by name, username, or email…")}
            className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[12.5px] outline-none"
          />
          {loading && <div className="text-[11px] text-body mt-2">{t("shared.forms.qrCheckinPanel.loadingMembers", "Loading members…")}</div>}
          {!loading && query.trim() && (
            <div className="mt-1.5 max-h-40 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-[11px] text-body px-1 py-2">{t("shared.forms.qrCheckinPanel.noMatches", "No matches.")}</div>
              )}
              {filtered.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  disabled={checkingId === m._id}
                  onClick={() => checkIn(m._id)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-ivory text-left disabled:opacity-50"
                >
                  <span className="text-[12px] text-ink truncate">{getDisplayName(m, nicknames)}</span>
                  <span className="text-[10px] font-bold text-madder flex-none">
                    {checkingId === m._id ? t("shared.forms.qrCheckinPanel.checkingInEllipsis", "…") : t("shared.forms.qrCheckinPanel.checkInLabel", "Check in")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

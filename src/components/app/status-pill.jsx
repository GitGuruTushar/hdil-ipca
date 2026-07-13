"use client";
import { useI18n } from "@/i18n/I18nProvider";

const VARIANTS = {
  draft: "bg-ivory text-body",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  everyone: "bg-emerald-100 text-emerald-800",
  owners: "bg-[#E5E3FB] text-[#4338CA]",
  tenants: "bg-amber-100 text-amber-800",
  open: "bg-emerald-100 text-emerald-800",
  closed: "bg-ivory text-body",
  "in-progress": "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  new: "bg-[#E5E3FB] text-[#4338CA]",
  reviewed: "bg-ivory text-body",
  shortlisted: "bg-[#E5E3FB] text-[#4338CA]",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  read: "bg-ivory text-body",
  approved: "bg-emerald-100 text-emerald-800",
  disabled: "bg-red-100 text-red-700",
  admin: "bg-[#E5E3FB] text-[#4338CA]",
  moderator: "bg-amber-100 text-amber-800",
  member: "bg-ivory text-body",
};

// A single small color-coded label for any of the app's status/role enums.
// Pass the raw backend value as `status` — casing/spacing is normalized.
export default function StatusPill({ status, label, className = "" }) {
  const { t } = useI18n();
  const key = String(status || "").toLowerCase();
  const classes = VARIANTS[key] || "bg-ivory text-body";
  // When the caller doesn't pass an explicit label, translate the raw enum
  // value itself so status pills (published/pending/open/...) read correctly
  // in Hindi/Marathi too, not just the surrounding page copy.
  const resolvedLabel = label || (key ? t(`shared.widgets.statusPill.${key}`, status) : status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${classes} ${className}`}
    >
      {resolvedLabel}
    </span>
  );
}

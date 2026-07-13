"use client";
import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import StatusPill from "@/components/app/status-pill";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

const PAGE_SIZE = 25;

// Only the target types we know are logged in practice — the backend field
// itself is free text, so anything else the filter doesn't cover still shows
// up fine in the unfiltered "All types" view.
const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "User", label: "User" },
  { value: "Notice", label: "Notice" },
  { value: "Poll", label: "Poll" },
  { value: "Update", label: "Update" },
  { value: "Workshop", label: "Workshop" },
  { value: "Industry", label: "Industry" },
];

const TYPE_FILTER_KEYS = {
  "": "admin.misc.auditLog.filterAllTypes",
  User: "admin.misc.auditLog.filterUser",
  Notice: "admin.misc.auditLog.filterNotice",
  Poll: "admin.misc.auditLog.filterPoll",
  Update: "admin.misc.auditLog.filterUpdate",
  Workshop: "admin.misc.auditLog.filterWorkshop",
  Industry: "admin.misc.auditLog.filterIndustry",
};

// "approved_member" -> "Approved member" — sentence case, no dependency needed.
function humanizeAction(action, t) {
  if (!action) return t("admin.misc.auditLog.defaultAction", "Performed an action");
  const spaced = String(action).replace(/_/g, " ").trim();
  if (!spaced) return t("admin.misc.auditLog.defaultAction", "Performed an action");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Small local relative-time formatter — falls back to an absolute date once
// an entry is more than a month old, since "4 weeks ago" stops being useful.
function relativeTime(iso, t) {
  if (!iso) return t("admin.misc.auditLog.noDate", "—");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t("admin.misc.auditLog.noDate", "—");

  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return t("admin.misc.auditLog.justNow", "just now");
  if (diffSec < 60) return `${diffSec}${t("admin.misc.auditLog.secondsAgoSuffix", "s ago")}`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} ${
      diffMin === 1
        ? t("admin.misc.auditLog.minuteAgo", "minute ago")
        : t("admin.misc.auditLog.minutesAgo", "minutes ago")
    }`;
  }

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} ${
      diffHour === 1
        ? t("admin.misc.auditLog.hourAgo", "hour ago")
        : t("admin.misc.auditLog.hoursAgo", "hours ago")
    }`;
  }

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) {
    return `${diffDay} ${
      diffDay === 1 ? t("admin.misc.auditLog.dayAgo", "day ago") : t("admin.misc.auditLog.daysAgo", "days ago")
    }`;
  }

  const diffWeek = Math.round(diffDay / 7);
  if (diffDay < 30) {
    return `${diffWeek} ${
      diffWeek === 1
        ? t("admin.misc.auditLog.weekAgo", "week ago")
        : t("admin.misc.auditLog.weeksAgo", "weeks ago")
    }`;
  }

  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AuditLogPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    axiosInstance
      .get("/audit-log", { params: { page, limit: PAGE_SIZE, targetType: typeFilter || undefined } })
      .then((res) => {
        setEntries(res.data.entries || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        const message = apiErrorMessage(err);
        setError(message);
        toast({
          title: t("admin.misc.auditLog.toastLoadErrorTitle", "Couldn't load audit log"),
          description: message,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (value) => {
    setTypeFilter(value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title={t("admin.misc.auditLog.pageTitle", "Audit log")}
        description={t("admin.misc.auditLog.pageDescription", "Every consequential admin action, in order.")}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {TYPE_FILTERS.map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => changeFilter(opt.value)}
            className={
              typeFilter === opt.value
                ? "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                : "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white"
            }
          >
            {t(TYPE_FILTER_KEYS[opt.value], opt.label)}
          </button>
        ))}
      </div>

      <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && entries.length === 0 && (
          <EmptyState
            icon={History}
            title={t("admin.misc.auditLog.errorEmptyTitle", "Couldn't load the audit log")}
            description={error}
            action={
              <button
                type="button"
                onClick={load}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.misc.auditLog.tryAgainButton", "Try again")}
              </button>
            }
          />
        )}

        {!loading && !error && entries.length === 0 && (
          <EmptyState
            icon={History}
            title={t("admin.misc.auditLog.emptyTitle", "No activity yet")}
            description={
              typeFilter
                ? `${t(
                    "admin.misc.auditLog.emptyDescriptionFilteredPrefix",
                    'No logged actions against "'
                  )}${typeFilter}${t(
                    "admin.misc.auditLog.emptyDescriptionFilteredSuffix",
                    '" yet — try a different filter.'
                  )}`
                : t(
                    "admin.misc.auditLog.emptyDescription",
                    "Consequential admin actions — approvals, edits, deletions — will show up here as they happen."
                  )
            }
            action={
              typeFilter && (
                <button
                  type="button"
                  onClick={() => changeFilter("")}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
                >
                  {t("admin.misc.auditLog.clearFilter", "Clear filter")}
                </button>
              )
            }
          />
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            <ul>
              {entries.map((entry, idx) => {
                const actorName = entry.actor
                  ? getDisplayName(entry.actor, nicknames)
                  : t("admin.misc.auditLog.unknownUser", "Unknown user");
                const isLast = idx === entries.length - 1;
                return (
                  <li key={entry._id} className="flex gap-3 px-4 py-3.5">
                    <div className="flex flex-col items-center flex-none">
                      <span className="h-2 w-2 rounded-full bg-madder mt-1.5" />
                      {!isLast && <span className="w-px flex-1 bg-line mt-1" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-0.5">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="font-semibold text-ink text-[13.5px] truncate max-w-[220px]">{actorName}</span>
                        <span className="text-body text-[13px]">{humanizeAction(entry.action, t)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <StatusPill status={entry.targetType} />
                        <span className="text-[11px] text-body/70 whitespace-nowrap">
                          {relativeTime(entry.createdAt, t)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="p-4 border-t border-line">
              <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

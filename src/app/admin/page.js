"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Briefcase,
  Receipt,
  UserCheck,
  MessageSquareWarning,
  Mail,
  Newspaper,
  Megaphone,
  CalendarDays,
  UserCircle2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/app/page-header";
import { StatCard, MetricGrid } from "@/components/app/stat-card";
import EmptyState from "@/components/app/empty-state";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("admin.dashboard.timeAgo.justNow", "just now");
  if (mins < 60) return `${mins}${t("admin.dashboard.timeAgo.minutesSuffix", "m ago")}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t("admin.dashboard.timeAgo.hoursSuffix", "h ago")}`;
  return `${Math.floor(hrs / 24)}${t("admin.dashboard.timeAgo.daysSuffix", "d ago")}`;
}

const QUICK_ACTIONS = [
  { key: "updates", label: "Updates & news", href: "/admin/updates", icon: Newspaper },
  { key: "notices", label: "Notices", href: "/admin/notices", icon: Megaphone },
  { key: "workshops", label: "Workshops", href: "/admin/workshops", icon: CalendarDays },
  { key: "members", label: "Members", href: "/admin/members", icon: UserCircle2 },
];

export default function AdminDashboard() {
  const { t } = useI18n();
  const { nicknames } = useNicknames();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    industries: 0,
    members: 0,
    vacancies: 0,
    pendingDues: 0,
    pendingApprovals: 0,
  });
  const [attention, setAttention] = useState({
    pending: [],
    grievances: [],
    contact: [],
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      axiosInstance.get("/industries", { params: { limit: 1 } }).then((r) => r.data.total ?? 0).catch(() => 0),
      axiosInstance.get("/auth/users", { params: { limit: 1 } }).then((r) => r.data.total ?? 0).catch(() => 0),
      axiosInstance.get("/vacancies").then((r) => (r.data.vacancies || []).length).catch(() => 0),
      axiosInstance.get("/dues", { params: { status: "pending", limit: 1 } }).then((r) => r.data.total ?? 0).catch(() => 0),
      axiosInstance.get("/auth/pending", { params: { limit: 1 } }).then((r) => r.data.total ?? 0).catch(() => 0),
    ]).then(([industries, members, vacancies, pendingDues, pendingApprovals]) => {
      if (cancelled) return;
      setMetrics({ industries, members, vacancies, pendingDues, pendingApprovals });
    });

    Promise.all([
      axiosInstance.get("/auth/pending", { params: { limit: 5 } }).then((r) => r.data.users || []).catch(() => []),
      axiosInstance.get("/grievances", { params: { status: "open", limit: 5 } }).then((r) => r.data.grievances || []).catch(() => []),
      axiosInstance.get("/contact", { params: { status: "new", limit: 5 } }).then((r) => r.data.messages || []).catch(() => []),
    ]).then(([pending, grievances, contact]) => {
      if (cancelled) return;
      setAttention({ pending, grievances, contact });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const attentionItems = [
    ...attention.pending.map((u) => ({
      key: `pending-${u._id}`,
      href: "/admin/members",
      icon: UserCheck,
      title: `${getDisplayName(u, nicknames)} ${t("admin.dashboard.attention.signedUpSuffix", "signed up")}`,
      subtitle: t("admin.dashboard.attention.awaitingApproval", "Awaiting approval"),
      time: u.createdAt,
    })),
    ...attention.grievances.map((g) => ({
      key: `grievance-${g._id}`,
      href: "/admin/grievances",
      icon: MessageSquareWarning,
      title: g.subject,
      subtitle: `${t("admin.dashboard.attention.fromPrefix", "From")} ${g.member ? getDisplayName(g.member, nicknames) : t("admin.dashboard.attention.aMember", "a member")}`,
      time: g.createdAt,
    })),
    ...attention.contact.map((c) => ({
      key: `contact-${c._id}`,
      href: "/admin/contact",
      icon: Mail,
      title: `${t("admin.dashboard.attention.messageFromPrefix", "Message from")} ${c.name}`,
      subtitle: c.message,
      time: c.createdAt,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div>
      <PageHeader
        title={t("admin.dashboard.title", "Dashboard")}
        description={t("admin.dashboard.description", "Here's what's happening across the federation.")}
      />

      <MetricGrid>
        <StatCard label={t("admin.dashboard.metrics.businessListings", "Business listings")} value={loading ? "…" : metrics.industries} icon={Building2} />
        <StatCard label={t("admin.dashboard.metrics.members", "Members")} value={loading ? "…" : metrics.members} icon={Users} />
        <StatCard label={t("admin.dashboard.metrics.openVacancies", "Open vacancies")} value={loading ? "…" : metrics.vacancies} icon={Briefcase} />
        <StatCard
          label={t("admin.dashboard.metrics.pendingDues", "Pending dues")}
          value={loading ? "…" : metrics.pendingDues}
          icon={Receipt}
          warn={metrics.pendingDues > 0}
        />
        <StatCard
          label={t("admin.dashboard.metrics.pendingApprovals", "Pending approvals")}
          value={loading ? "…" : metrics.pendingApprovals}
          icon={UserCheck}
          warn={metrics.pendingApprovals > 0}
        />
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2 app-glass glass-shadow rounded-2xl p-4 sm:p-5">
          <h2 className="font-display text-base font-bold text-ink mb-3.5">{t("admin.dashboard.attention.heading", "Needs your attention")}</h2>

          {loading ? (
            <div className="text-sm text-body py-8 text-center">{t("admin.dashboard.attention.loading", "Loading…")}</div>
          ) : attentionItems.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t("admin.dashboard.attention.emptyState.title", "All caught up")}
              description={t("admin.dashboard.attention.emptyState.description", "No pending approvals, open grievances, or new messages right now.")}
            />
          ) : (
            <div className="space-y-1.5">
              {attentionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-ivory transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-full bg-ivory flex items-center justify-center flex-none mt-0.5">
                      <Icon className="h-4 w-4 text-body" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink truncate">{item.title}</div>
                      <div className="text-[12px] text-body truncate">{item.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-none text-[11px] text-body/70 mt-1">
                      {timeAgo(item.time, t)}
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5">
          <h2 className="font-display text-base font-bold text-ink mb-3.5">{t("admin.dashboard.quickActions.heading", "Quick actions")}</h2>
          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white flex items-center gap-2 hover:bg-ivory transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
                  <span className="truncate">{t(`admin.dashboard.quickActions.items.${action.key}`, action.label)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

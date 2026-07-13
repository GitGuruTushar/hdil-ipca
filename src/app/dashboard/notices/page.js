"use client";
import { useEffect, useState } from "react";
import { Megaphone, FileText } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import StatusPill from "@/components/app/status-pill";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

function NoticeAttachment({ attachment }) {
  if (attachment.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.url}
        alt=""
        className="h-20 w-20 rounded-lg object-cover border border-line cursor-pointer"
        onClick={() => window.open(attachment.url, "_blank")}
      />
    );
  }
  if (attachment.type === "video") {
    return <video src={attachment.url} controls className="h-20 w-auto max-w-full rounded-lg border border-line" />;
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="h-14 px-3 rounded-lg border border-line bg-ivory flex items-center gap-1.5 text-[12px] font-semibold text-ink"
    >
      <FileText className="h-3.5 w-3.5 flex-none" />
      <span className="truncate max-w-[140px]">{attachment.fileName || "Document"}</span>
    </a>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MemberNoticesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { nicknames } = useNicknames();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axiosInstance
      .get("/notices")
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data) ? res.data : [];
        // Backend already sorts newest-first, but sort defensively client-side too.
        const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotices(sorted);
      })
      .catch((err) => {
        if (!active) return;
        toast({ title: t("member.home.noticesPage.toast.loadError", "Couldn't load notices"), description: apiErrorMessage(err), variant: "destructive" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  return (
    <div>
      <PageHeader
        title={t("member.home.noticesPage.title", "Notices")}
        description={t("member.home.noticesPage.description", "Announcements from HDIL-IPCA targeted to you.")}
      />

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl app-glass glass-shadow animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notices.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={t("member.home.noticesPage.emptyState.title", "No notices right now")}
          description={t("member.home.noticesPage.emptyState.description", "You're all caught up — check back later for announcements from HDIL-IPCA.")}
        />
      )}

      {!loading && notices.length > 0 && (
        <div className="space-y-3">
          {notices.map((notice) => {
            const expired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
            return (
              <div key={notice._id} className="app-glass glass-shadow rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-bold text-ink text-[14.5px] leading-snug min-w-0 break-words">{notice.title}</h3>
                  <StatusPill status={notice.targetAudience} className="flex-none" />
                </div>

                <div
                  className="rich-content text-[13px] text-body mb-3"
                  dangerouslySetInnerHTML={{ __html: notice.content || "" }}
                />

                {notice.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {notice.attachments.map((a, i) => (
                      <NoticeAttachment key={a.url || i} attachment={a} />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  {notice.targetBuilding != null && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap">
                      {t("member.home.noticesPage.buildingPrefix", "Bldg")} {notice.targetBuilding}
                    </span>
                  )}
                  {notice.targetGala != null && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap">
                      {t("member.home.noticesPage.galaPrefix", "Gala")} {notice.targetGala}
                    </span>
                  )}
                  <span className={`ml-auto text-[11px] whitespace-nowrap ${expired ? "text-alarm font-semibold" : "text-body"}`}>
                    {expired
                      ? t("member.home.noticesPage.expiredLabel", "Expired")
                      : t("member.home.noticesPage.expiresLabel", "Expires")}{" "}
                    {formatDate(notice.expiresAt)}
                  </span>
                </div>

                {notice.createdBy && (
                  <p className="mt-2 text-[11px] text-body/70">
                    {t("member.home.noticesPage.postedByPrefix", "Posted by")} {getDisplayName(notice.createdBy, nicknames)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

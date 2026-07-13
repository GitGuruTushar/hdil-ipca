"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import StatusPill from "@/components/app/status-pill";
import ConfirmDialog from "@/components/app/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
];

const STATUS_FILTER_KEYS = {
  "": "admin.misc.contactMessages.filterAll",
  new: "admin.misc.contactMessages.filterNew",
  read: "admin.misc.contactMessages.filterRead",
};

const formatDateTime = (d, t) => {
  if (!d) return t("admin.misc.contactMessages.noDate", "—");
  return new Date(d).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ContactMessagesPage() {
  const { toast } = useToast();
  const { t } = useI18n();

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/contact", { params: { page, limit: 20, status: statusFilter || undefined } })
      .then((res) => {
        setMessages(res.data.messages || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.misc.contactMessages.toastLoadErrorTitle", "Couldn't load messages"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const markRead = (msg) => {
    setMarkingId(msg._id);
    axiosInstance
      .put(`/contact/${msg._id}/read`)
      .then(() => {
        setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, status: "read" } : m)));
        toast({ title: t("admin.misc.contactMessages.toastMarkReadSuccessTitle", "Marked as read") });
      })
      .catch((err) => {
        toast({
          title: t("admin.misc.contactMessages.toastMarkReadErrorTitle", "Couldn't mark as read"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setMarkingId(null));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    axiosInstance
      .delete(`/contact/${deleteTarget._id}`)
      .then(() => {
        setMessages((prev) => prev.filter((m) => m._id !== deleteTarget._id));
        setTotal((prevTotal) => Math.max(0, prevTotal - 1));
        toast({ title: t("admin.misc.contactMessages.toastDeleteSuccessTitle", "Message deleted") });
        setDeleteTarget(null);
      })
      .catch((err) => {
        toast({
          title: t("admin.misc.contactMessages.toastDeleteErrorTitle", "Couldn't delete message"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDeleteSaving(false));
  };

  return (
    <div>
      <PageHeader
        title={t("admin.misc.contactMessages.pageTitle", "Contact messages")}
        description={t(
          "admin.misc.contactMessages.pageDescription",
          "Messages submitted through the public contact form."
        )}
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => changeFilter(f.value)}
            className={
              statusFilter === f.value
                ? "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                : "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white"
            }
          >
            {t(STATUS_FILTER_KEYS[f.value], f.label)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="app-glass glass-shadow rounded-2xl p-10 text-center text-sm text-body">
          {t("admin.misc.contactMessages.loading", "Loading messages…")}
        </div>
      )}

      {!loading && messages.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={Mail}
            title={
              statusFilter
                ? t("admin.misc.contactMessages.emptyTitleFiltered", "No messages match this filter")
                : t("admin.misc.contactMessages.emptyTitle", "No messages yet")
            }
            description={
              statusFilter
                ? t(
                    "admin.misc.contactMessages.emptyDescriptionFiltered",
                    "Try a different status, or clear the filter to see everything."
                  )
                : t(
                    "admin.misc.contactMessages.emptyDescription",
                    "Messages submitted through the public contact form will show up here."
                  )
            }
            action={
              statusFilter ? (
                <button
                  type="button"
                  onClick={() => changeFilter("")}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
                >
                  {t("admin.misc.contactMessages.clearFilter", "Clear filter")}
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {!loading && messages.length > 0 && (
        <div className="app-glass glass-shadow rounded-2xl divide-y divide-line overflow-hidden">
          {messages.map((m) => {
            const isOpen = expandedId === m._id;
            return (
              <div key={m._id}>
                <button
                  type="button"
                  onClick={() => toggleExpand(m._id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-ink text-[13.5px] truncate max-w-[220px] sm:max-w-none">
                        {m.name}
                      </span>
                      <StatusPill status={m.status} />
                    </div>
                    <div className="text-xs text-body mt-1 truncate">
                      {m.email}
                      {m.phone && <> &middot; {m.phone}</>} &middot; {formatDateTime(m.createdAt, t)}
                    </div>
                    <p className={`text-[13px] text-ink mt-1.5 break-words ${isOpen ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                      {m.message}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-body flex-none mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {m.status === "new" && (
                      <button
                        type="button"
                        disabled={markingId === m._id}
                        onClick={() => markRead(m)}
                        className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                      >
                        {markingId === m._id
                          ? t("admin.misc.contactMessages.markingButton", "Marking…")
                          : t("admin.misc.contactMessages.markReadButton", "Mark read")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-alarm"
                    >
                      {t("admin.misc.contactMessages.deleteButton", "Delete")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.misc.contactMessages.deleteDialogTitle", "Delete this message?")}
        description={t(
          "admin.misc.contactMessages.deleteDialogDescription",
          "This permanently removes the message. This can't be undone."
        )}
        confirmLabel={t("admin.misc.contactMessages.deleteDialogConfirm", "Delete message")}
        loading={deleteSaving}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

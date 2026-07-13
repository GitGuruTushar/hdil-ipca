"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, MessageSquareWarning } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import StatusPill from "@/components/app/status-pill";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

const STATUS_FILTER_DEFS = [
  { value: "", key: "admin.people.grievances.filters.all", label: "All" },
  { value: "open", key: "admin.people.grievances.filters.open", label: "Open" },
  { value: "in-progress", key: "admin.people.grievances.filters.inProgress", label: "In progress" },
  { value: "resolved", key: "admin.people.grievances.filters.resolved", label: "Resolved" },
];

const STATUS_OPTION_DEFS = [
  { value: "open", key: "admin.people.grievances.filters.open", label: "Open" },
  { value: "in-progress", key: "admin.people.grievances.filters.inProgress", label: "In progress" },
  { value: "resolved", key: "admin.people.grievances.filters.resolved", label: "Resolved" },
];

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function GrievancesPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/grievances", { params: { page, limit: 20, status: statusFilter || undefined } })
      .then((res) => {
        setGrievances(res.data.grievances || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.grievances.toasts.loadErrorTitle", "Couldn't load grievances"),
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

  const toggleExpand = (g) => {
    if (expandedId === g._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(g._id);
    setEdits((prev) => ({
      ...prev,
      [g._id]: prev[g._id] || { status: g.status, adminResponse: g.adminResponse || "" },
    }));
  };

  const updateEdit = (id, patch) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = (id) => {
    const edit = edits[id];
    if (!edit) return;
    setSavingId(id);
    axiosInstance
      .put(`/grievances/${id}/status`, { status: edit.status, adminResponse: edit.adminResponse })
      .then((res) => {
        setGrievances((prev) => prev.map((g) => (g._id === id ? res.data : g)));
        setEdits((prev) => ({
          ...prev,
          [id]: { status: res.data.status, adminResponse: res.data.adminResponse || "" },
        }));
        toast({ title: t("admin.people.grievances.toasts.updated", "Grievance updated") });
      })
      .catch((err) => {
        toast({
          title: t("admin.people.grievances.toasts.saveErrorTitle", "Couldn't save changes"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setSavingId(null));
  };

  return (
    <div>
      <PageHeader
        title={t("admin.people.grievances.title", "Grievances")}
        description={t("admin.people.grievances.description", "Member-filed grievances, sorted newest first.")}
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTER_DEFS.map((f) => (
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
            {t(f.key, f.label)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="app-glass glass-shadow rounded-2xl p-10 text-center text-sm text-body">
          {t("admin.people.grievances.loading", "Loading grievances…")}
        </div>
      )}

      {!loading && grievances.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={MessageSquareWarning}
            title={
              statusFilter
                ? t("admin.people.grievances.emptyState.filteredTitle", "No grievances match this filter")
                : t("admin.people.grievances.emptyState.title", "No grievances yet")
            }
            description={
              statusFilter
                ? t(
                    "admin.people.grievances.emptyState.filteredDescription",
                    "Try a different status, or clear the filter to see everything."
                  )
                : t(
                    "admin.people.grievances.emptyState.description",
                    "Grievances filed by members will show up here as soon as one is submitted."
                  )
            }
            action={
              statusFilter ? (
                <button
                  type="button"
                  onClick={() => changeFilter("")}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
                >
                  {t("admin.people.grievances.emptyState.clearFilter", "Clear filter")}
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {!loading && grievances.length > 0 && (
        <div className="app-glass glass-shadow rounded-2xl divide-y divide-line overflow-hidden">
          {grievances.map((g) => {
            const isOpen = expandedId === g._id;
            const edit = edits[g._id] || { status: g.status, adminResponse: g.adminResponse || "" };
            return (
              <div key={g._id}>
                <button
                  type="button"
                  onClick={() => toggleExpand(g)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-ink text-[13.5px] truncate max-w-[220px] sm:max-w-none">
                        {g.subject}
                      </span>
                      <StatusPill status={g.status} />
                    </div>
                    <div className="text-xs text-body mt-1 truncate">
                      {g.member
                        ? getDisplayName(g.member, nicknames)
                        : t("admin.people.grievances.unknownMember", "Unknown member")}{" "}
                      &middot; {formatDateTime(g.createdAt)}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-body flex-none mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl bg-ivory p-3 mb-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-1">
                        {t("admin.people.grievances.form.descriptionLabel", "Description")}
                      </div>
                      <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{g.description}</p>
                    </div>

                    <div className="mb-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-1.5">
                        {t("admin.people.grievances.form.statusLabel", "Status")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTION_DEFS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateEdit(g._id, { status: opt.value })}
                            className={
                              edit.status === opt.value
                                ? "h-7 px-3 rounded-full text-[11.5px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                                : "h-7 px-3 rounded-full text-[11.5px] font-bold text-ink border border-line bg-white"
                            }
                          >
                            {t(opt.key, opt.label)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label
                        htmlFor={`response-${g._id}`}
                        className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-1.5 block"
                      >
                        {t("admin.people.grievances.form.adminResponseLabel", "Admin response")}
                      </label>
                      <textarea
                        id={`response-${g._id}`}
                        value={edit.adminResponse}
                        onChange={(e) => updateEdit(g._id, { adminResponse: e.target.value })}
                        maxLength={1000}
                        rows={3}
                        placeholder={t(
                          "admin.people.grievances.form.adminResponsePlaceholder",
                          "Add a response the member will see…"
                        )}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={savingId === g._id}
                      onClick={() => save(g._id)}
                      className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                    >
                      {savingId === g._id
                        ? t("admin.people.grievances.form.saving", "Saving…")
                        : t("admin.people.grievances.form.saveButton", "Save")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { IndianRupee } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import StatusPill from "@/components/app/status-pill";
import ConfirmDialog from "@/components/app/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";
import { pickLang } from "@/utils/localizedContent";

const EMPTY_FORM = { member: "", industry: "", period: "", amount: "", note: "" };

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
];

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function DuesPage() {
  const { toast } = useToast();
  const { t, lang } = useI18n();
  const { nicknames } = useNicknames();

  const statusFilterLabel = (filter) => {
    if (filter.value === "paid") return t("admin.system.dues.filters.paid", "Paid");
    if (filter.value === "pending") return t("admin.system.dues.filters.pending", "Pending");
    return t("admin.system.dues.filters.all", "All");
  };

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);

  const [statusSavingId, setStatusSavingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/dues", { params: { page, limit: 20, status: statusFilter || undefined } })
      .then((res) => {
        setDues(res.data.dues || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.system.dues.toast.loadErrorTitle", "Couldn't load dues"),
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

  const submitCreate = (e) => {
    e.preventDefault();
    if (createSaving) return;
    if (!createForm.member.trim()) {
      toast({ title: t("admin.system.dues.toast.memberRequiredTitle", "Member ID is required"), variant: "destructive" });
      return;
    }
    setCreateSaving(true);
    axiosInstance
      .post("/dues", {
        member: createForm.member.trim(),
        industry: createForm.industry.trim() || undefined,
        period: createForm.period.trim(),
        amount: Number(createForm.amount),
        note: createForm.note.trim() || undefined,
      })
      .then(() => {
        setCreateOpen(false);
        setCreateForm(EMPTY_FORM);
        toast({ title: t("admin.system.dues.toast.addedTitle", "Due added") });
        if (page === 1) load();
        else setPage(1);
      })
      .catch((err) => {
        toast({
          title: t("admin.system.dues.toast.addErrorTitle", "Couldn't add due"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setCreateSaving(false));
  };

  const toggleStatus = (due) => {
    const next = due.status === "paid" ? "pending" : "paid";
    setStatusSavingId(due._id);
    axiosInstance
      .put(`/dues/${due._id}`, { status: next })
      .then(() => {
        setDues((prev) => prev.map((d) => (d._id === due._id ? { ...d, status: next } : d)));
        toast({
          title:
            next === "paid"
              ? t("admin.system.dues.toast.markedPaidTitle", "Marked as paid")
              : t("admin.system.dues.toast.markedPendingTitle", "Marked as pending"),
        });
      })
      .catch((err) => {
        toast({
          title: t("admin.system.dues.toast.statusErrorTitle", "Couldn't update status"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setStatusSavingId(null));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    axiosInstance
      .delete(`/dues/${deleteTarget._id}`)
      .then(() => {
        setDues((prev) => prev.filter((d) => d._id !== deleteTarget._id));
        setTotal((prevTotal) => Math.max(0, prevTotal - 1));
        toast({ title: t("admin.system.dues.toast.removedTitle", "Due removed") });
        setDeleteTarget(null);
      })
      .catch((err) => {
        toast({
          title: t("admin.system.dues.toast.deleteErrorTitle", "Couldn't delete due"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDeleteSaving(false));
  };

  return (
    <div>
      <PageHeader
        title={t("admin.system.dues.header.title", "Dues")}
        description={t("admin.system.dues.header.description", "Track membership dues collected across periods.")}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
          >
            {t("admin.system.dues.header.addButton", "+ Add due")}
          </button>
        }
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
            {statusFilterLabel(f)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="app-glass glass-shadow rounded-2xl p-10 text-center text-sm text-body">
          {t("admin.system.dues.loading", "Loading dues…")}
        </div>
      )}

      {!loading && dues.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={IndianRupee}
            title={
              statusFilter
                ? t("admin.system.dues.emptyState.filteredTitle", "No dues match this filter")
                : t("admin.system.dues.emptyState.title", "No dues recorded yet")
            }
            description={
              statusFilter
                ? t(
                    "admin.system.dues.emptyState.filteredDescription",
                    "Try a different status, or clear the filter to see everything."
                  )
                : t(
                    "admin.system.dues.emptyState.description",
                    "Add a due record to start tracking membership payments."
                  )
            }
            action={
              statusFilter ? (
                <button
                  type="button"
                  onClick={() => changeFilter("")}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
                >
                  {t("admin.system.dues.emptyState.clearFilterButton", "Clear filter")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                >
                  {t("admin.system.dues.header.addButton", "+ Add due")}
                </button>
              )
            }
          />
        </div>
      )}

      {!loading && dues.length > 0 && (
        <div className="app-glass glass-shadow rounded-2xl divide-y divide-line overflow-hidden">
          {dues.map((due) => (
            <div key={due._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-ink text-[13.5px] truncate max-w-[220px] sm:max-w-none">
                    {due.member ? getDisplayName(due.member, nicknames) : t("admin.system.dues.row.unknownMember", "Unknown member")}
                  </span>
                  <StatusPill status={due.status} />
                </div>
                <div className="text-xs text-body mt-1 truncate">
                  {due.period}
                  {due.industry?.name && <> &middot; {pickLang(due.industry.name, lang)}</>}
                  {" "}&middot; {formatDate(due.createdAt)}
                </div>
                {due.note && <p className="text-[12px] text-body mt-1.5 line-clamp-2 break-words">{due.note}</p>}
              </div>
              <div className="flex items-center gap-2 flex-none">
                <span className="font-display font-bold text-ink text-[15px] tabular-nums">
                  {formatAmount(due.amount)}
                </span>
                <button
                  type="button"
                  disabled={statusSavingId === due._id}
                  onClick={() => toggleStatus(due)}
                  className="h-8 px-3 rounded-full text-[11.5px] font-bold text-ink border border-line bg-white disabled:opacity-60 whitespace-nowrap"
                >
                  {statusSavingId === due._id
                    ? t("admin.system.dues.row.saving", "Saving…")
                    : due.status === "paid"
                    ? t("admin.system.dues.row.markPending", "Mark pending")
                    : t("admin.system.dues.row.markPaid", "Mark paid")}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(due)}
                  className="h-8 px-3 rounded-full text-[11.5px] font-bold text-white bg-alarm"
                >
                  {t("admin.system.dues.row.deleteButton", "Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

      {/* Add due */}
      <Dialog open={createOpen} onOpenChange={(o) => (!createSaving ? setCreateOpen(o) : null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.system.dues.createDialog.title", "Add a due record")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t("admin.system.dues.createDialog.description", "Record a dues payment (or amount owed) for a member.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div>
              <label htmlFor="due-member" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.dues.createForm.memberLabel", "Member ID")}
              </label>
              <input
                id="due-member"
                required
                value={createForm.member}
                onChange={(e) => setCreateForm((f) => ({ ...f, member: e.target.value }))}
                placeholder={t("admin.system.dues.createForm.memberPlaceholder", "Paste the member's user ID")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
              <p className="text-[11px] text-body mt-1">
                {t("admin.system.dues.createForm.memberHint", "Paste the member's user ID from the Members page.")}
              </p>
            </div>
            <div>
              <label htmlFor="due-industry" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.dues.createForm.industryLabel", "Industry ID")}{" "}
                <span className="normal-case font-medium text-body/60">
                  {t("admin.system.dues.createForm.optionalSuffix", "(optional)")}
                </span>
              </label>
              <input
                id="due-industry"
                value={createForm.industry}
                onChange={(e) => setCreateForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder={t("admin.system.dues.createForm.industryPlaceholder", "Paste the industry ID, if applicable")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="due-period" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.dues.createForm.periodLabel", "Period")}
              </label>
              <input
                id="due-period"
                required
                maxLength={30}
                value={createForm.period}
                onChange={(e) => setCreateForm((f) => ({ ...f, period: e.target.value }))}
                placeholder={t("admin.system.dues.createForm.periodPlaceholder", "e.g. July 2026")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="due-amount" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.dues.createForm.amountLabel", "Amount (₹)")}
              </label>
              <input
                id="due-amount"
                required
                type="number"
                min="0"
                step="1"
                value={createForm.amount}
                onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={t("admin.system.dues.createForm.amountPlaceholder", "e.g. 500")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="due-note" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.dues.createForm.noteLabel", "Note")}{" "}
                <span className="normal-case font-medium text-body/60">
                  {t("admin.system.dues.createForm.optionalSuffix", "(optional)")}
                </span>
              </label>
              <textarea
                id="due-note"
                maxLength={500}
                rows={2}
                value={createForm.note}
                onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t("admin.system.dues.createForm.notePlaceholder", "Any additional context…")}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
              />
            </div>
            <DialogFooter className="pt-1">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
              >
                {t("admin.system.dues.createForm.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {createSaving
                  ? t("admin.system.dues.createForm.addingButton", "Adding…")
                  : t("admin.system.dues.createForm.addButton", "Add due")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.system.dues.deleteDialog.title", "Delete this due record?")}
        description={t("admin.system.dues.deleteDialog.description", "This permanently removes the record. This can't be undone.")}
        confirmLabel={t("admin.system.dues.deleteDialog.confirmLabel", "Delete due")}
        loading={deleteSaving}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

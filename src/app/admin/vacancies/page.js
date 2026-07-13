"use client";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, ChevronRight, Users } from "lucide-react";
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

const EMPTY_FORM = { title: "", description: "", eligibility: "", deadline: "" };

const APPLICATION_STATUS_OPTION_DEFS = [
  { value: "new", key: "admin.people.vacancies.applicationStatus.new", label: "New" },
  { value: "reviewed", key: "admin.people.vacancies.applicationStatus.reviewed", label: "Reviewed" },
  { value: "shortlisted", key: "admin.people.vacancies.applicationStatus.shortlisted", label: "Shortlisted" },
  { value: "rejected", key: "admin.people.vacancies.applicationStatus.rejected", label: "Rejected" },
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

export default function VacanciesPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  // List state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicantCounts, setApplicantCounts] = useState({});

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);

  // Detail view state
  const [detailVacancy, setDetailVacancy] = useState(null);
  const [detailApplications, setDetailApplications] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [appSavingId, setAppSavingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/vacancies", { params: { page, limit: 20 } })
      .then((res) => {
        setVacancies(res.data.vacancies || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.vacancies.toasts.loadErrorTitle", "Couldn't load vacancies"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch applicant counts for the current page's vacancies (admin/postedBy-only endpoint).
  useEffect(() => {
    if (!vacancies.length) return;
    let cancelled = false;
    Promise.allSettled(
      vacancies.map((v) =>
        axiosInstance.get(`/vacancies/${v._id}/applications`).then((res) => [v._id, res.data.length])
      )
    ).then((results) => {
      if (cancelled) return;
      setApplicantCounts((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [vacancies]);

  const submitCreate = (e) => {
    e.preventDefault();
    if (createSaving) return;
    setCreateSaving(true);
    axiosInstance
      .post("/vacancies", {
        title: createForm.title,
        description: createForm.description,
        eligibility: createForm.eligibility,
        deadline: createForm.deadline ? new Date(createForm.deadline).toISOString() : undefined,
      })
      .then(() => {
        setCreateOpen(false);
        setCreateForm(EMPTY_FORM);
        toast({ title: t("admin.people.vacancies.toasts.posted", "Vacancy posted") });
        if (page === 1) load();
        else setPage(1);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.vacancies.toasts.postErrorTitle", "Couldn't post vacancy"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setCreateSaving(false));
  };

  const openDetail = (v) => {
    setDetailVacancy(v);
    setDetailApplications([]);
    setDetailLoading(true);
    axiosInstance
      .get(`/vacancies/${v._id}/applications`)
      .then((res) => setDetailApplications(res.data || []))
      .catch((err) => {
        toast({
          title: t("admin.people.vacancies.toasts.loadApplicantsErrorTitle", "Couldn't load applicants"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDetailLoading(false));
  };

  const closeEarly = () => {
    if (!detailVacancy) return;
    setClosing(true);
    axiosInstance
      .put(`/vacancies/${detailVacancy._id}`, { status: "closed" })
      .then(() => {
        setVacancies((prev) => prev.filter((v) => v._id !== detailVacancy._id));
        setTotal((t) => Math.max(0, t - 1));
        toast({
          title: t("admin.people.vacancies.toasts.closed", "Vacancy closed"),
          description: t(
            "admin.people.vacancies.toasts.closedDescription",
            "It no longer appears in this open-vacancies list."
          ),
        });
        setDetailVacancy(null);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.vacancies.toasts.closeErrorTitle", "Couldn't close vacancy"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setClosing(false));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    axiosInstance
      .delete(`/vacancies/${deleteTarget._id}`)
      .then(() => {
        setVacancies((prev) => prev.filter((v) => v._id !== deleteTarget._id));
        setTotal((t) => Math.max(0, t - 1));
        toast({ title: t("admin.people.vacancies.toasts.deleted", "Vacancy deleted") });
        setDeleteTarget(null);
        setDetailVacancy(null);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.vacancies.toasts.deleteErrorTitle", "Couldn't delete vacancy"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDeleteSaving(false));
  };

  const updateApplicationStatus = (appId, status) => {
    if (!detailVacancy) return;
    setAppSavingId(appId);
    axiosInstance
      .put(`/vacancies/${detailVacancy._id}/applications/${appId}/status`, { status })
      .then((res) => {
        setDetailApplications((prev) => prev.map((a) => (a._id === appId ? res.data : a)));
      })
      .catch((err) => {
        toast({
          title: t("admin.people.vacancies.toasts.updateApplicantErrorTitle", "Couldn't update applicant status"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setAppSavingId(null));
  };

  return (
    <div>
      <PageHeader
        title={t("admin.people.vacancies.title", "Vacancies")}
        description={t(
          "admin.people.vacancies.description",
          "Only open vacancies with a future deadline are shown here — closed or expired postings are hidden from this list."
        )}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
          >
            {t("admin.people.vacancies.newVacancyButton", "+ New vacancy")}
          </button>
        }
      />

      {loading && (
        <div className="app-glass glass-shadow rounded-2xl p-10 text-center text-sm text-body">
          {t("admin.people.vacancies.loading", "Loading vacancies…")}
        </div>
      )}

      {!loading && vacancies.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={Briefcase}
            title={t("admin.people.vacancies.emptyState.title", "No open vacancies")}
            description={t(
              "admin.people.vacancies.emptyState.description",
              "Post a job opening for federation members to apply to."
            )}
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.people.vacancies.newVacancyButton", "+ New vacancy")}
              </button>
            }
          />
        </div>
      )}

      {!loading && vacancies.length > 0 && (
        <div className="app-glass glass-shadow rounded-2xl divide-y divide-line overflow-hidden">
          {vacancies.map((v) => {
            const count = applicantCounts[v._id];
            return (
              <button
                key={v._id}
                type="button"
                onClick={() => openDetail(v)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-ink text-[13.5px] truncate max-w-[220px] sm:max-w-none">
                      {v.title}
                    </span>
                    <StatusPill status={v.status} />
                  </div>
                  <div className="text-xs text-body mt-1 truncate">
                    {t("admin.people.vacancies.deadlineLabel", "Deadline")} {formatDateTime(v.deadline)} &middot;{" "}
                    {count === undefined ? "…" : count}{" "}
                    {count === 1
                      ? t("admin.people.vacancies.list.applicantSingular", "applicant")
                      : t("admin.people.vacancies.list.applicantPlural", "applicants")}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-body flex-none" />
              </button>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

      {/* Create vacancy */}
      <Dialog open={createOpen} onOpenChange={(o) => (!createSaving ? setCreateOpen(o) : null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.people.vacancies.createDialog.title", "Post a new vacancy")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t(
                "admin.people.vacancies.createDialog.description",
                "Visible to members immediately, until the deadline passes or you close it early."
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div>
              <label htmlFor="vac-title" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.people.vacancies.form.titleLabel", "Title")}
              </label>
              <input
                id="vac-title"
                required
                maxLength={150}
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("admin.people.vacancies.form.titlePlaceholder", "e.g. Machine operator")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="vac-description" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.people.vacancies.form.descriptionLabel", "Description")}
              </label>
              <textarea
                id="vac-description"
                required
                maxLength={2000}
                rows={4}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t(
                  "admin.people.vacancies.form.descriptionPlaceholder",
                  "Role, responsibilities, working hours…"
                )}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
              />
            </div>
            <div>
              <label htmlFor="vac-eligibility" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.people.vacancies.form.eligibilityLabel", "Eligibility")}
              </label>
              <textarea
                id="vac-eligibility"
                required
                maxLength={1000}
                rows={3}
                value={createForm.eligibility}
                onChange={(e) => setCreateForm((f) => ({ ...f, eligibility: e.target.value }))}
                placeholder={t(
                  "admin.people.vacancies.form.eligibilityPlaceholder",
                  "Experience, skills, qualifications required…"
                )}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
              />
            </div>
            <div>
              <label htmlFor="vac-deadline" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.people.vacancies.form.deadlineLabel", "Application deadline")}
              </label>
              <input
                id="vac-deadline"
                required
                type="datetime-local"
                value={createForm.deadline}
                onChange={(e) => setCreateForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <DialogFooter className="pt-1">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
              >
                {t("admin.people.vacancies.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {createSaving
                  ? t("admin.people.vacancies.form.posting", "Posting…")
                  : t("admin.people.vacancies.form.postButton", "Post vacancy")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vacancy detail + applicants */}
      <Dialog open={Boolean(detailVacancy)} onOpenChange={(o) => !o && setDetailVacancy(null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
          {detailVacancy && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap pr-6">
                  <DialogTitle className="font-display text-ink text-base">{detailVacancy.title}</DialogTitle>
                  <StatusPill status={detailVacancy.status} />
                </div>
                <DialogDescription className="text-body">
                  {t("admin.people.vacancies.deadlineLabel", "Deadline")} {formatDateTime(detailVacancy.deadline)}
                  {detailVacancy.postedBy && (
                    <>
                      {" "}
                      &middot; {t("admin.people.vacancies.detail.postedByLabel", "Posted by")}{" "}
                      {getDisplayName(detailVacancy.postedBy, nicknames)}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-1">
                    {t("admin.people.vacancies.form.descriptionLabel", "Description")}
                  </div>
                  <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{detailVacancy.description}</p>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-1">
                    {t("admin.people.vacancies.form.eligibilityLabel", "Eligibility")}
                  </div>
                  <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{detailVacancy.eligibility}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detailVacancy.status === "open" && (
                    <button
                      type="button"
                      disabled={closing}
                      onClick={closeEarly}
                      className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white disabled:opacity-60"
                    >
                      {closing
                        ? t("admin.people.vacancies.detail.closing", "Closing…")
                        : t("admin.people.vacancies.detail.closeEarlyButton", "Close early")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(detailVacancy)}
                    className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-alarm"
                  >
                    {t("admin.people.vacancies.detail.deleteButton", "Delete")}
                  </button>
                </div>

                <div className="pt-3 border-t border-line">
                  <div className="font-display font-bold text-ink text-[13.5px] mb-2">
                    {t("admin.people.vacancies.detail.applicantsHeading", "Applicants")}
                    {detailApplications.length > 0 ? ` (${detailApplications.length})` : ""}
                  </div>

                  {detailLoading && (
                    <div className="text-xs text-body">
                      {t("admin.people.vacancies.detail.loadingApplicants", "Loading applicants…")}
                    </div>
                  )}

                  {!detailLoading && detailApplications.length === 0 && (
                    <EmptyState
                      icon={Users}
                      title={t("admin.people.vacancies.detail.noApplicantsTitle", "No applicants yet")}
                      description={t(
                        "admin.people.vacancies.detail.noApplicantsDescription",
                        "Applications submitted for this vacancy will appear here."
                      )}
                    />
                  )}

                  {!detailLoading && detailApplications.length > 0 && (
                    <div className="space-y-2">
                      {detailApplications.map((a) => (
                        <div key={a._id} className="rounded-xl border border-line bg-ivory/60 p-3">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <div className="font-semibold text-ink text-[13px] truncate">{a.applicantName}</div>
                              <div className="text-[11.5px] text-body truncate">
                                {a.applicantEmail} &middot; {a.applicantPhone}
                              </div>
                            </div>
                            <StatusPill status={a.status} />
                          </div>
                          {a.coverNote && (
                            <p className="text-[12px] text-body mt-2 line-clamp-2 break-words">{a.coverNote}</p>
                          )}
                          {a.resumeUrl && (
                            <a
                              href={a.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-[11.5px] font-semibold text-madder mt-2 underline underline-offset-2"
                            >
                              {t("admin.people.vacancies.detail.viewResumeLink", "View resume")}
                            </a>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {APPLICATION_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={appSavingId === a._id}
                                onClick={() => updateApplicationStatus(a._id, opt.value)}
                                className={
                                  a.status === opt.value
                                    ? "h-6 px-2.5 rounded-full text-[10.5px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                                    : "h-6 px-2.5 rounded-full text-[10.5px] font-bold text-ink border border-line bg-white disabled:opacity-60"
                                }
                              >
                                {t(opt.key, opt.label)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.people.vacancies.confirmDelete.title", "Delete this vacancy?")}
        description={t(
          "admin.people.vacancies.confirmDelete.description",
          "This permanently removes the vacancy and every application submitted to it. This can't be undone."
        )}
        confirmLabel={t("admin.people.vacancies.confirmDelete.confirmButton", "Delete vacancy")}
        loading={deleteSaving}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

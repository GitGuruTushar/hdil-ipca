"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Building2, Calendar, CheckCircle2 } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";

const EMPTY_CREATE_FORM = { title: "", description: "", eligibility: "", deadline: "" };
const EMPTY_APPLY_FORM = { applicantName: "", applicantEmail: "", applicantPhone: "", coverNote: "" };

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// Public vacancies board — reachable by anyone. Anonymous visitors can browse
// and apply (no account required); logged-in members/staff additionally get
// a "post a vacancy" action. No ProtectedRoute redirect gate here, since the
// page itself must stay visible to logged-out visitors.
function VacanciesContent() {
  const { toast } = useToast();
  const { t, lang } = useI18n();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    setIsLoggedIn(typeof window !== "undefined" && Boolean(localStorage.getItem("token")));
  }, []);

  // List state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/vacancies", { params: { page, limit: 12 } })
      .then((res) => {
        setVacancies(res.data.vacancies || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("vacancies.toast.loadErrorTitle", "Couldn't load vacancies"),
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

  // Post-a-vacancy form (logged-in members/staff only)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);

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
        setCreateForm(EMPTY_CREATE_FORM);
        toast({ title: t("vacancies.toast.vacancyPostedTitle", "Vacancy posted") });
        if (page === 1) load();
        else setPage(1);
      })
      .catch((err) => {
        toast({
          title: t("vacancies.toast.postErrorTitle", "Couldn't post vacancy"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setCreateSaving(false));
  };

  // Apply form — fully public, no auth needed
  const [applyTarget, setApplyTarget] = useState(null);
  const [applyForm, setApplyForm] = useState(EMPTY_APPLY_FORM);
  const [resumeFile, setResumeFile] = useState(null);
  const [applySaving, setApplySaving] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const openApply = (vacancy) => {
    setApplyTarget(vacancy);
    setApplyForm(EMPTY_APPLY_FORM);
    setResumeFile(null);
    setApplySuccess(false);
  };

  const closeApply = () => {
    setApplyTarget(null);
    setApplyForm(EMPTY_APPLY_FORM);
    setResumeFile(null);
    setApplySuccess(false);
  };

  const submitApply = (e) => {
    e.preventDefault();
    if (applySaving || !applyTarget) return;
    setApplySaving(true);
    const fd = new FormData();
    fd.append("applicantName", applyForm.applicantName);
    fd.append("applicantEmail", applyForm.applicantEmail);
    fd.append("applicantPhone", applyForm.applicantPhone);
    if (applyForm.coverNote.trim()) fd.append("coverNote", applyForm.coverNote.trim());
    if (resumeFile) fd.append("resume", resumeFile);
    axiosInstance
      .post(`/vacancies/${applyTarget._id}/apply`, fd)
      .then(() => {
        setApplySuccess(true);
      })
      .catch((err) => {
        toast({
          title: t("vacancies.toast.applyErrorTitle", "Couldn't submit application"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setApplySaving(false));
  };

  return (
    <div className="mx-auto max-w-site px-5 pt-28 pb-20 md:px-8 md:pt-32 lg:pt-36">
      <PageHeader
        title={t("vacancies.title", "Vacancies")}
        description={t("vacancies.description", "Open job opportunities posted by federation members and staff.")}
        action={
          isLoggedIn ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
            >
              {t("vacancies.postButton", "+ Post a vacancy")}
            </button>
          ) : null
        }
      />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="app-glass glass-shadow rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-2/3 rounded bg-line/70 mb-3" />
              <div className="h-3 w-full rounded bg-line/50 mb-1.5" />
              <div className="h-3 w-5/6 rounded bg-line/50 mb-1.5" />
              <div className="h-3 w-1/2 rounded bg-line/50 mb-4" />
              <div className="h-9 w-full rounded-full bg-line/50" />
            </div>
          ))}
        </div>
      )}

      {!loading && vacancies.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={Briefcase}
            title={t("vacancies.emptyState.title", "No open vacancies right now")}
            description={t("vacancies.emptyState.description", "New job opportunities are posted regularly — check back soon.")}
            action={
              isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                >
                  {t("vacancies.postButton", "+ Post a vacancy")}
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {!loading && vacancies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vacancies.map((v) => (
            <div key={v._id} className="app-glass glass-shadow rounded-2xl p-5 flex flex-col">
              <h3 className="font-display font-bold text-ink text-[15px] leading-snug line-clamp-2">{v.title}</h3>

              {v.industry?.name && (
                <div className="flex items-center gap-1.5 text-[11.5px] text-madder font-semibold mt-1.5">
                  <Building2 className="h-3.5 w-3.5 flex-none" />
                  <span className="truncate">{pickLang(v.industry.name, lang)}</span>
                </div>
              )}

              <p className="text-[13px] text-body mt-2.5 line-clamp-3">{v.description}</p>

              <div className="mt-2.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-0.5">{t("vacancies.common.eligibilityLabel", "Eligibility")}</div>
                <p className="text-[12.5px] text-body line-clamp-2">{v.eligibility}</p>
              </div>

              <div className="flex items-center gap-1.5 text-[12px] text-body mt-3">
                <Calendar className="h-3.5 w-3.5 flex-none" />
                <span>{t("vacancies.card.applyByPrefix", "Apply by")} {formatDate(v.deadline)}</span>
              </div>

              {v.postedBy?.fullName && (
                <div className="text-[11.5px] text-body/80 mt-1 truncate">{t("vacancies.card.postedByPrefix", "Posted by")} {v.postedBy.fullName}</div>
              )}

              <button
                type="button"
                onClick={() => openApply(v)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape mt-4 w-full"
              >
                {t("vacancies.card.applyButton", "Apply")}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && vacancies.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
      )}

      {/* Apply modal */}
      <Dialog open={Boolean(applyTarget)} onOpenChange={(o) => (!o ? closeApply() : null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          {applyTarget && !applySuccess && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-ink">{t("vacancies.applyModal.titlePrefix", "Apply for")} {applyTarget.title}</DialogTitle>
                <DialogDescription className="text-body">
                  {t("vacancies.applyModal.description", "Your details go straight to the person who posted this vacancy. No account needed.")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submitApply} className="space-y-3">
                <div>
                  <label htmlFor="apply-name" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                    {t("vacancies.applyModal.nameLabel", "Your name")}
                  </label>
                  <input
                    id="apply-name"
                    required
                    maxLength={200}
                    value={applyForm.applicantName}
                    onChange={(e) => setApplyForm((f) => ({ ...f, applicantName: e.target.value }))}
                    placeholder={t("vacancies.applyModal.namePlaceholder", "Full name")}
                    className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="apply-email" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                      {t("vacancies.applyModal.emailLabel", "Email")}
                    </label>
                    <input
                      id="apply-email"
                      type="email"
                      required
                      value={applyForm.applicantEmail}
                      onChange={(e) => setApplyForm((f) => ({ ...f, applicantEmail: e.target.value }))}
                      placeholder={t("vacancies.applyModal.emailPlaceholder", "you@example.com")}
                      className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-phone" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                      {t("vacancies.applyModal.phoneLabel", "Phone")}
                    </label>
                    <input
                      id="apply-phone"
                      type="tel"
                      required
                      maxLength={20}
                      value={applyForm.applicantPhone}
                      onChange={(e) => setApplyForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                      placeholder={t("vacancies.applyModal.phonePlaceholder", "10-digit number")}
                      className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="apply-cover" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                    {t("vacancies.applyModal.coverNoteLabel", "Cover note")} <span className="normal-case font-normal text-body/60">{t("vacancies.applyModal.optionalTag", "(optional)")}</span>
                  </label>
                  <textarea
                    id="apply-cover"
                    rows={3}
                    maxLength={1000}
                    value={applyForm.coverNote}
                    onChange={(e) => setApplyForm((f) => ({ ...f, coverNote: e.target.value }))}
                    placeholder={t("vacancies.applyModal.coverNotePlaceholder", "Tell them why you're a good fit…")}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
                  />
                </div>
                <div>
                  <label htmlFor="apply-resume" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                    {t("vacancies.applyModal.resumeLabel", "Resume")} <span className="normal-case font-normal text-body/60">{t("vacancies.applyModal.resumeOptionalTag", "(optional, PDF or Word)")}</span>
                  </label>
                  <input
                    id="apply-resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full text-[12.5px] text-body file:mr-3 file:h-8 file:px-3 file:rounded-full file:border-0 file:bg-ivory file:text-ink file:text-[12px] file:font-semibold"
                  />
                  {resumeFile && <div className="text-[11.5px] text-body mt-1 truncate">{t("vacancies.applyModal.selectedFilePrefix", "Selected:")} {resumeFile.name}</div>}
                </div>
                <DialogFooter className="pt-1">
                  <button
                    type="button"
                    onClick={closeApply}
                    className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white w-full sm:w-auto"
                  >
                    {t("vacancies.common.cancelButton", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={applySaving}
                    className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
                  >
                    {applySaving
                      ? t("vacancies.applyModal.submittingButton", "Submitting…")
                      : t("vacancies.applyModal.submitButton", "Submit application")}
                  </button>
                </DialogFooter>
              </form>
            </>
          )}

          {applyTarget && applySuccess && (
            <div className="text-center py-6">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" strokeWidth={2} />
              </div>
              <div className="font-display font-bold text-ink text-base">{t("vacancies.applyModal.successTitle", "Application submitted")}</div>
              <p className="text-sm text-body mt-1.5 max-w-xs mx-auto">
                {t("vacancies.applyModal.successThanksPrefix", "Thanks")}{applyForm.applicantName ? `, ${applyForm.applicantName.split(" ")[0]}` : ""}{" "}
                {t("vacancies.applyModal.successMiddle", "— your application for")} {applyTarget.title}{" "}
                {t("vacancies.applyModal.successSuffix", "has been sent. The poster will reach out if you’re a fit.")}
              </p>
              <button
                type="button"
                onClick={closeApply}
                className="h-9 px-5 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape mt-5"
              >
                {t("vacancies.applyModal.doneButton", "Done")}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post a vacancy modal (logged-in members/staff only) */}
      <Dialog open={createOpen} onOpenChange={(o) => (!createSaving ? setCreateOpen(o) : null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">{t("vacancies.createModal.title", "Post a new vacancy")}</DialogTitle>
            <DialogDescription className="text-body">
              {t("vacancies.createModal.description", "Visible to everyone immediately, until the deadline passes.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div>
              <label htmlFor="vac-title" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("vacancies.createModal.titleLabel", "Title")}
              </label>
              <input
                id="vac-title"
                required
                maxLength={150}
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("vacancies.createModal.titlePlaceholder", "e.g. Machine operator")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="vac-description" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("vacancies.createModal.descriptionLabel", "Description")}
              </label>
              <textarea
                id="vac-description"
                required
                maxLength={2000}
                rows={4}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("vacancies.createModal.descriptionPlaceholder", "Role, responsibilities, working hours…")}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
              />
            </div>
            <div>
              <label htmlFor="vac-eligibility" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("vacancies.common.eligibilityLabel", "Eligibility")}
              </label>
              <textarea
                id="vac-eligibility"
                required
                maxLength={1000}
                rows={3}
                value={createForm.eligibility}
                onChange={(e) => setCreateForm((f) => ({ ...f, eligibility: e.target.value }))}
                placeholder={t("vacancies.createModal.eligibilityPlaceholder", "Experience, skills, qualifications required…")}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none resize-y"
              />
            </div>
            <div>
              <label htmlFor="vac-deadline" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("vacancies.createModal.deadlineLabel", "Application deadline")}
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
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white w-full sm:w-auto"
              >
                {t("vacancies.common.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
              >
                {createSaving
                  ? t("vacancies.createModal.postingButton", "Posting…")
                  : t("vacancies.createModal.submitButton", "Post vacancy")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VacanciesPage() {
  return <VacanciesContent />;
}

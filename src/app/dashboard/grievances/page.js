"use client";
import { useEffect, useState } from "react";
import { Plus, MessageSquareWarning } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import StatusPill from "@/components/app/status-pill";
import { useToast } from "@/hooks/use-toast";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";

const EMPTY_FORM = { subject: "", description: "" };

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors";
const labelCls = "block text-[11px] font-bold text-body uppercase tracking-wide mb-1.5";
const textareaCls =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors resize-y";

const formatDateTime = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MemberGrievancesPage() {
  const { toast } = useToast();
  const { t } = useI18n();

  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    axiosInstance
      .get("/grievances/mine")
      .then((res) => setGrievances(res.data || []))
      .catch((err) => {
        toast({
          title: t("member.more.grievances.toast.loadError", "Couldn't load your grievances"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.subject.trim() || !form.description.trim()) {
      toast({
        title: t("member.more.grievances.toast.required", "Subject and description are required"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await axiosInstance.post("/grievances", {
        subject: form.subject.trim(),
        description: form.description.trim(),
      });
      setGrievances((prev) => [res.data, ...prev]);
      toast({
        title: t("member.more.grievances.toast.filed", "Grievance filed"),
        description: t("member.more.grievances.toast.filedDesc", "The federation office has been notified."),
      });
      setFormOpen(false);
      resetForm();
    } catch (err) {
      toast({
        title: t("member.more.grievances.toast.fileError", "Couldn't file grievance"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fileAction = (
    <button
      type="button"
      onClick={() => setFormOpen(true)}
      className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      {t("member.more.grievances.fileButton", "File a grievance")}
    </button>
  );

  return (
    <div>
      <PageHeader
        title={t("member.more.grievances.title", "Grievances")}
        description={t("member.more.grievances.description", "File a grievance with the federation and track its status.")}
        action={fileAction}
      />

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/60 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && grievances.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={MessageSquareWarning}
            title={t("member.more.grievances.emptyState.title", "No grievances yet")}
            description={t(
              "member.more.grievances.emptyState.description",
              "If something needs the federation's attention, file a grievance and track its progress here."
            )}
            action={fileAction}
          />
        </div>
      )}

      {!loading && grievances.length > 0 && (
        <div className="flex flex-col gap-3">
          {grievances.map((g) => (
            <div key={g._id} className="app-glass glass-shadow rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-display font-bold text-ink text-[14px] break-words">{g.subject}</h3>
                <StatusPill status={g.status} className="flex-none" />
              </div>
              <p className="text-[13px] text-body whitespace-pre-wrap break-words">{g.description}</p>
              <div className="text-[11px] text-body/70 mt-2">{formatDateTime(g.createdAt)}</div>

              {g.adminResponse && (
                <div className="mt-3 pl-3 border-l-2 border-madder/50 bg-ivory rounded-r-xl p-3">
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-body/70 mb-1">
                    {t("member.more.grievances.federationResponse", "Federation response")}
                  </div>
                  <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{g.adminResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(v) => {
          if (submitting) return;
          setFormOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("member.more.grievances.dialog.title", "File a grievance")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t(
                "member.more.grievances.dialog.description",
                "Tell us what's wrong — the federation office will review and respond."
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>{t("member.more.grievances.form.subjectLabel", "Subject")}</label>
              <input
                required
                maxLength={150}
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder={t("member.more.grievances.form.subjectPlaceholder", "e.g. Water leakage in common area")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("member.more.grievances.form.descriptionLabel", "Description")}</label>
              <textarea
                required
                maxLength={2000}
                rows={5}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("member.more.grievances.form.descriptionPlaceholder", "Describe the issue in detail…")}
                className={textareaCls}
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
                className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink disabled:opacity-60"
              >
                {t("member.more.grievances.form.cancel", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {submitting
                  ? t("member.more.grievances.form.filing", "Filing…")
                  : t("member.more.grievances.form.submit", "File grievance")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

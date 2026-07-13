"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  XCircle,
  BarChart3,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/app/page-header";
import StatusPill from "@/components/app/status-pill";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import ConfirmDialog from "@/components/app/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

const inputClass =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-sm text-ink placeholder:text-body/60 focus:outline-none focus:ring-2 focus:ring-madder/30";
const textareaClass =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-sm text-ink placeholder:text-body/60 focus:outline-none focus:ring-2 focus:ring-madder/30 resize-none";
const labelClass = "text-xs font-semibold text-ink";

function emptyPollForm() {
  return { question: "", description: "", options: ["", ""], expiresAt: "" };
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time.
function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PollsFeedbackPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [tab, setTab] = useState("polls");

  // ---------------- Polls ----------------
  const [polls, setPolls] = useState([]);
  const [pollsLoading, setPollsLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pollForm, setPollForm] = useState(emptyPollForm());

  const [editingPoll, setEditingPoll] = useState(null);
  const [editForm, setEditForm] = useState({ question: "", description: "", expiresAt: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [closingId, setClosingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPolls = useCallback(async () => {
    setPollsLoading(true);
    try {
      const res = await axiosInstance.get("/polls");
      setPolls(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.loadPollsError", "Failed to load polls")),
        variant: "destructive",
      });
    } finally {
      setPollsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const openCreate = () => {
    setPollForm(emptyPollForm());
    setCreateOpen(true);
  };

  const updateOption = (i, value) => {
    setPollForm((f) => {
      const options = [...f.options];
      options[i] = value;
      return { ...f, options };
    });
  };

  const addOption = () => setPollForm((f) => ({ ...f, options: [...f.options, ""] }));
  const removeOption = (i) =>
    setPollForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  const submitCreate = async (e) => {
    e.preventDefault();
    if (creating) return;

    const question = pollForm.question.trim();
    const options = pollForm.options.map((o) => o.trim()).filter(Boolean);

    if (!question) {
      toast({ title: t("admin.community.polls.toast.questionRequired", "Question is required"), variant: "destructive" });
      return;
    }
    if (options.length < 2) {
      toast({
        title: t("admin.community.polls.toast.optionsRequired", "At least two options are required"),
        variant: "destructive",
      });
      return;
    }
    if (!pollForm.expiresAt) {
      toast({
        title: t("admin.community.polls.toast.expiryRequired", "An expiry date/time is required"),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await axiosInstance.post("/polls", {
        question,
        description: pollForm.description.trim() || undefined,
        options,
        expiresAt: new Date(pollForm.expiresAt).toISOString(),
      });
      toast({ title: t("admin.community.polls.toast.pollCreated", "Poll created") });
      setCreateOpen(false);
      setPollForm(emptyPollForm());
      fetchPolls();
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.createPollError", "Failed to create poll")),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (poll) => {
    setEditingPoll(poll);
    setEditForm({
      question: poll.question || "",
      description: poll.description || "",
      expiresAt: toDatetimeLocal(poll.expiresAt),
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (savingEdit || !editingPoll) return;

    const question = editForm.question.trim();
    if (!question) {
      toast({ title: t("admin.community.polls.toast.questionRequired", "Question is required"), variant: "destructive" });
      return;
    }
    if (!editForm.expiresAt) {
      toast({
        title: t("admin.community.polls.toast.expiryRequired", "An expiry date/time is required"),
        variant: "destructive",
      });
      return;
    }

    setSavingEdit(true);
    try {
      await axiosInstance.put(`/polls/${editingPoll._id}`, {
        question,
        description: editForm.description.trim(),
        expiresAt: new Date(editForm.expiresAt).toISOString(),
      });
      toast({ title: t("admin.community.polls.toast.pollUpdated", "Poll updated") });
      setEditingPoll(null);
      fetchPolls();
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.updatePollError", "Failed to update poll")),
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const closeEarly = async (poll) => {
    if (closingId) return;
    setClosingId(poll._id);
    try {
      await axiosInstance.put(`/polls/${poll._id}/close`);
      toast({ title: t("admin.community.polls.toast.pollClosed", "Poll closed") });
      fetchPolls();
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.closePollError", "Failed to close poll")),
        variant: "destructive",
      });
    } finally {
      setClosingId(null);
    }
  };

  const confirmDelete = async () => {
    if (deleting || !deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/polls/${deleteTarget._id}`);
      toast({ title: t("admin.community.polls.toast.pollDeleted", "Poll deleted") });
      setDeleteTarget(null);
      fetchPolls();
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.deletePollError", "Failed to delete poll")),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ---------------- Feedback ----------------
  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingReviewId, setSavingReviewId] = useState(null);

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const params = { page: feedbackPage, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await axiosInstance.get("/feedback", { params });
      setFeedback(Array.isArray(res.data?.feedback) ? res.data.feedback : []);
      setFeedbackTotalPages(res.data?.totalPages || 1);
      setFeedbackTotal(res.data?.total || 0);
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.loadFeedbackError", "Failed to load feedback")),
        variant: "destructive",
      });
    } finally {
      setFeedbackLoading(false);
    }
  }, [feedbackPage, statusFilter, toast, t]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const changeStatusFilter = (value) => {
    setStatusFilter(value);
    setFeedbackPage(1);
  };

  const openReview = (item) => {
    setReviewingId(item._id);
    setNoteDraft(item.adminNote || "");
  };

  const cancelReview = () => {
    setReviewingId(null);
    setNoteDraft("");
  };

  const submitReview = async (item) => {
    if (savingReviewId) return;
    setSavingReviewId(item._id);
    try {
      const res = await axiosInstance.put(`/feedback/${item._id}/status`, {
        status: "reviewed",
        adminNote: noteDraft.trim(),
      });
      setFeedback((prev) =>
        prev.map((f) =>
          f._id === item._id
            ? { ...f, status: res.data.status, adminNote: res.data.adminNote }
            : f
        )
      );
      toast({ title: t("admin.community.polls.toast.feedbackReviewed", "Feedback marked reviewed") });
      setReviewingId(null);
      setNoteDraft("");
    } catch (err) {
      toast({
        title: apiErrorMessage(err, t("admin.community.polls.toast.updateFeedbackError", "Failed to update feedback")),
        variant: "destructive",
      });
    } finally {
      setSavingReviewId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("admin.community.polls.title", "Polls & feedback")}
        description={t(
          "admin.community.polls.description",
          "Run member polls and review submitted feedback."
        )}
        action={
          tab === "polls" ? (
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> {t("admin.community.polls.newPollButton", "New poll")}
            </button>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="app-glass rounded-full p-1 h-auto inline-flex bg-white/70">
          <TabsTrigger
            value="polls"
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-body data-[state=active]:bg-gradient-to-r data-[state=active]:from-madder data-[state=active]:to-grape data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {t("admin.community.polls.tabs.polls", "Polls")}
          </TabsTrigger>
          <TabsTrigger
            value="feedback"
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-body data-[state=active]:bg-gradient-to-r data-[state=active]:from-madder data-[state=active]:to-grape data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {t("admin.community.polls.tabs.feedback", "Feedback")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="polls" className="mt-4">
          {pollsLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : polls.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={t("admin.community.polls.emptyState.title", "No polls yet")}
              description={t(
                "admin.community.polls.emptyState.description",
                "Create your first poll to start gathering member input."
              )}
              action={
                <button
                  type="button"
                  onClick={openCreate}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> {t("admin.community.polls.newPollButton", "New poll")}
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {polls.map((poll) => (
                <PollCard
                  key={poll._id}
                  poll={poll}
                  onEdit={openEdit}
                  onCloseEarly={closeEarly}
                  onDelete={setDeleteTarget}
                  closingId={closingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            {[
              { key: "", label: t("admin.community.polls.feedbackFilters.all", "All") },
              { key: "new", label: t("admin.community.polls.feedbackFilters.new", "New") },
              { key: "reviewed", label: t("admin.community.polls.feedbackFilters.reviewed", "Reviewed") },
            ].map((f) => (
              <button
                key={f.key || "all"}
                type="button"
                onClick={() => changeStatusFilter(f.key)}
                className={
                  statusFilter === f.key
                    ? "h-8 px-3.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-madder to-grape"
                    : "h-8 px-3.5 rounded-full text-xs font-bold text-ink border border-line bg-white"
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {feedbackLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : feedback.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t("admin.community.polls.feedbackEmptyState.title", "No feedback yet")}
              description={t(
                "admin.community.polls.feedbackEmptyState.description",
                "Feedback submitted by members will appear here for review."
              )}
            />
          ) : (
            <>
              <div className="space-y-3">
                {feedback.map((item) => (
                  <FeedbackRow
                    key={item._id}
                    item={item}
                    expanded={expandedId === item._id}
                    onToggleExpand={() =>
                      setExpandedId((id) => (id === item._id ? null : item._id))
                    }
                    reviewing={reviewingId === item._id}
                    onStartReview={() => openReview(item)}
                    onCancelReview={cancelReview}
                    noteDraft={noteDraft}
                    onNoteChange={setNoteDraft}
                    onSubmitReview={() => submitReview(item)}
                    saving={savingReviewId === item._id}
                  />
                ))}
              </div>
              <Pagination
                page={feedbackPage}
                totalPages={feedbackTotalPages}
                total={feedbackTotal}
                onChange={setFeedbackPage}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create poll */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setPollForm(emptyPollForm());
        }}
      >
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.community.polls.createDialog.title", "New poll")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t(
                "admin.community.polls.createDialog.description",
                "Ask members a multiple-choice question with an expiry date."
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div>
              <label className={labelClass}>{t("admin.community.polls.form.questionLabel", "Question")}</label>
              <input
                value={pollForm.question}
                onChange={(e) => setPollForm((f) => ({ ...f, question: e.target.value }))}
                placeholder={t(
                  "admin.community.polls.form.questionPlaceholder",
                  "e.g. Should we hold the AGM in person this year?"
                )}
                maxLength={200}
                className={`${inputClass} mt-1`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("admin.community.polls.form.descriptionOptionalLabel", "Description (optional)")}
              </label>
              <textarea
                value={pollForm.description}
                onChange={(e) => setPollForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                maxLength={500}
                placeholder={t("admin.community.polls.form.descriptionPlaceholder", "Add context for members…")}
                className={`${textareaClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass}>{t("admin.community.polls.form.optionsLabel", "Options")}</label>
              <div className="space-y-2 mt-1">
                {pollForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`${t("admin.community.polls.form.optionPlaceholderPrefix", "Option")} ${i + 1}`}
                      maxLength={200}
                      className={inputClass}
                      required
                    />
                    {pollForm.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        aria-label={t("admin.community.polls.form.removeOptionAriaLabel", "Remove option")}
                        className="h-9 w-9 flex-none rounded-xl border border-line bg-white flex items-center justify-center text-body"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 h-8 px-3 rounded-full text-xs font-bold text-ink border border-line bg-white inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> {t("admin.community.polls.form.addOptionButton", "Add option")}
              </button>
            </div>
            <div>
              <label className={labelClass}>{t("admin.community.polls.form.expiresAtLabel", "Expires at")}</label>
              <input
                type="datetime-local"
                value={pollForm.expiresAt}
                onChange={(e) => setPollForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className={`${inputClass} mt-1`}
                required
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
              >
                {t("admin.community.polls.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {creating
                  ? t("admin.community.polls.form.creatingButton", "Creating…")
                  : t("admin.community.polls.form.createButton", "Create poll")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit poll */}
      <Dialog open={!!editingPoll} onOpenChange={(o) => !o && setEditingPoll(null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.community.polls.editDialog.title", "Edit poll")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t(
                "admin.community.polls.editDialog.description",
                "Options cannot be edited here — changing them after votes are cast would invalidate existing results. Delete and recreate the poll if the options need to change."
              )}
            </DialogDescription>
          </DialogHeader>
          {editingPoll && (
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className={labelClass}>{t("admin.community.polls.form.questionLabel", "Question")}</label>
                <input
                  value={editForm.question}
                  onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                  maxLength={200}
                  className={`${inputClass} mt-1`}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("admin.community.polls.form.descriptionLabel", "Description")}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  className={`${textareaClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>{t("admin.community.polls.form.expiresAtLabel", "Expires at")}</label>
                <input
                  type="datetime-local"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className={`${inputClass} mt-1`}
                  required
                />
              </div>
              <div className="rounded-xl bg-ivory px-3 py-2 text-xs text-body">
                {t("admin.community.polls.editDialog.optionsPrefix", "Options:")}{" "}
                {editingPoll.options.map((o) => o.text).join(", ")}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setEditingPoll(null)}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
                >
                  {t("admin.community.polls.form.cancelButton", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                >
                  {savingEdit
                    ? t("admin.community.polls.form.savingButton", "Saving…")
                    : t("admin.community.polls.form.saveChangesButton", "Save changes")}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.community.polls.deleteDialog.title", "Delete this poll?")}
        description={
          deleteTarget
            ? `"${deleteTarget.question}" ${t(
                "admin.community.polls.deleteDialog.descriptionSuffix",
                "will be permanently removed, along with all votes."
              )}`
            : ""
        }
        confirmLabel={t("admin.community.polls.deleteDialog.confirmLabel", "Delete poll")}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="app-glass glass-shadow rounded-2xl p-4 animate-pulse">
      <div className="h-4 w-2/3 bg-ivory rounded mb-3" />
      <div className="h-2.5 w-full bg-ivory rounded mb-2" />
      <div className="h-2.5 w-5/6 bg-ivory rounded" />
    </div>
  );
}

function PollCard({ poll, onEdit, onCloseEarly, onDelete, closingId }) {
  const { t } = useI18n();
  const options = poll.options || [];
  const totalVotes = (poll.votedUsers || []).length;
  const denom = options.reduce((sum, o) => sum + (o.votes || 0), 0) || 1;
  const isOpen = !poll.closedEarly && new Date(poll.expiresAt) > new Date();

  let footerLabel;
  if (poll.closedEarly) {
    footerLabel = t("admin.community.polls.card.closedEarly", "Closed early");
  } else if (!isOpen) {
    footerLabel = `${t("admin.community.polls.card.endedPrefix", "Ended")} ${new Date(
      poll.expiresAt
    ).toLocaleString()}`;
  } else {
    footerLabel = `${t("admin.community.polls.card.expiresPrefix", "Expires")} ${new Date(
      poll.expiresAt
    ).toLocaleString()}`;
  }

  return (
    <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-ink text-[15px] break-words">
            {poll.question}
          </h3>
          {poll.description && (
            <p className="text-sm text-body mt-1 break-words">{poll.description}</p>
          )}
        </div>
        <div className="flex-none">
          <StatusPill
            status={isOpen ? "open" : "closed"}
            label={
              isOpen
                ? t("admin.community.polls.card.statusOpen", "Open")
                : t("admin.community.polls.card.statusClosed", "Closed")
            }
          />
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {options.map((opt, i) => {
          const pct = Math.round(((opt.votes || 0) / denom) * 100);
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-[12.5px] mb-1 gap-2">
                <span className="text-ink font-medium truncate">{opt.text}</span>
                <span className="text-body flex-none">
                  {pct}% · {opt.votes || 0}
                </span>
              </div>
              <div className="h-2 rounded-full bg-ivory overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-madder to-grape"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-line">
        <div className="flex flex-wrap items-center gap-3 text-xs text-body">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {totalVotes} {t("admin.community.polls.card.voteLabel", "vote")}
            {totalVotes === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {footerLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(poll)}
            className="h-8 px-3 rounded-full text-xs font-bold text-ink border border-line bg-white inline-flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" /> {t("admin.community.polls.card.editButton", "Edit")}
          </button>
          {isOpen && (
            <button
              type="button"
              onClick={() => onCloseEarly(poll)}
              disabled={closingId === poll._id}
              className="h-8 px-3 rounded-full text-xs font-bold text-ink border border-line bg-white inline-flex items-center gap-1 disabled:opacity-60"
            >
              <XCircle className="h-3.5 w-3.5" />
              {closingId === poll._id
                ? t("admin.community.polls.card.closingButton", "Closing…")
                : t("admin.community.polls.card.closeEarlyButton", "Close early")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(poll)}
            className="h-8 px-3 rounded-full text-xs font-bold text-white bg-alarm inline-flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("admin.community.polls.card.deleteButton", "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackRow({
  item,
  expanded,
  onToggleExpand,
  reviewing,
  onStartReview,
  onCancelReview,
  noteDraft,
  onNoteChange,
  onSubmitReview,
  saving,
}) {
  const { t } = useI18n();
  const { nicknames } = useNicknames();
  const message = item.message || "";
  const isLong = message.length > 140;

  return (
    <div className="app-glass glass-shadow rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display font-bold text-ink text-sm truncate">{item.subject}</h4>
            <StatusPill status={item.status} />
          </div>
          <p className="text-xs text-body mt-0.5 truncate">
            {item.member ? getDisplayName(item.member, nicknames) : t("admin.community.polls.feedbackRow.unknownMember", "Unknown member")} ·{" "}
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
          </p>
        </div>
        {item.status === "new" && !reviewing && (
          <button
            type="button"
            onClick={onStartReview}
            className="h-8 px-3 rounded-full text-xs font-bold text-white bg-gradient-to-r from-madder to-grape flex-none"
          >
            {t("admin.community.polls.feedbackRow.markReviewedButton", "Mark reviewed")}
          </button>
        )}
      </div>

      <p
        className={`text-sm text-body mt-2.5 whitespace-pre-wrap break-words ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {message}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-semibold text-madder mt-1 inline-flex items-center gap-0.5"
        >
          {expanded ? (
            <>
              {t("admin.community.polls.feedbackRow.showLess", "Show less")}{" "}
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              {t("admin.community.polls.feedbackRow.showMore", "Show more")}{" "}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}

      {item.status === "reviewed" && item.adminNote && (
        <div className="mt-2.5 text-xs text-body bg-ivory rounded-lg px-3 py-2">
          <span className="font-semibold text-ink">
            {t("admin.community.polls.feedbackRow.adminNoteLabel", "Admin note: ")}
          </span>
          {item.adminNote}
        </div>
      )}

      {reviewing && (
        <div className="mt-3 pt-3 border-t border-line">
          <label className={labelClass}>{t("admin.community.polls.feedbackRow.noteLabel", "Note (optional)")}</label>
          <textarea
            value={noteDraft}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={t(
              "admin.community.polls.feedbackRow.notePlaceholder",
              "Add an internal note about how this was handled…"
            )}
            className={`${textareaClass} mt-1`}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onSubmitReview}
              className="h-8 px-3.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            >
              {saving
                ? t("admin.community.polls.feedbackRow.savingButton", "Saving…")
                : t("admin.community.polls.feedbackRow.saveButton", "Save")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancelReview}
              className="h-8 px-3.5 rounded-full text-xs font-bold text-ink border border-line bg-white disabled:opacity-60"
            >
              {t("admin.community.polls.form.cancelButton", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BarChart3,
  MessageSquare,
  CalendarDays,
  Megaphone,
  MapPin,
  ArrowRight,
  Send,
} from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import StatusPill from "@/components/app/status-pill";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

// Rich-text notice content needs a short plain-text preview here — strip tags
// rather than rendering HTML in a compact card.
function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function MemberHomePage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // ---------------- This week's poll ----------------
  const [poll, setPoll] = useState(null);
  const [pollLoading, setPollLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  const fetchPoll = useCallback(() => {
    setPollLoading(true);
    return axiosInstance
      .get("/polls")
      .then((res) => {
        const polls = Array.isArray(res.data) ? res.data : [];
        // Backend returns newest-first — the first still-open poll is the
        // single most-recently-created open one.
        const open = polls.find((p) => !p.closedEarly && new Date(p.expiresAt) > new Date());
        setPoll(open || null);
        setVoted(false);
        setSelectedOption(null);
      })
      .catch(() => setPoll(null))
      .finally(() => setPollLoading(false));
  }, []);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const submitVote = () => {
    if (!poll || selectedOption == null || voting) return;
    setVoting(true);
    axiosInstance
      .put(`/polls/${poll._id}/vote`, { optionIndex: selectedOption })
      .then((res) => {
        setPoll(res.data);
        setVoted(true);
        toast({ title: t("member.home.poll.toast.voteRecorded", "Vote recorded") });
      })
      .catch((err) => {
        const message = apiErrorMessage(err, t("member.home.poll.toast.voteError", "Couldn't submit your vote"));
        if (message.toLowerCase().includes("already voted")) {
          toast({ title: t("member.home.poll.toast.alreadyVoted", "You've already voted on this poll") });
          setVoted(true);
          // Refresh so the results bars reflect real current counts.
          axiosInstance
            .get("/polls")
            .then((res) => {
              const fresh = (res.data || []).find((p) => p._id === poll._id);
              if (fresh) setPoll(fresh);
            })
            .catch(() => {});
        } else {
          toast({ title: message, variant: "destructive" });
        }
      })
      .finally(() => setVoting(false));
  };

  const pollDenom = poll ? (poll.options || []).reduce((sum, o) => sum + (o.votes || 0), 0) || 1 : 1;

  // ---------------- Feedback ----------------
  const [feedbackForm, setFeedbackForm] = useState({ subject: "", message: "" });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const submitFeedback = (e) => {
    e.preventDefault();
    if (submittingFeedback) return;

    const subject = feedbackForm.subject.trim();
    const message = feedbackForm.message.trim();
    if (!subject || !message) {
      toast({ title: t("member.home.feedback.toast.missingFields", "Please fill in both fields"), variant: "destructive" });
      return;
    }

    setSubmittingFeedback(true);
    axiosInstance
      .post("/feedback", { subject, message })
      .then(() => {
        toast({ title: t("member.home.feedback.toast.sent", "Feedback sent — thank you") });
        setFeedbackForm({ subject: "", message: "" });
      })
      .catch((err) =>
        toast({ title: apiErrorMessage(err, t("member.home.feedback.toast.error", "Couldn't send feedback")), variant: "destructive" })
      )
      .finally(() => setSubmittingFeedback(false));
  };

  // ---------------- Upcoming workshops preview ----------------
  const [workshops, setWorkshops] = useState([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(true);
  const [registering, setRegistering] = useState({});
  const [registered, setRegistered] = useState({});

  useEffect(() => {
    setWorkshopsLoading(true);
    axiosInstance
      .get("/workshops", { params: { limit: 50 } })
      .then((res) => {
        const now = Date.now();
        const upcoming = (res.data.workshops || [])
          .filter((w) => new Date(w.date).getTime() >= now)
          .slice(0, 3);
        setWorkshops(upcoming);
      })
      .catch(() => setWorkshops([]))
      .finally(() => setWorkshopsLoading(false));
  }, []);

  const handleRegister = (workshop) => {
    if (registering[workshop._id] || registered[workshop._id]) return;
    setRegistering((r) => ({ ...r, [workshop._id]: true }));
    axiosInstance
      .post(`/workshops/${workshop._id}/register`)
      .then((res) => {
        setWorkshops((prev) => prev.map((w) => (w._id === workshop._id ? res.data : w)));
        setRegistered((r) => ({ ...r, [workshop._id]: true }));
        toast({ title: t("member.home.upcomingWorkshops.toast.registered", "You're registered"), description: workshop.title });
      })
      .catch((err) => {
        const message = apiErrorMessage(err, t("member.home.upcomingWorkshops.toast.registerError", "Couldn't register"));
        if (message.toLowerCase().includes("already registered")) {
          setRegistered((r) => ({ ...r, [workshop._id]: true }));
          toast({ title: t("member.home.upcomingWorkshops.toast.alreadyRegistered", "You're already registered for this workshop") });
        } else {
          toast({ title: message, variant: "destructive" });
        }
      })
      .finally(() => setRegistering((r) => ({ ...r, [workshop._id]: false })));
  };

  // ---------------- Notices preview ----------------
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  useEffect(() => {
    setNoticesLoading(true);
    axiosInstance
      .get("/notices")
      .then((res) => setNotices((Array.isArray(res.data) ? res.data : []).slice(0, 3)))
      .catch(() => setNotices([]))
      .finally(() => setNoticesLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title={t("member.home.title", "Home")}
        description={t("member.home.description", "Your federation activity at a glance.")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* This week's poll */}
        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="h-8 w-8 rounded-full bg-ivory flex items-center justify-center flex-none">
              <BarChart3 className="h-4 w-4 text-body" strokeWidth={1.75} />
            </div>
            <h2 className="font-display text-base font-bold text-ink">{t("member.home.poll.title", "This week’s poll")}</h2>
          </div>

          {pollLoading ? (
            <div className="text-sm text-body py-8 text-center">{t("member.home.poll.loading", "Loading…")}</div>
          ) : !poll ? (
            <EmptyState
              icon={BarChart3}
              title={t("member.home.poll.emptyState.title", "No open polls right now")}
              description={t("member.home.poll.emptyState.description", "Check back soon — new polls are posted regularly.")}
            />
          ) : (
            <div>
              <h3 className="font-display font-bold text-ink text-[15px] break-words">{poll.question}</h3>
              {poll.description && <p className="text-sm text-body mt-1 break-words">{poll.description}</p>}

              {!voted ? (
                <>
                  <div className="space-y-2 mt-3.5">
                    {(poll.options || []).map((opt, i) => (
                      <label
                        key={i}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          selectedOption === i ? "border-madder bg-[#F5F4FE]" : "border-line bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="poll-option"
                          checked={selectedOption === i}
                          onChange={() => setSelectedOption(i)}
                          className="accent-madder h-4 w-4 flex-none"
                        />
                        <span className="text-[13px] text-ink break-words">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3.5 gap-2.5">
                    <span className="text-[11px] text-body">
                      {t("member.home.poll.expiresLabel", "Expires")} {new Date(poll.expiresAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      disabled={selectedOption == null || voting}
                      onClick={submitVote}
                      className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-50 w-full sm:w-auto"
                    >
                      {voting ? t("member.home.poll.votingButton", "Voting…") : t("member.home.poll.voteButton", "Vote")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5 mt-3.5">
                  {(poll.options || []).map((opt, i) => {
                    const pct = Math.round(((opt.votes || 0) / pollDenom) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-[12.5px] mb-1 gap-2">
                          <span className="text-ink font-medium truncate">{opt.text}</span>
                          <span className="text-body flex-none">{pct}%</span>
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
                  <div className="text-[11px] text-body pt-1">{t("member.home.poll.thanksMessage", "Thanks for sharing your vote.")}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="h-8 w-8 rounded-full bg-ivory flex items-center justify-center flex-none">
              <MessageSquare className="h-4 w-4 text-body" strokeWidth={1.75} />
            </div>
            <h2 className="font-display text-base font-bold text-ink">{t("member.home.feedback.title", "Feedback")}</h2>
          </div>
          <p className="text-[12.5px] text-body mb-3">{t("member.home.feedback.description", "Have a suggestion or concern? Tell us directly.")}</p>
          <form onSubmit={submitFeedback} className="space-y-2.5">
            <div>
              <label className="text-[11px] font-bold text-ink block mb-1">{t("member.home.feedback.form.subjectLabel", "Subject")}</label>
              <input
                type="text"
                required
                maxLength={150}
                value={feedbackForm.subject}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder={t("member.home.feedback.form.subjectPlaceholder", "e.g. Suggestion for next AGM")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink block mb-1">{t("member.home.feedback.form.messageLabel", "Message")}</label>
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={feedbackForm.message}
                onChange={(e) => setFeedbackForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t("member.home.feedback.form.messagePlaceholder", "Your message…")}
                className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] outline-none resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingFeedback}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 inline-flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <Send className="h-3.5 w-3.5" />
                {submittingFeedback
                  ? t("member.home.feedback.form.sendingButton", "Sending…")
                  : t("member.home.feedback.form.sendButton", "Send feedback")}
              </button>
            </div>
          </form>
        </div>

        {/* Upcoming workshops preview */}
        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-ivory flex items-center justify-center flex-none">
                <CalendarDays className="h-4 w-4 text-body" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-base font-bold text-ink truncate">{t("member.home.upcomingWorkshops.title", "Upcoming workshops")}</h2>
            </div>
            <Link
              href="/dashboard/workshops"
              className="text-xs font-bold text-madder inline-flex items-center gap-0.5 flex-none"
            >
              {t("member.home.upcomingWorkshops.seeAll", "See all")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {workshopsLoading ? (
            <div className="text-sm text-body py-8 text-center">{t("member.home.upcomingWorkshops.loading", "Loading…")}</div>
          ) : workshops.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t("member.home.upcomingWorkshops.emptyState.title", "No upcoming workshops")}
              description={t("member.home.upcomingWorkshops.emptyState.description", "New workshops will appear here once scheduled.")}
            />
          ) : (
            <div className="space-y-2">
              {workshops.map((w) => (
                <div
                  key={w._id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-line bg-white p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-ink truncate">{w.title}</div>
                    <div className="text-[11.5px] text-body mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 flex-none" />
                        {format(new Date(w.date), "MMM d, h:mm a")}
                      </span>
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 flex-none" />
                        <span className="truncate">{w.location}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={registered[w._id] || registering[w._id]}
                    onClick={() => handleRegister(w)}
                    className={
                      registered[w._id]
                        ? "flex-none h-8 px-3 rounded-full text-[11.5px] font-bold text-body border border-line bg-ivory w-full sm:w-auto"
                        : "flex-none h-8 px-3 rounded-full text-[11.5px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
                    }
                  >
                    {registered[w._id]
                      ? t("member.home.upcomingWorkshops.registeredButton", "Registered ✓")
                      : registering[w._id]
                      ? t("member.home.upcomingWorkshops.registeringButton", "Registering…")
                      : t("member.home.upcomingWorkshops.registerButton", "Register")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notices preview */}
        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-ivory flex items-center justify-center flex-none">
                <Megaphone className="h-4 w-4 text-body" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-base font-bold text-ink truncate">{t("member.home.noticesPreview.title", "Notices for you")}</h2>
            </div>
            <Link
              href="/dashboard/notices"
              className="text-xs font-bold text-madder inline-flex items-center gap-0.5 flex-none"
            >
              {t("member.home.noticesPreview.seeAll", "See all")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {noticesLoading ? (
            <div className="text-sm text-body py-8 text-center">{t("member.home.noticesPreview.loading", "Loading…")}</div>
          ) : notices.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={t("member.home.noticesPreview.emptyState.title", "No notices right now")}
              description={t("member.home.noticesPreview.emptyState.description", "Notices targeted to you will show up here.")}
            />
          ) : (
            <div className="space-y-2">
              {notices.map((n) => (
                <div key={n._id} className="rounded-xl border border-line bg-white p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] font-bold text-ink truncate flex-1 min-w-0">{n.title}</div>
                    <StatusPill status={n.targetAudience} />
                  </div>
                  <p className="text-[12px] text-body mt-1 line-clamp-2">{stripHtml(n.content)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

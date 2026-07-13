"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, MapPin, Users, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "mine", label: "My registrations" },
];

const isSameLocalDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function MemberWorkshopsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");

  const [registering, setRegistering] = useState({});
  const [unregistering, setUnregistering] = useState({});

  const [detailWorkshop, setDetailWorkshop] = useState(null);

  const fetchWorkshops = useCallback(() => {
    setLoading(true);
    return axiosInstance
      .get("/workshops", { params: { page, limit: 200 } })
      .then((res) => {
        setWorkshops(res.data.workshops || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) =>
        toast({ title: apiErrorMessage(err, t("member.home.workshopsPage.toast.loadError", "Couldn't load workshops")), variant: "destructive" })
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  // Upcoming (soonest first) ahead of past (most recent first), then the
  // selected filter narrows that combined list.
  const sorted = useMemo(() => {
    const now = Date.now();
    const upcoming = workshops
      .filter((w) => new Date(w.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const past = workshops
      .filter((w) => new Date(w.date).getTime() < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return [...upcoming, ...past];
  }, [workshops]);

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    const now = new Date();
    if (filter === "today") return sorted.filter((w) => isSameLocalDay(new Date(w.date), now));
    if (filter === "upcoming") return sorted.filter((w) => new Date(w.date).getTime() >= now.getTime());
    if (filter === "past") return sorted.filter((w) => new Date(w.date).getTime() < now.getTime());
    if (filter === "mine") return sorted.filter((w) => w.isRegistered);
    return sorted;
  }, [sorted, filter]);

  const handleRegister = (workshop) => {
    if (registering[workshop._id] || workshop.isRegistered) return;
    setRegistering((r) => ({ ...r, [workshop._id]: true }));
    axiosInstance
      .post(`/workshops/${workshop._id}/register`)
      .then((res) => {
        setWorkshops((prev) => prev.map((w) => (w._id === workshop._id ? res.data : w)));
        toast({ title: t("member.home.workshopsPage.toast.registered", "You're registered"), description: workshop.title });
      })
      .catch((err) => {
        const message = apiErrorMessage(err, t("member.home.workshopsPage.toast.registerError", "Couldn't register"));
        if (message.toLowerCase().includes("already registered")) {
          setWorkshops((prev) => prev.map((w) => (w._id === workshop._id ? { ...w, isRegistered: true } : w)));
          toast({ title: t("member.home.workshopsPage.toast.alreadyRegistered", "You're already registered for this workshop") });
        } else {
          toast({ title: message, variant: "destructive" });
        }
      })
      .finally(() => setRegistering((r) => ({ ...r, [workshop._id]: false })));
  };

  const handleUnregister = (workshop) => {
    if (unregistering[workshop._id]) return;
    setUnregistering((r) => ({ ...r, [workshop._id]: true }));
    axiosInstance
      .post(`/workshops/${workshop._id}/unregister`)
      .then((res) => {
        setWorkshops((prev) => prev.map((w) => (w._id === workshop._id ? res.data : w)));
        toast({ title: t("member.home.workshopsPage.toast.cancelled", "Registration cancelled"), description: workshop.title });
      })
      .catch((err) =>
        toast({ title: apiErrorMessage(err, t("member.home.workshopsPage.toast.cancelError", "Couldn't cancel registration")), variant: "destructive" })
      )
      .finally(() => setUnregistering((r) => ({ ...r, [workshop._id]: false })));
  };

  return (
    <div>
      <PageHeader
        title={t("member.home.workshopsPage.title", "Workshops")}
        description={t("member.home.workshopsPage.description", "Register for workshops and keep track of what's coming up.")}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={
              filter === f.value
                ? "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                : "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white"
            }
          >
            {t(`member.home.workshopsPage.filters.${f.value}`, f.label)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <WorkshopCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={CalendarDays}
            title={t("member.home.workshopsPage.emptyState.title", "No workshops yet")}
            description={t("member.home.workshopsPage.emptyState.description", "Scheduled workshops will appear here — check back soon.")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map((w) => {
              const registeredCount = w.registeredCount || 0;
              const capacity = w.capacity || 1;
              const pct = Math.min(100, Math.round((registeredCount / capacity) * 100));
              const isFull = registeredCount >= capacity;
              const isRegistered = !!w.isRegistered;
              const isPast = new Date(w.date).getTime() < Date.now();
              const busy = registering[w._id] || unregistering[w._id];

              let buttonLabel = t("member.home.workshopsPage.registerButton", "Register");
              if (isRegistered) buttonLabel = busy
                ? t("member.home.workshopsPage.cancellingButton", "Cancelling…")
                : t("member.home.workshopsPage.unregisterButton", "Unregister");
              else if (busy) buttonLabel = t("member.home.workshopsPage.registeringButton", "Registering…");
              else if (isFull) buttonLabel = t("member.home.workshopsPage.fullButton", "Full");

              const buttonDisabled = busy || isPast || (!isRegistered && isFull);

              return (
                <div
                  key={w._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailWorkshop(w)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailWorkshop(w);
                    }
                  }}
                  className="app-glass glass-shadow rounded-2xl p-4 sm:p-5 flex flex-col cursor-pointer hover-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-ink text-[15px] break-words">{w.title}</h3>
                    {w.isCheckedIn && (
                      <span className="flex-none inline-flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-bold text-ok">
                        <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                        {t("member.home.workshopsPage.checkedInBadge", "Checked in")}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-body mt-1.5 line-clamp-2">{w.description}</p>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-body">
                      <CalendarDays className="h-3.5 w-3.5 flex-none" />
                      <span className="truncate">{format(new Date(w.date), "EEE, MMM d, yyyy · h:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-body">
                      <MapPin className="h-3.5 w-3.5 flex-none" />
                      <span className="truncate">{w.location}</span>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[11px] text-body mb-1 gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3 flex-none" />
                        {registeredCount} / {capacity} {t("member.home.workshopsPage.registeredLabel", "registered")}
                      </span>
                      {isFull && (
                        <span className="flex-none text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
                          {t("member.home.workshopsPage.fullBadge", "Full")}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-ivory overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-madder to-grape"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      disabled={buttonDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        isRegistered ? handleUnregister(w) : handleRegister(w);
                      }}
                      className={
                        isRegistered
                          ? "w-full h-9 rounded-full text-[13px] font-bold text-ink border border-line bg-white disabled:opacity-60"
                          : "w-full h-9 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-50"
                      }
                    >
                      {isPast ? t("member.home.workshopsPage.pastWorkshopButton", "Past workshop") : buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </>
      )}

      {/* View details dialog — count only, never other registrants' names (enforced server-side). */}
      <Dialog open={!!detailWorkshop} onOpenChange={(v) => !v && setDetailWorkshop(null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          {detailWorkshop && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-ink">{detailWorkshop.title}</DialogTitle>
                <DialogDescription className="text-body whitespace-pre-line">{detailWorkshop.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[13px] text-body">
                  <CalendarDays className="h-4 w-4 flex-none" />
                  {format(new Date(detailWorkshop.date), "EEEE, MMMM d, yyyy · h:mm a")}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-body">
                  <MapPin className="h-4 w-4 flex-none" />
                  {detailWorkshop.location}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-body">
                  <Users className="h-4 w-4 flex-none" />
                  {detailWorkshop.registeredCount || 0} / {detailWorkshop.capacity} {t("member.home.workshopsPage.registeredLabel", "registered")}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {detailWorkshop.isRegistered && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E5E3FB] px-2.5 py-1 text-[11px] font-bold text-[#4338CA]">
                    {t("member.home.workshopsPage.detail.registeredBadge", "You're registered")}
                  </span>
                )}
                {detailWorkshop.isCheckedIn && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {t("member.home.workshopsPage.detail.checkedInBadge", "You're checked in")}
                  </span>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkshopCardSkeleton() {
  return (
    <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5 animate-pulse">
      <div className="h-4 w-2/3 bg-ivory rounded mb-3" />
      <div className="h-2.5 w-full bg-ivory rounded mb-2" />
      <div className="h-2.5 w-5/6 bg-ivory rounded mb-4" />
      <div className="h-2.5 w-1/2 bg-ivory rounded mb-2" />
      <div className="h-2.5 w-1/3 bg-ivory rounded mb-4" />
      <div className="h-9 w-full bg-ivory rounded-full" />
    </div>
  );
}

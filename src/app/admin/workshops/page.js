"use client";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, MapPin, Pencil, Trash2, X, RefreshCw } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import WorkshopCalendar from "@/components/app/workshop-calendar";
import QrCheckinPanel from "@/components/app/qr-checkin-panel";
import EmptyState from "@/components/app/empty-state";
import ConfirmDialog from "@/components/app/confirm-dialog";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

function emptyForm() {
  return { title: "", description: "", date: "", location: "", capacity: "" };
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the browser's local time —
// build it manually rather than slicing an ISO string (which is UTC).
function toDatetimeLocalValue(isoOrDate) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminWorkshopsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  const [workshops, setWorkshops] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" | "edit"
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedWorkshop = useMemo(
    () => workshops.find((w) => w._id === selectedId) || null,
    [workshops, selectedId]
  );

  const fetchWorkshops = () => {
    setLoadingList(true);
    return axiosInstance
      .get("/workshops", { params: { limit: 200 } })
      .then((res) => setWorkshops(res.data.workshops || []))
      .catch((err) =>
        toast({
          title: t("admin.community.workshops.toast.loadError", "Couldn't load workshops"),
          description: apiErrorMessage(err),
          variant: "destructive",
        })
      )
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchWorkshops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAttendance = (id) => {
    setAttendanceLoading(true);
    axiosInstance
      .get(`/workshops/${id}/attendance`)
      .then((res) => setAttendance(res.data))
      .catch(() => setAttendance(null))
      .finally(() => setAttendanceLoading(false));
  };

  useEffect(() => {
    if (selectedId) fetchAttendance(selectedId);
    else setAttendance(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleSelectDay = (day, events) => {
    setSelectedDay(day);
    if (events && events.length) setSelectedId(events[0]._id);
  };

  const handleSelectWorkshop = (w) => {
    setSelectedId(w._id);
    setSelectedDay(new Date(w.date));
  };

  const openCreateForm = () => {
    setFormMode("create");
    setFormData(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = (w) => {
    setFormMode("edit");
    setFormData({
      title: w.title || "",
      description: w.description || "",
      date: toDatetimeLocalValue(w.date),
      location: w.location || "",
      capacity: w.capacity != null ? String(w.capacity) : "",
    });
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (saving) return;

    const dateObj = new Date(formData.date);
    if (Number.isNaN(dateObj.getTime())) {
      toast({
        title: t("admin.community.workshops.toast.invalidDateTime", "Please choose a valid date and time"),
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: dateObj.toISOString(),
      location: formData.location.trim(),
      capacity: Number(formData.capacity),
    };

    setSaving(true);
    const req =
      formMode === "edit"
        ? axiosInstance.put(`/workshops/${selectedId}`, payload)
        : axiosInstance.post("/workshops", payload);

    req
      .then((res) => {
        toast({
          title:
            formMode === "edit"
              ? t("admin.community.workshops.toast.updated", "Workshop updated")
              : t("admin.community.workshops.toast.created", "Workshop created"),
        });
        setFormOpen(false);
        return fetchWorkshops().then(() => {
          if (formMode === "create") {
            setSelectedId(res.data._id);
            setSelectedDay(new Date(res.data.date));
          } else if (selectedId) {
            fetchAttendance(selectedId);
          }
        });
      })
      .catch((err) =>
        toast({
          title: t("admin.community.workshops.toast.saveError", "Couldn't save workshop"),
          description: apiErrorMessage(err),
          variant: "destructive",
        })
      )
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!selectedWorkshop) return;
    setDeleting(true);
    axiosInstance
      .delete(`/workshops/${selectedWorkshop._id}`)
      .then(() => {
        toast({ title: t("admin.community.workshops.toast.deleted", "Workshop deleted") });
        setDeleteOpen(false);
        setSelectedId(null);
        setAttendance(null);
        fetchWorkshops();
      })
      .catch((err) =>
        toast({
          title: t("admin.community.workshops.toast.deleteError", "Couldn't delete workshop"),
          description: apiErrorMessage(err),
          variant: "destructive",
        })
      )
      .finally(() => setDeleting(false));
  };

  const upcoming = useMemo(() => {
    const now = Date.now();
    return workshops
      .filter((w) => new Date(w.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [workshops]);

  return (
    <div>
      <PageHeader
        title={t("admin.community.workshops.title", "Workshops")}
        description={t(
          "admin.community.workshops.description",
          "Schedule workshops, track registrations, and manage check-ins."
        )}
        action={
          <button
            type="button"
            onClick={openCreateForm}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
          >
            {t("admin.community.workshops.newWorkshopButton", "+ New workshop")}
          </button>
        }
      />

      {formOpen && (
        <WorkshopFormPanel
          mode={formMode}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onCancel={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        {/* LEFT: calendar */}
        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5 min-w-0">
          {loadingList ? (
            <div className="text-[13px] text-body py-10 text-center">
              {t("admin.community.workshops.loadingCalendar", "Loading calendar…")}
            </div>
          ) : (
            <WorkshopCalendar workshops={workshops} onSelectDay={handleSelectDay} selectedDay={selectedDay} />
          )}
        </div>

        {/* RIGHT: details panel */}
        <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5 min-w-0">
          {!selectedWorkshop ? (
            <EmptyState
              icon={CalendarDays}
              title={t("admin.community.workshops.emptyState.title", "Pick a workshop")}
              description={t(
                "admin.community.workshops.emptyState.description",
                "Select a day with a workshop on the calendar, or create a new one."
              )}
              action={
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
                >
                  {t("admin.community.workshops.newWorkshopButton", "+ New workshop")}
                </button>
              }
            />
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display font-bold text-ink text-[16px] leading-snug break-words">
                  {selectedWorkshop.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label={t("admin.community.workshops.closeDetailsAriaLabel", "Close details")}
                  className="flex-none h-7 w-7 rounded-lg border border-line bg-white flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-body" />
                </button>
              </div>

              <p className="text-[12.5px] text-body mt-2 whitespace-pre-wrap">{selectedWorkshop.description}</p>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[12px] text-body">
                  <CalendarDays className="h-3.5 w-3.5 flex-none" />
                  <span>{format(new Date(selectedWorkshop.date), "EEE, MMM d, yyyy · h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-body">
                  <MapPin className="h-3.5 w-3.5 flex-none" />
                  <span className="truncate">{selectedWorkshop.location}</span>
                </div>
              </div>

              <div className="h-px bg-line my-4" />

              <QrCheckinPanel workshop={selectedWorkshop} />

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => openEditForm(selectedWorkshop)}
                  className="flex-1 h-9 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white flex items-center justify-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("admin.community.workshops.editButton", "Edit")}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="flex-1 h-9 rounded-full text-[12.5px] font-bold text-white bg-alarm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("admin.community.workshops.deleteButton", "Delete")}
                </button>
              </div>

              <div className="h-px bg-line my-4" />

              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-body/70">
                  {t("admin.community.workshops.attendanceLabel", "Attendance")}
                </div>
                <button
                  type="button"
                  onClick={() => fetchAttendance(selectedWorkshop._id)}
                  aria-label={t("admin.community.workshops.refreshAttendanceAriaLabel", "Refresh attendance")}
                  className="h-6 w-6 rounded-lg border border-line bg-white flex items-center justify-center"
                >
                  <RefreshCw className={`h-3 w-3 text-body ${attendanceLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-ink mb-1">
                    {t("admin.community.workshops.registeredLabel", "Registered")} (
                    {attendance?.registeredUsers?.length ?? selectedWorkshop.registeredUsers?.length ?? 0})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {attendanceLoading && !attendance && (
                      <div className="text-[11px] text-body">
                        {t("admin.community.workshops.loadingEllipsis", "Loading…")}
                      </div>
                    )}
                    {attendance?.registeredUsers?.length === 0 && (
                      <div className="text-[11px] text-body/70">
                        {t("admin.community.workshops.noneYet", "None yet.")}
                      </div>
                    )}
                    {attendance?.registeredUsers?.map((u) => (
                      <div key={u._id} className="text-[11.5px] text-body truncate">
                        {getDisplayName(u, nicknames)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-ink mb-1">
                    {t("admin.community.workshops.checkedInLabel", "Checked in")} (
                    {attendance?.checkedInUsers?.length ?? selectedWorkshop.checkedInUsers?.length ?? 0})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {attendanceLoading && !attendance && (
                      <div className="text-[11px] text-body">
                        {t("admin.community.workshops.loadingEllipsis", "Loading…")}
                      </div>
                    )}
                    {attendance?.checkedInUsers?.length === 0 && (
                      <div className="text-[11px] text-body/70">
                        {t("admin.community.workshops.noneYet", "None yet.")}
                      </div>
                    )}
                    {attendance?.checkedInUsers?.map((u) => (
                      <div key={u._id} className="text-[11.5px] text-body truncate">
                        {getDisplayName(u, nicknames)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flat overview of all upcoming workshops, for quick scanning */}
      <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5 mt-4">
        <div className="font-display font-bold text-ink text-[15px] mb-3">
          {t("admin.community.workshops.upcomingHeading", "Upcoming workshops")}
        </div>
        {loadingList ? (
          <div className="text-[13px] text-body py-6 text-center">
            {t("admin.community.workshops.loadingEllipsis", "Loading…")}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("admin.community.workshops.noUpcoming.title", "No upcoming workshops")}
            description={t(
              "admin.community.workshops.noUpcoming.description",
              "Schedule your first workshop to see it listed here."
            )}
            action={
              <button
                type="button"
                onClick={openCreateForm}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.community.workshops.newWorkshopButton", "+ New workshop")}
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {upcoming.map((w) => {
              const registered = w.registeredUsers?.length || 0;
              const capacity = w.capacity || 1;
              const pct = Math.min(100, (registered / capacity) * 100);
              const active = w._id === selectedId;
              return (
                <button
                  key={w._id}
                  type="button"
                  onClick={() => handleSelectWorkshop(w)}
                  className={`w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border p-3 text-left transition-colors ${
                    active ? "border-madder bg-[#F5F4FE]" : "border-line bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink truncate">{w.title}</div>
                    <div className="text-[11.5px] text-body mt-0.5 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 flex-none" />
                      <span className="truncate">{format(new Date(w.date), "EEE, MMM d, yyyy · h:mm a")}</span>
                    </div>
                  </div>
                  <div className="flex-none w-full sm:w-36">
                    <div className="w-full h-1.5 rounded-full bg-ivory overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-madder to-grape"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10.5px] text-body mt-1 text-right">
                      {registered} / {capacity}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("admin.community.workshops.deleteDialog.title", "Delete this workshop?")}
        description={
          selectedWorkshop
            ? `"${selectedWorkshop.title}" ${t(
                "admin.community.workshops.deleteDialog.descriptionSuffix",
                "will be permanently removed, along with its registration and check-in records."
              )}`
            : undefined
        }
        confirmLabel={t("admin.community.workshops.deleteDialog.confirmLabel", "Delete workshop")}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function WorkshopFormPanel({ mode, formData, setFormData, saving, onCancel, onSubmit }) {
  const { t } = useI18n();
  const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="app-glass glass-shadow rounded-2xl p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-bold text-ink text-[15px]">
          {mode === "edit"
            ? t("admin.community.workshops.form.editTitle", "Edit workshop")
            : t("admin.community.workshops.form.createTitle", "New workshop")}
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("admin.community.workshops.form.closeFormAriaLabel", "Close form")}
          className="h-7 w-7 rounded-lg border border-line bg-white flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5 text-body" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-[11px] font-bold text-ink block mb-1">
            {t("admin.community.workshops.form.titleLabel", "Title")}
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={formData.title}
            onChange={set("title")}
            className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] outline-none"
            placeholder={t(
              "admin.community.workshops.form.titlePlaceholder",
              "e.g. Digital marketing for small manufacturers"
            )}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-ink block mb-1">
            {t("admin.community.workshops.form.descriptionLabel", "Description")}
          </label>
          <textarea
            required
            maxLength={1000}
            rows={3}
            value={formData.description}
            onChange={set("description")}
            className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] outline-none resize-none"
            placeholder={t(
              "admin.community.workshops.form.descriptionPlaceholder",
              "What will this workshop cover?"
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-ink block mb-1">
              {t("admin.community.workshops.form.dateTimeLabel", "Date & time")}
            </label>
            <input
              type="datetime-local"
              required
              value={formData.date}
              onChange={set("date")}
              className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-ink block mb-1">
              {t("admin.community.workshops.form.capacityLabel", "Capacity")}
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.capacity}
              onChange={set("capacity")}
              className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] outline-none"
              placeholder={t("admin.community.workshops.form.capacityPlaceholder", "e.g. 40")}
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-ink block mb-1">
            {t("admin.community.workshops.form.locationLabel", "Location")}
          </label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={set("location")}
            className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] outline-none"
            placeholder={t(
              "admin.community.workshops.form.locationPlaceholder",
              "e.g. Federation hall, MIDC Bhosari"
            )}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
          >
            {t("admin.community.workshops.form.cancelButton", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
          >
            {saving
              ? t("admin.community.workshops.form.savingButton", "Saving…")
              : mode === "edit"
              ? t("admin.community.workshops.form.saveChangesButton", "Save changes")
              : t("admin.community.workshops.form.createButton", "Create workshop")}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Megaphone, Paperclip, X, FileText } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import ConfirmDialog from "@/components/app/confirm-dialog";
import RichTextEditor from "@/components/app/rich-text-editor";
import StatusPill from "@/components/app/status-pill";
import TargetingPicker from "@/components/app/targeting-picker";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const MAX_NOTICE_ATTACHMENTS = 10;
const ATTACHMENT_ACCEPT = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx";

function classifyLocalFile(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

const emptyForm = {
  title: "",
  content: "",
  expiresAt: "",
  targetAudience: "everyone",
  targetBuildings: [],
  targetGalas: [],
  targetUsers: [],
  status: "published",
  publishAt: "",
};

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time — Date's ISO
// getters are UTC, so this builds the string from local getters instead.
function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrUndefined(localValue) {
  if (!localValue) return undefined;
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isContentEmpty(html) {
  return !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

function PillSelect({ options, value, onChange, group }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? "h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              : "h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
          }
        >
          {t(`admin.dashboard.notices.${group}Options.${opt.value}`, opt.label)}
        </button>
      ))}
    </div>
  );
}

export default function AdminNoticesPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const attachmentInputRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/notices/admin", { params: { page, limit: PAGE_SIZE } });
      const data = res.data;
      setItems(data.notices || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      toast({ title: t("admin.dashboard.notices.toast.loadError.title", "Couldn't load notices"), description: apiErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setExistingAttachments([]);
    setNewFiles([]);
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      content: item.content || "",
      expiresAt: toLocalInputValue(item.expiresAt),
      targetAudience: item.targetAudience || "everyone",
      targetBuildings: item.targetBuildings || [],
      targetGalas: item.targetGalas || [],
      targetUsers: item.targetUsers || [],
      status: item.status || "published",
      publishAt: toLocalInputValue(item.publishAt),
    });
    setExistingAttachments(item.attachments || []);
    setNewFiles([]);
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const totalAttachmentCount = existingAttachments.length + newFiles.length;

  const handleAttachmentsSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (totalAttachmentCount + files.length > MAX_NOTICE_ATTACHMENTS) {
      toast({
        title: t("admin.dashboard.notices.toast.tooManyAttachments", `Up to ${MAX_NOTICE_ATTACHMENTS} attachments allowed`),
        variant: "destructive",
      });
      return;
    }
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeExistingAttachment = (url) => {
    setExistingAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.title.trim()) {
      toast({ title: t("admin.dashboard.notices.toast.titleRequired", "Title is required"), variant: "destructive" });
      return;
    }
    if (isContentEmpty(form.content)) {
      toast({ title: t("admin.dashboard.notices.toast.contentRequired", "Content is required"), variant: "destructive" });
      return;
    }
    if (!form.expiresAt) {
      toast({ title: t("admin.dashboard.notices.toast.expiryRequired", "An expiry date is required"), variant: "destructive" });
      return;
    }
    if (form.status === "scheduled" && !form.publishAt) {
      toast({ title: t("admin.dashboard.notices.toast.publishDateRequired", "Pick a publish date/time for scheduled notices"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("content", form.content);
      fd.append("expiresAt", toIsoOrUndefined(form.expiresAt) || "");
      fd.append("targetAudience", form.targetAudience);
      fd.append("status", form.status);
      fd.append("targetBuildings", JSON.stringify(form.targetBuildings));
      fd.append("targetGalas", JSON.stringify(form.targetGalas));
      fd.append("targetUsers", JSON.stringify(form.targetUsers.map((u) => u._id)));
      if (form.status === "scheduled") {
        const iso = toIsoOrUndefined(form.publishAt);
        if (iso) fd.append("publishAt", iso);
      }
      if (editingId) fd.append("existingAttachments", JSON.stringify(existingAttachments.map((a) => a.url)));
      newFiles.forEach((f) => fd.append("files", f));

      if (editingId) {
        await axiosInstance.put(`/notices/${editingId}`, fd);
        toast({ title: t("admin.dashboard.notices.toast.noticeSaved", "Notice saved") });
      } else {
        await axiosInstance.post("/notices", fd);
        toast({ title: t("admin.dashboard.notices.toast.noticeCreated", "Notice created") });
      }
      closeForm();
      fetchItems();
    } catch (err) {
      toast({ title: t("admin.dashboard.notices.toast.saveError.title", "Couldn't save notice"), description: apiErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/notices/${deleteTarget._id}`);
      toast({ title: t("admin.dashboard.notices.toast.noticeDeleted", "Notice deleted") });
      setDeleteTarget(null);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchItems();
    } catch (err) {
      toast({ title: t("admin.dashboard.notices.toast.deleteError.title", "Couldn't delete notice"), description: apiErrorMessage(err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("admin.dashboard.notices.title", "Notices")}
        description={t("admin.dashboard.notices.description", "Time-bound announcements targeted to specific buildings, galas, or occupancy types.")}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("admin.dashboard.notices.newButton", "New notice")}
          </button>
        }
      />

      {showForm && (
        <div className="app-glass glass-shadow rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-ink">
              {editingId
                ? t("admin.dashboard.notices.form.editHeading", "Edit notice")
                : t("admin.dashboard.notices.form.newHeading", "New notice")}
            </h2>
            <button type="button" onClick={closeForm} className="text-body text-[12px] font-semibold">
              {t("admin.dashboard.notices.form.cancelButton", "Cancel")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.notices.form.titleLabel", "Title")}</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("admin.dashboard.notices.form.titlePlaceholder", "Notice title")}
                maxLength={150}
                required
                className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.notices.form.contentLabel", "Content")}</label>
              <RichTextEditor
                key={formKey}
                value={form.content}
                onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                placeholder={t("admin.dashboard.notices.form.contentPlaceholder", "Write the notice…")}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">
                {t("admin.dashboard.notices.form.attachmentsLabel", "Attachments")} ({existingAttachments.length + newFiles.length}/{MAX_NOTICE_ATTACHMENTS})
              </label>
              <div className="flex flex-wrap gap-2">
                {existingAttachments.map((a) => (
                  <div key={a.url} className="relative">
                    {a.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt="" className="h-16 w-16 rounded-lg object-cover border border-line" />
                    ) : a.type === "video" ? (
                      <video src={a.url} className="h-16 w-16 rounded-lg object-cover border border-line" />
                    ) : (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-16 w-16 rounded-lg border border-line bg-ivory flex flex-col items-center justify-center gap-0.5 px-1"
                      >
                        <FileText className="h-4 w-4 text-body" />
                        <span className="text-[9px] text-body truncate max-w-full">{a.fileName || "File"}</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(a.url)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {newFiles.map((f, i) => {
                  const kind = classifyLocalFile(f);
                  return (
                    <div key={i} className="relative">
                      {kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover border border-madder" />
                      ) : kind === "video" ? (
                        <video src={URL.createObjectURL(f)} className="h-16 w-16 rounded-lg object-cover border border-madder" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border border-madder bg-ivory flex flex-col items-center justify-center gap-0.5 px-1">
                          <FileText className="h-4 w-4 text-body" />
                          <span className="text-[9px] text-body truncate max-w-full">{f.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={totalAttachmentCount >= MAX_NOTICE_ATTACHMENTS}
                  className="h-16 w-16 rounded-lg border border-dashed border-line flex items-center justify-center text-body/60 disabled:opacity-50"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={handleAttachmentsSelected}
                />
              </div>
              <p className="text-[11px] text-body mt-1.5">
                {t("admin.dashboard.notices.form.attachmentsHint", "Images, videos, or documents (PDF, Word, Excel).")}
              </p>
            </div>

            <div className="max-w-xs">
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.notices.form.expiresAtLabel", "Expires at")}</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                required
                className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.notices.form.targetingLabel", "Targeting")}</label>
              <TargetingPicker
                value={{
                  targetAudience: form.targetAudience,
                  targetBuildings: form.targetBuildings,
                  targetGalas: form.targetGalas,
                  targetUsers: form.targetUsers,
                }}
                onChange={(next) => setForm((f) => ({ ...f, ...next }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.notices.form.statusLabel", "Status")}</label>
              <PillSelect options={STATUS_OPTIONS} value={form.status} onChange={(status) => setForm((f) => ({ ...f, status }))} group="status" />
            </div>

            {form.status === "scheduled" && (
              <div className="max-w-xs">
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.notices.form.publishAtLabel", "Publish at")}</label>
                <input
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white w-full sm:w-auto"
              >
                {t("admin.dashboard.notices.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
              >
                {submitting
                  ? t("admin.dashboard.notices.form.savingButton", "Saving…")
                  : editingId
                  ? t("admin.dashboard.notices.form.saveChangesButton", "Save changes")
                  : t("admin.dashboard.notices.form.createButton", "Create notice")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title={t("admin.dashboard.notices.emptyState.title", "No notices yet")}
            description={t("admin.dashboard.notices.emptyState.description", "Create a targeted notice for owners, tenants, or specific buildings.")}
            action={
              <button
                type="button"
                onClick={openCreate}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.dashboard.notices.emptyState.newButton", "+ New notice")}
              </button>
            }
          />
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.notices.table.headers.title", "Title")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.notices.table.headers.status", "Status")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.notices.table.headers.targeting", "Targeting")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.notices.table.headers.expires", "Expires")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70 text-right">{t("admin.dashboard.notices.table.headers.actions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const expired = item.expiresAt && new Date(item.expiresAt) < new Date();
                    return (
                      <tr key={item._id} className="border-b border-line last:border-0">
                        <td className="py-3 px-4 max-w-[260px]">
                          <div className="flex items-center gap-1.5">
                            <div className="font-semibold text-ink text-[13px] truncate">{item.title}</div>
                            {item.attachments?.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-body/70 flex-none">
                                <Paperclip className="h-3 w-3" /> {item.attachments.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={item.status} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            <StatusPill status={item.targetAudience} />
                            {item.targetBuildings?.length > 0 && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap">
                                {t("admin.dashboard.notices.table.buildingPrefix", "Bldg")} {item.targetBuildings.join(", ")}
                              </span>
                            )}
                            {item.targetGalas?.length > 0 && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap">
                                {t("admin.dashboard.notices.table.galaPrefix", "Gala")} {item.targetGalas.join(", ")}
                              </span>
                            )}
                            {item.targetUsers?.length > 0 && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#E5E3FB] text-[#4338CA] whitespace-nowrap">
                                +{item.targetUsers.length} {t("admin.dashboard.notices.table.peopleSuffix", "people")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-[12.5px] whitespace-nowrap ${expired ? "text-alarm font-semibold" : "text-body"}`}>
                          {expired ? `${t("admin.dashboard.notices.table.expiredPrefix", "Expired")} ` : ""}
                          {formatDate(item.expiresAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              aria-label={t("admin.dashboard.notices.table.editAriaLabel", "Edit")}
                              className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                            >
                              <Pencil className="h-3.5 w-3.5 text-body" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              aria-label={t("admin.dashboard.notices.table.deleteAriaLabel", "Delete")}
                              className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-alarm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-line">
              {items.map((item) => {
                const expired = item.expiresAt && new Date(item.expiresAt) < new Date();
                return (
                  <div key={item._id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-semibold text-ink text-[13.5px] line-clamp-2 flex-1">
                        {item.title}
                        {item.attachments?.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 text-[11px] font-normal text-body/70">
                            <Paperclip className="h-3 w-3" /> {item.attachments.length}
                          </span>
                        )}
                      </div>
                      <StatusPill status={item.status} className="flex-none" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mb-1.5">
                      <StatusPill status={item.targetAudience} />
                      {item.targetBuildings?.length > 0 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap">
                          {t("admin.dashboard.notices.table.buildingPrefix", "Bldg")} {item.targetBuildings.join(", ")}
                        </span>
                      )}
                      {item.targetGalas?.length > 0 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap">
                          {t("admin.dashboard.notices.table.galaPrefix", "Gala")} {item.targetGalas.join(", ")}
                        </span>
                      )}
                      {item.targetUsers?.length > 0 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#E5E3FB] text-[#4338CA] whitespace-nowrap">
                          +{item.targetUsers.length} {t("admin.dashboard.notices.table.peopleSuffix", "people")}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] mb-3 ${expired ? "text-alarm font-semibold" : "text-body"}`}>
                      {expired
                        ? `${t("admin.dashboard.notices.table.expiredPrefix", "Expired")} `
                        : `${t("admin.dashboard.notices.table.expiresPrefix", "Expires")} `}
                      {formatDate(item.expiresAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center justify-center gap-1"
                      >
                        <Pencil className="h-3 w-3" /> {t("admin.dashboard.notices.table.editButton", "Edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-alarm inline-flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> {t("admin.dashboard.notices.table.deleteButton", "Delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-line">
              <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("admin.dashboard.notices.deleteDialog.title", "Delete this notice?")}
        description={
          deleteTarget
            ? `"${deleteTarget.title}" ${t("admin.dashboard.notices.deleteDialog.description", "will be removed permanently. This can't be undone.")}`
            : undefined
        }
        confirmLabel={t("admin.dashboard.notices.deleteDialog.confirmButton", "Delete")}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

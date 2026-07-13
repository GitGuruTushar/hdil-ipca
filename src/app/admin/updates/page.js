"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Newspaper } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import ConfirmDialog from "@/components/app/confirm-dialog";
import RichTextEditor from "@/components/app/rich-text-editor";
import ChipInput from "@/components/app/chip-input";
import StatusPill from "@/components/app/status-pill";
import { LocalizedInput, ContentLanguageTabs } from "@/components/app/localized-fields";
import { emptyLocalized, pickLang } from "@/utils/localizedContent";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: "news", label: "News" },
  { value: "announcement", label: "Announcement" },
  { value: "blogs", label: "Blog post" },
];

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance" },
  { value: "events", label: "Events" },
  { value: "achievements", label: "Achievements" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

const emptyForm = {
  type: "news",
  category: "general",
  title: emptyLocalized(),
  content: emptyLocalized(),
  redirectUrl: "",
  keywords: [],
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

function isLocalizedContentEmpty(content) {
  return isContentEmpty(content?.en);
}

function StatusPicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((opt) => (
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
          {t(`admin.dashboard.updates.statusOptions.${opt.value}`, opt.label)}
        </button>
      ))}
    </div>
  );
}

export default function AdminUpdatesPage() {
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
  const [lang, setLang] = useState("en");
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideoUrl, setExistingVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/updates/admin", { params: { page, limit: PAGE_SIZE } });
      const data = res.data;
      if (Array.isArray(data)) {
        // Current /updates/admin route returns a bare array with no pagination —
        // paginate it client-side so the page still works, and it'll pick up
        // real server pagination transparently if the route adds it later.
        const totalItems = data.length;
        const tp = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        const safePage = Math.min(page, tp);
        const start = (safePage - 1) * PAGE_SIZE;
        setItems(data.slice(start, start + PAGE_SIZE));
        setTotalPages(tp);
        setTotal(totalItems);
      } else {
        setItems(data.updates || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      toast({ title: t("admin.dashboard.updates.toast.loadError.title", "Couldn't load updates"), description: apiErrorMessage(err), variant: "destructive" });
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
    setLang("en");
    setImageFiles([]);
    setVideoFile(null);
    setExistingImages([]);
    setExistingVideoUrl("");
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      type: item.type || "news",
      category: item.category || "general",
      title: item.title || emptyLocalized(),
      content: item.content || emptyLocalized(),
      redirectUrl: item.redirectUrl || "",
      keywords: item.keywords || [],
      status: item.status || "published",
      publishAt: toLocalInputValue(item.publishAt),
    });
    setLang("en");
    setImageFiles([]);
    setVideoFile(null);
    setExistingImages(item.images || []);
    setExistingVideoUrl(item.videoUrl || "");
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({
        title: t("admin.dashboard.updates.toast.tooManyImages.title", "Up to 5 images allowed"),
        description: t("admin.dashboard.updates.toast.tooManyImages.description", "Only the first 5 were kept."),
        variant: "destructive",
      });
      setImageFiles(files.slice(0, 5));
    } else {
      setImageFiles(files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.title.en.trim()) {
      toast({ title: t("admin.dashboard.updates.toast.titleRequired", "Title (English) is required"), variant: "destructive" });
      return;
    }
    if (isLocalizedContentEmpty(form.content)) {
      toast({ title: t("admin.dashboard.updates.toast.contentRequired", "Content (English) is required"), variant: "destructive" });
      return;
    }
    if (form.type === "blogs" && !form.redirectUrl.trim()) {
      toast({ title: t("admin.dashboard.updates.toast.redirectUrlRequired", "Redirect URL is required for blog posts"), variant: "destructive" });
      return;
    }
    if (form.status === "scheduled" && !form.publishAt) {
      toast({ title: t("admin.dashboard.updates.toast.publishDateRequired", "Pick a publish date/time for scheduled updates"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("type", form.type);
      fd.append("category", form.category);
      fd.append("title", JSON.stringify(form.title));
      fd.append("content", JSON.stringify(form.content));
      if (form.type === "blogs") fd.append("redirectUrl", form.redirectUrl.trim());
      form.keywords.forEach((kw) => fd.append("keywords", kw));
      fd.append("status", form.status);
      if (form.status === "scheduled") {
        const iso = toIsoOrUndefined(form.publishAt);
        if (iso) fd.append("publishAt", iso);
      }
      imageFiles.forEach((f) => fd.append("images", f));
      if (videoFile) fd.append("video", videoFile);

      if (editingId) {
        await axiosInstance.put(`/updates/${editingId}`, fd);
        toast({ title: t("admin.dashboard.updates.toast.updateSaved", "Update saved") });
      } else {
        await axiosInstance.post("/updates", fd);
        toast({ title: t("admin.dashboard.updates.toast.updateCreated", "Update created") });
      }
      closeForm();
      fetchItems();
    } catch (err) {
      toast({ title: t("admin.dashboard.updates.toast.saveError.title", "Couldn't save update"), description: apiErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/updates/${deleteTarget._id}`);
      toast({ title: t("admin.dashboard.updates.toast.updateDeleted", "Update deleted") });
      setDeleteTarget(null);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchItems();
    } catch (err) {
      toast({ title: t("admin.dashboard.updates.toast.deleteError.title", "Couldn't delete update"), description: apiErrorMessage(err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("admin.dashboard.updates.title", "Updates & news")}
        description={t("admin.dashboard.updates.description", "Publish news, announcements, and blog posts for members.")}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("admin.dashboard.updates.newButton", "New update")}
          </button>
        }
      />

      {showForm && (
        <div className="app-glass glass-shadow rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-ink">
              {editingId
                ? t("admin.dashboard.updates.form.editHeading", "Edit update")
                : t("admin.dashboard.updates.form.newHeading", "New update")}
            </h2>
            <button type="button" onClick={closeForm} className="text-body text-[12px] font-semibold">
              {t("admin.dashboard.updates.form.cancelButton", "Cancel")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide">{t("shared.forms.contentLanguageLabel", "Content language")}</label>
              <ContentLanguageTabs lang={lang} onChange={setLang} completenessValue={{ title: form.title, content: form.content }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.typeLabel", "Type")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`admin.dashboard.updates.typeOptions.${opt.value}`, opt.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.categoryLabel", "Category")}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`admin.dashboard.updates.categoryOptions.${opt.value}`, opt.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.titleLabel", "Title")}</label>
              <LocalizedInput
                value={form.title}
                lang={lang}
                onChange={(title) => setForm((f) => ({ ...f, title }))}
                placeholder={t("admin.dashboard.updates.form.titlePlaceholder", "Update title")}
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.contentLabel", "Content")}</label>
              <RichTextEditor
                key={`${formKey}-${lang}`}
                value={form.content[lang]}
                onChange={(html) => setForm((f) => ({ ...f, content: { ...f.content, [lang]: html } }))}
                placeholder={t("admin.dashboard.updates.form.contentPlaceholder", "Write the update…")}
              />
            </div>

            {form.type === "blogs" && (
              <div>
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.redirectUrlLabel", "Redirect URL")}</label>
                <input
                  type="url"
                  value={form.redirectUrl}
                  onChange={(e) => setForm((f) => ({ ...f, redirectUrl: e.target.value }))}
                  placeholder={t("admin.dashboard.updates.form.redirectUrlPlaceholder", "https://…")}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder"
                />
                <p className="mt-1 text-[11px] text-body/70">
                  {t("admin.dashboard.updates.form.redirectUrlHint", "This always opens as an external link. https:// will be added automatically if you leave it out.")}
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.keywordsLabel", "Keywords")}</label>
              <ChipInput value={form.keywords} onChange={(kws) => setForm((f) => ({ ...f, keywords: kws }))} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.statusLabel", "Status")}</label>
              <StatusPicker value={form.status} onChange={(status) => setForm((f) => ({ ...f, status }))} />
            </div>

            {form.status === "scheduled" && (
              <div className="max-w-xs">
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.publishAtLabel", "Publish at")}</label>
                <input
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.imagesLabel", "Images (up to 5)")}</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="w-full text-[12.5px] text-body file:mr-3 file:h-9 file:px-4 file:rounded-full file:border-0 file:text-[12.5px] file:font-bold file:text-ink file:bg-ivory"
                />
                {editingId && existingImages.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {existingImages.map((src, i) => (
                      <img key={i} src={src} alt="" className="h-10 w-10 rounded-lg object-cover border border-line" />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-body mt-1">{t("admin.dashboard.updates.form.imagesHelp", "Uploading new images replaces all current images.")}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1">{t("admin.dashboard.updates.form.videoLabel", "Video")}</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full text-[12.5px] text-body file:mr-3 file:h-9 file:px-4 file:rounded-full file:border-0 file:text-[12.5px] file:font-bold file:text-ink file:bg-ivory"
                />
                {editingId && existingVideoUrl && (
                  <a href={existingVideoUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] font-semibold text-madder mt-2">
                    {t("admin.dashboard.updates.form.currentVideoLink", "Current video ↗")}
                  </a>
                )}
                <p className="text-[11px] text-body mt-1">{t("admin.dashboard.updates.form.videoHelp", "Uploading a new video replaces the current one.")}</p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white w-full sm:w-auto"
              >
                {t("admin.dashboard.updates.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
              >
                {submitting
                  ? t("admin.dashboard.updates.form.savingButton", "Saving…")
                  : editingId
                  ? t("admin.dashboard.updates.form.saveChangesButton", "Save changes")
                  : t("admin.dashboard.updates.form.createButton", "Create update")}
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
            icon={Newspaper}
            title={t("admin.dashboard.updates.emptyState.title", "No updates yet")}
            description={t("admin.dashboard.updates.emptyState.description", "Create your first news post, announcement, or blog entry.")}
            action={
              <button
                type="button"
                onClick={openCreate}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.dashboard.updates.emptyState.newButton", "+ New update")}
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
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.updates.table.headers.title", "Title")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.updates.table.headers.status", "Status")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.updates.table.headers.category", "Category")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">{t("admin.dashboard.updates.table.headers.created", "Created")}</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70 text-right">{t("admin.dashboard.updates.table.headers.actions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className="border-b border-line last:border-0">
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="font-semibold text-ink text-[13px] truncate">{pickLang(item.title, "en")}</div>
                        <div className="text-[11px] text-body capitalize">{item.type}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="py-3 px-4 text-[12.5px] text-body capitalize whitespace-nowrap">{item.category}</td>
                      <td className="py-3 px-4 text-[12.5px] text-body whitespace-nowrap">{formatDate(item.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            aria-label={t("admin.dashboard.updates.table.editAriaLabel", "Edit")}
                            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                          >
                            <Pencil className="h-3.5 w-3.5 text-body" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={t("admin.dashboard.updates.table.deleteAriaLabel", "Delete")}
                            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-alarm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-line">
              {items.map((item) => (
                <div key={item._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-ink text-[13.5px] line-clamp-2 flex-1">{pickLang(item.title, "en")}</div>
                    <StatusPill status={item.status} className="flex-none" />
                  </div>
                  <div className="text-[11px] text-body capitalize mb-3">
                    {item.type} &middot; {item.category} &middot; {formatDate(item.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center justify-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> {t("admin.dashboard.updates.table.editButton", "Edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-alarm inline-flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> {t("admin.dashboard.updates.table.deleteButton", "Delete")}
                    </button>
                  </div>
                </div>
              ))}
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
        title={t("admin.dashboard.updates.deleteDialog.title", "Delete this update?")}
        description={
          deleteTarget
            ? `"${pickLang(deleteTarget.title, "en")}" ${t("admin.dashboard.updates.deleteDialog.description", "will be removed permanently. This can't be undone.")}`
            : undefined
        }
        confirmLabel={t("admin.dashboard.updates.deleteDialog.confirmButton", "Delete")}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import ConfirmDialog from "@/components/app/confirm-dialog";
import StatusPill from "@/components/app/status-pill";
import TargetingPicker from "@/components/app/targeting-picker";
import { useToast } from "@/hooks/use-toast";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/constants/documentCategories";

const LIMIT = 10;

const FILTER_OPTIONS = [{ value: "", label: "All" }, ...DOCUMENT_CATEGORY_OPTIONS];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "other",
  otherCategoryLabel: "",
  targetAudience: "everyone",
  targetBuildings: [],
  targetGalas: [],
  targetUsers: [],
};

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors";
const labelCls = "block text-[11px] font-bold text-body uppercase tracking-wide mb-1.5";
const fileInputCls =
  "w-full text-[12.5px] text-body rounded-xl border border-line bg-white px-3 py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-ivory file:text-ink file:text-[12px] file:font-semibold file:cursor-pointer cursor-pointer";

function PillSelect({ options, value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value || "all"}
          type="button"
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              : "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white"
          }
        >
          {t(`admin.media.documents.category.${opt.value || "all"}`, opt.label)}
        </button>
      ))}
    </div>
  );
}

const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function DocumentsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async (p, category) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (category) params.category = category;
      const res = await axiosInstance.get("/documents", { params });
      setDocuments(res.data.documents || []);
      setPage(res.data.page || p);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast({
        title: t("admin.media.documents.toast.loadFailed", "Couldn't load documents"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(page, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryFilter]);

  const changeCategoryFilter = (value) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFile(null);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (doc) => {
    setEditingId(doc._id);
    setForm({
      title: doc.title || "",
      description: doc.description || "",
      category: doc.category || "other",
      otherCategoryLabel: doc.otherCategoryLabel || "",
      targetAudience: doc.targetAudience || "everyone",
      targetBuildings: doc.targetBuildings || [],
      targetGalas: doc.targetGalas || [],
      targetUsers: doc.targetUsers || [],
    });
    setFile(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    if (!form.title.trim()) {
      toast({ title: t("admin.media.documents.toast.titleRequired", "Title is required"), variant: "destructive" });
      return;
    }
    if (!editingId && !file) {
      toast({ title: t("admin.media.documents.toast.fileRequired", "A file is required"), variant: "destructive" });
      return;
    }
    if (form.category === "other" && !form.otherCategoryLabel.trim()) {
      toast({ title: t("admin.media.documents.toast.otherLabelRequired", "A label is required when category is Other"), variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());
      fd.append("category", form.category);
      if (form.category === "other") fd.append("otherCategoryLabel", form.otherCategoryLabel.trim());
      fd.append("targetAudience", form.targetAudience);
      fd.append("targetBuildings", JSON.stringify(form.targetBuildings));
      fd.append("targetGalas", JSON.stringify(form.targetGalas));
      fd.append("targetUsers", JSON.stringify(form.targetUsers.map((u) => u._id)));
      if (file) fd.append("file", file);

      if (editingId) {
        await axiosInstance.put(`/documents/${editingId}`, fd);
        toast({ title: t("admin.media.documents.toast.saved", "Document saved") });
      } else {
        await axiosInstance.post("/documents", fd);
        toast({ title: t("admin.media.documents.toast.uploaded", "Document uploaded") });
      }
      setFormOpen(false);
      resetForm();
      if (page === 1) fetchDocuments(1, categoryFilter);
      else setPage(1);
    } catch (err) {
      toast({
        title: editingId
          ? t("admin.media.documents.toast.saveFailed", "Couldn't save document")
          : t("admin.media.documents.toast.uploadFailed", "Couldn't upload document"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/documents/${deleteTarget._id}`);
      toast({ title: t("admin.media.documents.toast.deleted", "Document deleted") });
      setDeleteTarget(null);
      if (documents.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchDocuments(page, categoryFilter);
    } catch (err) {
      toast({
        title: t("admin.media.documents.toast.deleteFailed", "Couldn't delete document"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("admin.media.documents.title", "Documents")}
        description={t(
          "admin.media.documents.description",
          "Bylaws, minutes, circulars, and other files shared with members."
        )}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("admin.media.documents.uploadButton", "Upload document")}
          </button>
        }
      />

      <div className="mb-4">
        <PillSelect options={FILTER_OPTIONS} value={categoryFilter} onChange={changeCategoryFilter} />
      </div>

      <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        )}

        {!loading && documents.length === 0 && (
          <EmptyState
            icon={FileText}
            title={t("admin.media.documents.emptyState.title", "No documents yet")}
            description={
              categoryFilter
                ? t(
                    "admin.media.documents.emptyState.descriptionFiltered",
                    "No documents in this category yet. Try a different filter or upload a new one."
                  )
                : t(
                    "admin.media.documents.emptyState.descriptionDefault",
                    "Upload your first document to share it with members."
                  )
            }
            action={
              <button
                type="button"
                onClick={openCreate}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.media.documents.emptyState.uploadButton", "+ Upload document")}
              </button>
            }
          />
        )}

        {!loading && documents.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.media.documents.table.title", "Title")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.media.documents.table.category", "Category")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.media.documents.table.uploadedBy", "Uploaded by")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.media.documents.table.date", "Date")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70 text-right">
                      {t("admin.media.documents.table.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc._id} className="border-b border-line last:border-0">
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="font-semibold text-ink text-[13px] truncate">{doc.title}</div>
                        {doc.description && (
                          <div className="text-[11.5px] text-body truncate mt-0.5">{doc.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={doc.category} label={doc.category === "other" ? doc.otherCategoryLabel : undefined} />
                      </td>
                      <td className="py-3 px-4 text-[12.5px] text-body whitespace-nowrap">
                        {doc.uploadedBy ? getDisplayName(doc.uploadedBy, nicknames) : "—"}
                      </td>
                      <td className="py-3 px-4 text-[12.5px] text-body whitespace-nowrap">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t("admin.media.documents.downloadAriaLabel", "Download")}
                            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                          >
                            <Download className="h-3.5 w-3.5 text-body" />
                          </a>
                          <button
                            type="button"
                            onClick={() => openEdit(doc)}
                            aria-label={t("admin.media.documents.editAriaLabel", "Edit")}
                            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                          >
                            <Pencil className="h-3.5 w-3.5 text-body" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            aria-label={t("admin.media.documents.deleteAriaLabel", "Delete")}
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
              {documents.map((doc) => (
                <div key={doc._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-ink text-[13.5px] line-clamp-2 flex-1">{doc.title}</div>
                    <StatusPill status={doc.category} label={doc.category === "other" ? doc.otherCategoryLabel : undefined} className="flex-none" />
                  </div>
                  {doc.description && (
                    <div className="text-[11.5px] text-body line-clamp-2 mb-1.5">{doc.description}</div>
                  )}
                  <div className="text-[11px] text-body mb-3">
                    {doc.uploadedBy ? getDisplayName(doc.uploadedBy, nicknames) : "—"} &middot; {formatDate(doc.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center justify-center gap-1"
                    >
                      <Download className="h-3 w-3" /> {t("admin.media.documents.downloadButton", "Download")}
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(doc)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center justify-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> {t("admin.media.documents.editButton", "Edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(doc)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-alarm inline-flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> {t("admin.media.documents.deleteButton", "Delete")}
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

      {/* Upload/edit document dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(v) => {
          if (uploading) return;
          setFormOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {editingId
                ? t("admin.media.documents.form.editDialogTitle", "Edit document")
                : t("admin.media.documents.form.dialogTitle", "Upload document")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {editingId
                ? t("admin.media.documents.form.editDialogDescription", "Update this document's details, targeting, or replace the file.")
                : t("admin.media.documents.form.dialogDescription", "PDF, Word, or Excel files up to 20MB, shared with members.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>{t("admin.media.documents.form.titleLabel", "Title")}</label>
              <input
                required
                maxLength={150}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("admin.media.documents.form.titlePlaceholder", "e.g. Society bylaws 2026")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.documents.form.descriptionLabel", "Description")}</label>
              <textarea
                maxLength={1000}
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t(
                  "admin.media.documents.form.descriptionPlaceholder",
                  "Optional — what this document contains…"
                )}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors resize-y"
              />
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.documents.form.categoryLabel", "Category")}</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputCls}
              >
                {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(`admin.media.documents.category.${opt.value}`, opt.label)}
                  </option>
                ))}
              </select>
            </div>
            {form.category === "other" && (
              <div>
                <label className={labelCls}>{t("admin.media.documents.form.otherLabelLabel", "Label for \"Other\"")}</label>
                <input
                  required
                  maxLength={100}
                  value={form.otherCategoryLabel}
                  onChange={(e) => setForm((f) => ({ ...f, otherCategoryLabel: e.target.value }))}
                  placeholder={t("admin.media.documents.form.otherLabelPlaceholder", "e.g. AGM notes")}
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className={labelCls}>
                {t("admin.media.documents.form.fileLabel", "File")} {editingId ? `(${t("admin.media.documents.form.fileOptionalHint", "optional — leave empty to keep the current file")})` : ""}
              </label>
              <input
                required={!editingId}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className={fileInputCls}
              />
              {file && <p className="text-[11px] text-body mt-1 truncate">{file.name}</p>}
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.documents.form.targetingLabel", "Targeting")}</label>
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
            <DialogFooter>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={uploading}
                className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink disabled:opacity-60"
              >
                {t("admin.media.documents.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {uploading
                  ? t("admin.media.documents.form.savingButton", "Saving…")
                  : editingId
                  ? t("admin.media.documents.form.saveChangesButton", "Save changes")
                  : t("admin.media.documents.form.submitButton", "Upload document")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("admin.media.documents.confirm.deleteTitle", "Delete this document?")}
        description={
          deleteTarget
            ? `"${deleteTarget.title}" ${t(
                "admin.media.documents.confirm.deleteDescriptionSuffix",
                "will be removed permanently. This can't be undone."
              )}`
            : ""
        }
        confirmLabel={t("admin.media.documents.confirm.deleteConfirmLabel", "Delete document")}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

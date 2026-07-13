"use client";
import { useEffect, useState } from "react";
import { Image as ImageIcon, Video, Trash2, X, Pencil, Plus } from "lucide-react";
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
import Pagination from "@/components/app/pagination";
import ConfirmDialog from "@/components/app/confirm-dialog";
import ChipInput from "@/components/app/chip-input";
import { LocalizedInput, LocalizedTextarea, ContentLanguageTabs } from "@/components/app/localized-fields";
import { emptyLocalized, pickLang } from "@/utils/localizedContent";
import { useToast } from "@/hooks/use-toast";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";

const LIMIT = 12;

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13.5px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors";
const fileInputCls =
  "w-full text-[12.5px] text-body rounded-xl border border-line bg-white px-3 py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-ivory file:text-ink file:text-[12px] file:font-semibold file:cursor-pointer cursor-pointer";
const labelCls = "block text-[12px] font-semibold text-ink mb-1.5";

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function AlbumThumb({ album }) {
  const first = album.items && album.items[0];
  if (first && first.type === "image") {
    return <img src={first.url} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="h-full w-full flex items-center justify-center bg-ivory">
      {first && first.type === "video" ? (
        <Video className="h-7 w-7 text-body" strokeWidth={1.75} />
      ) : (
        <ImageIcon className="h-7 w-7 text-body" strokeWidth={1.75} />
      )}
    </div>
  );
}

// Per-staged-file preview + caption input, shared by the create-album dialog
// and the "Add photos" flow in the album detail dialog.
function StagedMediaGrid({ items, onCaptionChange, onRemove, captionPlaceholder }) {
  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((m, i) => (
        <div key={i} className="rounded-xl border border-line overflow-hidden bg-white">
          <div className="aspect-square bg-ivory relative">
            {m.file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={URL.createObjectURL(m.file)} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={URL.createObjectURL(m.file)} className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <input
            value={m.caption}
            onChange={(e) => onCaptionChange(i, e.target.value)}
            placeholder={captionPlaceholder}
            className="w-full text-[11px] px-2 py-1.5 border-t border-line outline-none focus:border-madder"
          />
        </div>
      ))}
    </div>
  );
}

function AlbumCard({ album, onOpen, onDelete }) {
  const { t } = useI18n();
  const itemCount = album.items?.length || 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(album)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(album);
        }
      }}
      className="app-glass glass-shadow rounded-2xl overflow-hidden hover-lift cursor-pointer"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-ivory relative">
        <AlbumThumb album={album} />
        <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink/70 text-white">
          {itemCount} {itemCount === 1 ? t("admin.media.gallery.itemCountSingular", "item") : t("admin.media.gallery.itemCountPlural", "items")}
        </span>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display font-bold text-ink text-[14px] truncate">{pickLang(album.title, "en")}</div>
            <div className="text-[11.5px] text-body mt-0.5">{fmtDate(album.eventDate)}</div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(album);
            }}
            aria-label={`${t("admin.media.gallery.deleteAlbumAriaLabel", "Delete")} ${pickLang(album.title, "en")}`}
            className="h-7 w-7 rounded-full border border-line bg-white flex items-center justify-center flex-none text-body hover:text-alarm"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {album.category && (
          <div className="mt-2 inline-flex text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-ivory text-body">
            {album.category}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: emptyLocalized(), description: emptyLocalized(), eventDate: "", category: "", keywords: [] });
  const [formLang, setFormLang] = useState("en");
  const [mediaFiles, setMediaFiles] = useState([]); // {file, caption}[] — caption is English-only at creation
  const [creating, setCreating] = useState(false);

  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [captionLang, setCaptionLang] = useState("en");
  const [savingItemId, setSavingItemId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailForm, setDetailForm] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const [newPhotos, setNewPhotos] = useState([]); // {file, caption}[] staged to append to an existing album
  const [addingPhotos, setAddingPhotos] = useState(false);

  const [albumToDelete, setAlbumToDelete] = useState(null);
  const [deletingAlbum, setDeletingAlbum] = useState(false);

  const fetchAlbums = async (p) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/gallery", { params: { page: p, limit: LIMIT } });
      setAlbums(res.data.albums || []);
      setPage(res.data.page || p);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.loadAlbumsFailed", "Failed to load albums")), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const resetForm = () => {
    setForm({ title: emptyLocalized(), description: emptyLocalized(), eventDate: "", category: "", keywords: [] });
    setFormLang("en");
    setMediaFiles([]);
  };

  const handleMediaSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(files.map((file) => ({ file, caption: "" })));
  };
  const updateStagedCaption = (index, caption) => {
    setMediaFiles((prev) => prev.map((m, i) => (i === index ? { ...m, caption } : m)));
  };
  const removeStagedMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.en.trim() || !form.eventDate) {
      toast({ title: t("admin.media.gallery.toast.titleDateRequired", "Title (English) and event date are required"), variant: "destructive" });
      return;
    }
    if (mediaFiles.length > 20) {
      toast({ title: t("admin.media.gallery.toast.maxFilesAllowed", "Maximum 20 files allowed"), variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("title", JSON.stringify(form.title));
      fd.append("description", JSON.stringify(form.description));
      fd.append("eventDate", form.eventDate);
      if (form.category.trim()) fd.append("category", form.category.trim());
      fd.append("keywords", JSON.stringify(form.keywords));
      const captions = {};
      mediaFiles.forEach((m, i) => {
        if (m.caption.trim()) captions[i] = { en: m.caption.trim(), hi: "", mr: "" };
      });
      if (Object.keys(captions).length) fd.append("captions", JSON.stringify(captions));
      mediaFiles.forEach((m) => fd.append("media", m.file));
      await axiosInstance.post("/gallery", fd);
      toast({ title: t("admin.media.gallery.toast.albumCreated", "Album created") });
      setCreateOpen(false);
      resetForm();
      fetchAlbums(1);
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.createAlbumFailed", "Failed to create album")), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openAlbumDetail = (album) => {
    setSelectedAlbum(album);
    setEditingDetails(false);
    setDetailForm(null);
    setNewPhotos([]);
  };

  const startEditDetails = () => {
    setDetailForm({
      title: selectedAlbum.title || emptyLocalized(),
      description: selectedAlbum.description || emptyLocalized(),
      eventDate: selectedAlbum.eventDate ? selectedAlbum.eventDate.slice(0, 10) : "",
      category: selectedAlbum.category || "",
      keywords: selectedAlbum.keywords || [],
    });
    setEditingDetails(true);
  };

  const saveDetails = async () => {
    if (!detailForm.title.en.trim() || !detailForm.eventDate) {
      toast({ title: t("admin.media.gallery.toast.titleDateRequired", "Title (English) and event date are required"), variant: "destructive" });
      return;
    }
    setSavingDetails(true);
    try {
      const res = await axiosInstance.put(`/gallery/${selectedAlbum._id}`, {
        title: detailForm.title,
        description: detailForm.description,
        eventDate: detailForm.eventDate,
        category: detailForm.category.trim(),
        keywords: detailForm.keywords,
      });
      setSelectedAlbum(res.data);
      setAlbums((prev) => prev.map((a) => (a._id === res.data._id ? res.data : a)));
      toast({ title: t("admin.media.gallery.toast.detailsSaved", "Album details saved") });
      setEditingDetails(false);
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.saveDetailsFailed", "Failed to save album details")), variant: "destructive" });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleNewPhotosSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setNewPhotos(files.map((file) => ({ file, caption: "" })));
  };
  const updateNewPhotoCaption = (index, caption) => {
    setNewPhotos((prev) => prev.map((m, i) => (i === index ? { ...m, caption } : m)));
  };
  const removeNewPhoto = (index) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submitNewPhotos = async () => {
    if (!newPhotos.length || !selectedAlbum) return;
    setAddingPhotos(true);
    try {
      const fd = new FormData();
      const baseIndex = selectedAlbum.items.length;
      const captions = {};
      newPhotos.forEach((m, i) => {
        if (m.caption.trim()) captions[baseIndex + i] = { en: m.caption.trim(), hi: "", mr: "" };
      });
      if (Object.keys(captions).length) fd.append("captions", JSON.stringify(captions));
      newPhotos.forEach((m) => fd.append("media", m.file));
      const res = await axiosInstance.put(`/gallery/${selectedAlbum._id}`, fd);
      setSelectedAlbum(res.data);
      setAlbums((prev) => prev.map((a) => (a._id === res.data._id ? res.data : a)));
      toast({ title: t("admin.media.gallery.toast.photosAdded", "Photos added") });
      setNewPhotos([]);
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.addPhotosFailed", "Failed to add photos")), variant: "destructive" });
    } finally {
      setAddingPhotos(false);
    }
  };

  const saveCaption = async (item, value) => {
    if (!selectedAlbum) return;
    const currentCaption = item.caption || emptyLocalized();
    if (value === (currentCaption[captionLang] || "")) return;
    const idx = selectedAlbum.items.findIndex((i) => i._id === item._id);
    if (idx === -1) return;
    setSavingItemId(item._id);
    try {
      const nextCaption = { ...currentCaption, [captionLang]: value };
      const res = await axiosInstance.put(`/gallery/${selectedAlbum._id}`, { captions: { [idx]: nextCaption } });
      setSelectedAlbum(res.data);
      setAlbums((prev) => prev.map((a) => (a._id === res.data._id ? res.data : a)));
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.saveCaptionFailed", "Failed to save caption")), variant: "destructive" });
    } finally {
      setSavingItemId(null);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !selectedAlbum) return;
    setDeletingItem(true);
    try {
      const res = await axiosInstance.delete(`/gallery/${selectedAlbum._id}/items/${itemToDelete._id}`);
      setSelectedAlbum(res.data);
      setAlbums((prev) => prev.map((a) => (a._id === res.data._id ? res.data : a)));
      toast({ title: t("admin.media.gallery.toast.itemRemoved", "Item removed") });
      setItemToDelete(null);
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.removeItemFailed", "Failed to remove item")), variant: "destructive" });
    } finally {
      setDeletingItem(false);
    }
  };

  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    setDeletingAlbum(true);
    try {
      await axiosInstance.delete(`/gallery/${albumToDelete._id}`);
      toast({ title: t("admin.media.gallery.toast.albumDeleted", "Album deleted") });
      const wasLastOnPage = albums.length === 1 && page > 1;
      if (selectedAlbum?._id === albumToDelete._id) setSelectedAlbum(null);
      setAlbumToDelete(null);
      if (wasLastOnPage) {
        setPage((p) => p - 1);
      } else {
        fetchAlbums(page);
      }
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.media.gallery.toast.deleteAlbumFailed", "Failed to delete album")), variant: "destructive" });
    } finally {
      setDeletingAlbum(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("admin.media.gallery.title", "Gallery")}
        description={t("admin.media.gallery.description", "Event albums shared with members.")}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
          >
            {t("admin.media.gallery.newAlbumButton", "+ New album")}
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="app-glass glass-shadow rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-ivory" />
              <div className="p-3.5 space-y-2">
                <div className="h-3.5 w-2/3 bg-ivory rounded" />
                <div className="h-3 w-1/3 bg-ivory rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={ImageIcon}
            title={t("admin.media.gallery.emptyState.title", "No albums yet")}
            description={t(
              "admin.media.gallery.emptyState.description",
              "Create your first album to start sharing event photos and videos with members."
            )}
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.media.gallery.newAlbumButton", "+ New album")}
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((album) => (
              <AlbumCard key={album._id} album={album} onOpen={openAlbumDetail} onDelete={setAlbumToDelete} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </>
      )}

      {/* Create album dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="bg-white border-line rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.media.gallery.form.dialogTitle", "New album")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t("admin.media.gallery.form.dialogDescription", "Add event photos or videos — up to 20 files.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={labelCls}>{t("shared.forms.contentLanguageLabel", "Content language")}</label>
              <ContentLanguageTabs lang={formLang} onChange={setFormLang} completenessValue={{ title: form.title, description: form.description }} />
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.gallery.form.titleLabel", "Title")}</label>
              <LocalizedInput
                required={formLang === "en"}
                value={form.title}
                lang={formLang}
                onChange={(title) => setForm((f) => ({ ...f, title }))}
                placeholder={t("admin.media.gallery.form.titlePlaceholder", "e.g. Annual General Meeting 2026")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.gallery.form.descriptionLabel", "Description")}</label>
              <LocalizedTextarea
                value={form.description}
                lang={formLang}
                onChange={(description) => setForm((f) => ({ ...f, description }))}
                placeholder={t("admin.media.gallery.form.descriptionPlaceholder", "A short line about this album…")}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("admin.media.gallery.form.eventDateLabel", "Event date")}</label>
                <input
                  required
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("admin.media.gallery.form.categoryLabel", "Category")}</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder={t("admin.media.gallery.form.categoryPlaceholder", "e.g. Workshop")}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.gallery.form.keywordsLabel", "Keywords")}</label>
              <ChipInput value={form.keywords} onChange={(kw) => setForm((f) => ({ ...f, keywords: kw }))} />
            </div>
            <div>
              <label className={labelCls}>{t("admin.media.gallery.form.mediaLabel", "Photos / videos")}</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaSelected}
                className={fileInputCls}
              />
              <p className={`text-[11px] mt-1 ${mediaFiles.length > 20 ? "text-alarm font-semibold" : "text-body"}`}>
                {mediaFiles.length} {t("admin.media.gallery.form.selectedLabel", "selected")}
                {mediaFiles.length > 20 ? ` ${t("admin.media.gallery.form.maxFilesWarning", "— maximum 20 files")}` : ""}
              </p>
              {mediaFiles.length > 0 && (
                <StagedMediaGrid
                  items={mediaFiles}
                  onCaptionChange={updateStagedCaption}
                  onRemove={removeStagedMedia}
                  captionPlaceholder={t("admin.media.gallery.form.captionPlaceholder", "Caption (English)…")}
                />
              )}
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink"
              >
                {t("admin.media.gallery.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={creating || mediaFiles.length > 20}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {creating
                  ? t("admin.media.gallery.form.creatingButton", "Creating…")
                  : t("admin.media.gallery.form.createButton", "Create album")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Album detail dialog */}
      <Dialog
        open={!!selectedAlbum}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedAlbum(null);
            setEditingDetails(false);
            setDetailForm(null);
            setNewPhotos([]);
          }
        }}
      >
        <DialogContent className="bg-white border-line rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          {!editingDetails ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="font-display text-ink">{pickLang(selectedAlbum?.title, "en")}</DialogTitle>
                    <DialogDescription className="text-body">
                      {selectedAlbum ? fmtDate(selectedAlbum.eventDate) : ""}
                      {selectedAlbum?.category ? ` · ${selectedAlbum.category}` : ""}
                    </DialogDescription>
                  </div>
                  <button
                    type="button"
                    onClick={startEditDetails}
                    className="h-8 px-3 rounded-full border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center gap-1 flex-none"
                  >
                    <Pencil className="h-3 w-3" /> {t("admin.media.gallery.detail.editDetailsButton", "Edit details")}
                  </button>
                </div>
              </DialogHeader>

              {selectedAlbum?.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAlbum.keywords.map((kw) => (
                    <span key={kw} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#E5E3FB] text-[#4338CA]">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-ink">{t("admin.media.gallery.detail.editDetailsHeading", "Edit album details")}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between">
                <label className={labelCls}>{t("shared.forms.contentLanguageLabel", "Content language")}</label>
                <ContentLanguageTabs lang={captionLang} onChange={setCaptionLang} completenessValue={{ title: detailForm.title, description: detailForm.description }} />
              </div>
              <div>
                <label className={labelCls}>{t("admin.media.gallery.form.titleLabel", "Title")}</label>
                <LocalizedInput
                  required={captionLang === "en"}
                  value={detailForm.title}
                  lang={captionLang}
                  onChange={(title) => setDetailForm((f) => ({ ...f, title }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("admin.media.gallery.form.descriptionLabel", "Description")}</label>
                <LocalizedTextarea value={detailForm.description} lang={captionLang} onChange={(description) => setDetailForm((f) => ({ ...f, description }))} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("admin.media.gallery.form.eventDateLabel", "Event date")}</label>
                  <input
                    required
                    type="date"
                    value={detailForm.eventDate}
                    onChange={(e) => setDetailForm((f) => ({ ...f, eventDate: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("admin.media.gallery.form.categoryLabel", "Category")}</label>
                  <input
                    value={detailForm.category}
                    onChange={(e) => setDetailForm((f) => ({ ...f, category: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("admin.media.gallery.form.keywordsLabel", "Keywords")}</label>
                <ChipInput value={detailForm.keywords} onChange={(kw) => setDetailForm((f) => ({ ...f, keywords: kw }))} />
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setEditingDetails(false)}
                  disabled={savingDetails}
                  className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink disabled:opacity-60"
                >
                  {t("admin.media.gallery.form.cancelButton", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={saveDetails}
                  disabled={savingDetails}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                >
                  {savingDetails ? t("admin.media.gallery.form.savingButton", "Saving…") : t("admin.media.gallery.form.saveChangesButton", "Save changes")}
                </button>
              </DialogFooter>
            </>
          )}

          {!editingDetails && (
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70">
                {t("admin.media.gallery.detail.captionLanguageLabel", "Caption language")}
              </label>
              <ContentLanguageTabs lang={captionLang} onChange={setCaptionLang} />
            </div>
          )}

          {!editingDetails && (
            <>
              {selectedAlbum?.items?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedAlbum.items.map((item) => (
                    <div key={item._id} className="rounded-xl border border-line overflow-hidden bg-white">
                      <div className="aspect-square bg-ivory">
                        {item.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <video src={item.url} controls className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="p-2 space-y-1.5">
                        <input
                          key={`${item._id}-${captionLang}`}
                          defaultValue={item.caption?.[captionLang] || ""}
                          placeholder={t("admin.media.gallery.detail.captionPlaceholder", "Add a caption…")}
                          disabled={savingItemId === item._id}
                          onBlur={(e) => saveCaption(item, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          className="w-full text-[11.5px] px-2 py-1.5 rounded-lg border border-line bg-white outline-none focus:border-madder disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="w-full h-7 rounded-lg text-[11px] font-semibold text-alarm border border-line bg-white flex items-center justify-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> {t("admin.media.gallery.detail.removeButton", "Remove")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-body text-center py-6">
                  {t("admin.media.gallery.detail.emptyItems", "No photos or videos in this album yet.")}
                </p>
              )}

              <div className="border-t border-line pt-4">
                <label className={labelCls}>{t("admin.media.gallery.detail.addPhotosLabel", "Add photos")}</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleNewPhotosSelected}
                  className={fileInputCls}
                />
                {newPhotos.length > 0 && (
                  <>
                    <StagedMediaGrid
                      items={newPhotos}
                      onCaptionChange={updateNewPhotoCaption}
                      onRemove={removeNewPhoto}
                      captionPlaceholder={t("admin.media.gallery.form.captionPlaceholder", "Caption (English)…")}
                    />
                    <button
                      type="button"
                      onClick={submitNewPhotos}
                      disabled={addingPhotos}
                      className="mt-3 h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addingPhotos
                        ? t("admin.media.gallery.detail.addingPhotosButton", "Adding…")
                        : t("admin.media.gallery.detail.addPhotosButton", `Add ${newPhotos.length} photo${newPhotos.length === 1 ? "" : "s"}`)}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!albumToDelete}
        onOpenChange={(v) => !v && setAlbumToDelete(null)}
        title={t("admin.media.gallery.confirm.deleteAlbumTitle", "Delete album?")}
        description={
          albumToDelete
            ? `"${pickLang(albumToDelete.title, "en")}" ${t("admin.media.gallery.confirm.deleteAlbumAndAll", "and all")} ${
                albumToDelete.items?.length || 0
              } ${t("admin.media.gallery.confirm.deleteAlbumItemsSuffix", "items will be permanently removed.")}`
            : ""
        }
        confirmLabel={t("admin.media.gallery.confirm.deleteAlbumConfirmLabel", "Delete album")}
        loading={deletingAlbum}
        onConfirm={confirmDeleteAlbum}
      />

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(v) => !v && setItemToDelete(null)}
        title={t("admin.media.gallery.confirm.removeItemTitle", "Remove this item?")}
        description={t(
          "admin.media.gallery.confirm.removeItemDescription",
          "This photo or video will be permanently removed from the album."
        )}
        confirmLabel={t("admin.media.gallery.confirm.removeItemConfirmLabel", "Remove")}
        loading={deletingItem}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
}

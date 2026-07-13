"use client";
import { useCallback, useEffect, useState } from "react";
import { Phone, Star } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import StatusPill from "@/components/app/status-pill";
import ConfirmDialog from "@/components/app/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LocalizedInput, ContentLanguageTabs } from "@/components/app/localized-fields";
import { emptyLocalized, pickLang } from "@/utils/localizedContent";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

const CATEGORIES = ["Emergency", "Park", "Service Provider", "Other"];
const EMPTY_FORM = { name: emptyLocalized(), number: "", category: "Emergency", note: emptyLocalized(), hours: emptyLocalized(), available247: false };

export default function EmergencyPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  const categoryLabel = (category) => {
    if (category === "Emergency") return t("admin.system.emergency.categories.emergency", "Emergency");
    if (category === "Park") return t("admin.system.emergency.categories.park", "Park");
    if (category === "Service Provider") return t("admin.system.emergency.categories.serviceProvider", "Service Provider");
    return t("admin.system.emergency.categories.other", "Other");
  };

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createLang, setCreateLang] = useState("en");
  const [createSaving, setCreateSaving] = useState(false);

  // ONE piece of state holds the id of the row being edited — never a shared
  // boolean, so opening edit on one row can never open every row's editor.
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLang, setEditLang] = useState("en");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Same pattern for the ratings panel — one expanded id, not a boolean.
  const [expandedRatingsId, setExpandedRatingsId] = useState(null);
  const [ratingsById, setRatingsById] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/emergency")
      .then((res) => setContacts(res.data || []))
      .catch((err) => {
        toast({
          title: t("admin.system.emergency.toast.loadErrorTitle", "Couldn't load contacts"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitCreate = (e) => {
    e.preventDefault();
    if (createSaving) return;
    setCreateSaving(true);
    axiosInstance
      .post("/emergency", createForm)
      .then((res) => {
        setContacts((prev) => [...prev, res.data]);
        setCreateOpen(false);
        setCreateForm(EMPTY_FORM);
        setCreateLang("en");
        toast({ title: t("admin.system.emergency.toast.addedTitle", "Contact added") });
      })
      .catch((err) => {
        toast({
          title: t("admin.system.emergency.toast.addErrorTitle", "Couldn't add contact"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setCreateSaving(false));
  };

  const startEdit = (contact) => {
    setEditingId(contact._id);
    setEditForm({
      name: contact.name || emptyLocalized(),
      number: contact.number,
      category: contact.category,
      note: contact.note || emptyLocalized(),
      hours: contact.hours || emptyLocalized(),
      available247: contact.available247 || false,
    });
    setEditLang("en");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (id) => {
    setEditSaving(true);
    axiosInstance
      .put(`/emergency/${id}`, editForm)
      .then((res) => {
        setContacts((prev) => prev.map((c) => (c._id === id ? res.data : c)));
        setEditingId(null);
        toast({ title: t("admin.system.emergency.toast.updatedTitle", "Contact updated") });
      })
      .catch((err) => {
        toast({
          title: t("admin.system.emergency.toast.updateErrorTitle", "Couldn't update contact"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setEditSaving(false));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    axiosInstance
      .delete(`/emergency/${deleteTarget._id}`)
      .then(() => {
        setContacts((prev) => prev.filter((c) => c._id !== deleteTarget._id));
        toast({ title: t("admin.system.emergency.toast.removedTitle", "Contact removed") });
        setDeleteTarget(null);
      })
      .catch((err) => {
        toast({
          title: t("admin.system.emergency.toast.deleteErrorTitle", "Couldn't delete contact"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDeleteSaving(false));
  };

  const toggleRatings = (contact) => {
    if (expandedRatingsId === contact._id) {
      setExpandedRatingsId(null);
      return;
    }
    setExpandedRatingsId(contact._id);
    if (ratingsById[contact._id]) return;
    setRatingsById((prev) => ({
      ...prev,
      [contact._id]: { loading: true, ratings: [], average: null, count: 0 },
    }));
    axiosInstance
      .get(`/emergency/${contact._id}/ratings`)
      .then((res) => {
        setRatingsById((prev) => ({ ...prev, [contact._id]: { loading: false, ...res.data } }));
      })
      .catch((err) => {
        toast({
          title: t("admin.system.emergency.toast.ratingsLoadErrorTitle", "Couldn't load ratings"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
        setRatingsById((prev) => ({
          ...prev,
          [contact._id]: { loading: false, ratings: [], average: null, count: 0 },
        }));
      });
  };

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: contacts.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader
        title={t("admin.system.emergency.header.title", "Emergency & ratings")}
        description={t(
          "admin.system.emergency.header.description",
          "Emergency numbers and service providers visible to members."
        )}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
          >
            {t("admin.system.emergency.header.addButton", "+ Add contact")}
          </button>
        }
      />

      {loading && (
        <div className="app-glass glass-shadow rounded-2xl p-10 text-center text-sm text-body">
          {t("admin.system.emergency.loading", "Loading contacts…")}
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={Phone}
            title={t("admin.system.emergency.emptyState.title", "No emergency contacts yet")}
            description={t(
              "admin.system.emergency.emptyState.description",
              "Add the first emergency number or service provider members can call."
            )}
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.system.emergency.header.addButton", "+ Add contact")}
              </button>
            }
          />
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.category}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-body/70 mb-2 px-1">
                {categoryLabel(group.category)}
              </div>
              <div className="app-glass glass-shadow rounded-2xl divide-y divide-line overflow-hidden">
                {group.items.map((contact) => {
                  const isEditing = editingId === contact._id;
                  const isRatingsOpen = expandedRatingsId === contact._id;
                  const ratingsState = ratingsById[contact._id];

                  return (
                    <div key={contact._id} className="p-4">
                      {!isEditing && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-bold text-ink text-[13.5px] truncate max-w-[220px] sm:max-w-none">
                                {pickLang(contact.name, "en")}
                              </span>
                              <StatusPill status={contact.category} label={contact.category} />
                            </div>
                            <a
                              href={`tel:${contact.number}`}
                              className="text-[12.5px] text-madder font-semibold underline underline-offset-2 mt-0.5 inline-block"
                            >
                              {contact.number}
                            </a>
                            {(pickLang(contact.hours, "en") || contact.available247) && (
                              <div className="text-[11px] text-body mt-0.5">
                                {contact.available247
                                  ? t("admin.system.emergency.available247", "Available 24/7")
                                  : pickLang(contact.hours, "en")}
                              </div>
                            )}
                            {pickLang(contact.note, "en") && (
                              <div className="text-[11px] text-body/80 mt-0.5">{pickLang(contact.note, "en")}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-none flex-wrap">
                            {contact.category === "Service Provider" && (
                              <button
                                type="button"
                                onClick={() => toggleRatings(contact)}
                                className="h-8 px-3 rounded-full text-[11.5px] font-bold text-ink border border-line bg-white whitespace-nowrap"
                              >
                                {isRatingsOpen
                                  ? t("admin.system.emergency.actions.hideRatings", "Hide ratings")
                                  : t("admin.system.emergency.actions.viewRatings", "View ratings")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(contact)}
                              className="h-8 px-3 rounded-full text-[11.5px] font-bold text-ink border border-line bg-white"
                            >
                              {t("admin.system.emergency.actions.edit", "Edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(contact)}
                              className="h-8 px-3 rounded-full text-[11.5px] font-bold text-white bg-alarm"
                            >
                              {t("admin.system.emergency.actions.delete", "Delete")}
                            </button>
                          </div>
                        </div>
                      )}

                      {isEditing && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wide text-body/70">
                              {t("shared.forms.contentLanguageLabel", "Content language")}
                            </label>
                            <ContentLanguageTabs
                              lang={editLang}
                              onChange={setEditLang}
                              completenessValue={{ name: editForm.name, note: editForm.note, hours: editForm.hours }}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                                {t("admin.system.emergency.editForm.nameLabel", "Name")}
                              </label>
                              <LocalizedInput
                                value={editForm.name}
                                lang={editLang}
                                onChange={(name) => setEditForm((f) => ({ ...f, name }))}
                                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                                {t("admin.system.emergency.editForm.numberLabel", "Number")}
                              </label>
                              <input
                                value={editForm.number}
                                onChange={(e) => setEditForm((f) => ({ ...f, number: e.target.value }))}
                                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                                {t("admin.system.emergency.editForm.categoryLabel", "Category")}
                              </label>
                              <select
                                value={editForm.category}
                                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {categoryLabel(c)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                                {t("admin.system.emergency.editForm.hoursLabel", "Hours")}
                              </label>
                              <LocalizedInput
                                value={editForm.hours}
                                lang={editLang}
                                onChange={(hours) => setEditForm((f) => ({ ...f, hours }))}
                                placeholder={t("admin.system.emergency.editForm.hoursPlaceholder", "e.g. 9am – 6pm")}
                                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                                {t("admin.system.emergency.editForm.noteLabel", "Note")}
                              </label>
                              <LocalizedInput
                                value={editForm.note}
                                lang={editLang}
                                onChange={(note) => setEditForm((f) => ({ ...f, note }))}
                                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
                              />
                            </div>
                            <label className="flex items-center gap-2 mt-6">
                              <input
                                type="checkbox"
                                checked={editForm.available247}
                                onChange={(e) => setEditForm((f) => ({ ...f, available247: e.target.checked }))}
                                className="h-4 w-4 rounded border-line"
                              />
                              <span className="text-[12.5px] text-ink">{t("admin.system.emergency.editForm.available247Label", "Available 24/7")}</span>
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="h-8 px-3.5 rounded-full text-[12px] font-bold text-ink border border-line bg-white"
                            >
                              {t("admin.system.emergency.editForm.cancelButton", "Cancel")}
                            </button>
                            <button
                              type="button"
                              disabled={editSaving}
                              onClick={() => saveEdit(contact._id)}
                              className="h-8 px-3.5 rounded-full text-[12px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                            >
                              {editSaving
                                ? t("admin.system.emergency.editForm.savingButton", "Saving…")
                                : t("admin.system.emergency.editForm.saveButton", "Save")}
                            </button>
                          </div>
                        </div>
                      )}

                      {isRatingsOpen && !isEditing && (
                        <div className="mt-3 pt-3 border-t border-line">
                          <p className="text-[11px] text-body/70 mb-2">
                            {t(
                              "admin.system.emergency.ratings.internalNote",
                              "Internal only — ratings are never shown publicly, for accountability purposes."
                            )}
                          </p>
                          {ratingsState?.loading && (
                            <div className="text-xs text-body">{t("admin.system.emergency.ratings.loading", "Loading ratings…")}</div>
                          )}
                          {!ratingsState?.loading && (
                            <>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                <span className="font-display font-bold text-ink text-[13px]">
                                  {ratingsState?.average != null ? ratingsState.average.toFixed(1) : "—"}
                                </span>
                                <span className="text-[11.5px] text-body">
                                  ({ratingsState?.count || 0} {t("admin.system.emergency.ratings.countSuffix", "rating")}
                                  {ratingsState?.count === 1 ? "" : "s"})
                                </span>
                              </div>
                              {(!ratingsState?.ratings || ratingsState.ratings.length === 0) && (
                                <p className="text-[12px] text-body">{t("admin.system.emergency.ratings.none", "No ratings submitted yet.")}</p>
                              )}
                              {ratingsState?.ratings?.length > 0 && (
                                <div className="space-y-2">
                                  {ratingsState.ratings.map((r) => (
                                    <div key={r._id} className="rounded-xl bg-ivory p-2.5">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-[12.5px] font-semibold text-ink truncate">
                                          {r.member ? getDisplayName(r.member, nicknames) : t("admin.system.emergency.ratings.unknownMember", "Unknown member")}
                                        </span>
                                        <span className="text-[11.5px] font-bold text-ink flex items-center gap-1 flex-none">
                                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                          {r.rating}
                                        </span>
                                      </div>
                                      {r.comment && (
                                        <p className="text-[12px] text-body mt-1 break-words">{r.comment}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add contact */}
      <Dialog open={createOpen} onOpenChange={(o) => (!createSaving ? setCreateOpen(o) : null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.system.emergency.createDialog.title", "Add emergency contact")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t(
                "admin.system.emergency.createDialog.description",
                "Visible to every member on the public emergency numbers page."
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wide text-body/70">
                {t("shared.forms.contentLanguageLabel", "Content language")}
              </label>
              <ContentLanguageTabs
                lang={createLang}
                onChange={setCreateLang}
                completenessValue={{ name: createForm.name, note: createForm.note, hours: createForm.hours }}
              />
            </div>
            <div>
              <label htmlFor="ec-name" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.emergency.createForm.nameLabel", "Name")}
              </label>
              <LocalizedInput
                required
                maxLength={50}
                value={createForm.name}
                lang={createLang}
                onChange={(name) => setCreateForm((f) => ({ ...f, name }))}
                placeholder={t("admin.system.emergency.createForm.namePlaceholder", "e.g. Fire station")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="ec-number" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.emergency.createForm.numberLabel", "Number")}
              </label>
              <input
                id="ec-number"
                required
                value={createForm.number}
                onChange={(e) => setCreateForm((f) => ({ ...f, number: e.target.value }))}
                placeholder={t("admin.system.emergency.createForm.numberPlaceholder", "e.g. 101")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="ec-category" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.emergency.createForm.categoryLabel", "Category")}
              </label>
              <select
                id="ec-category"
                value={createForm.category}
                onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ec-hours" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.emergency.createForm.hoursLabel", "Hours")}
              </label>
              <LocalizedInput
                id="ec-hours"
                value={createForm.hours}
                lang={createLang}
                onChange={(hours) => setCreateForm((f) => ({ ...f, hours }))}
                placeholder={t("admin.system.emergency.editForm.hoursPlaceholder", "e.g. 9am – 6pm")}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <div>
              <label htmlFor="ec-note" className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1 block">
                {t("admin.system.emergency.createForm.noteLabel", "Note")}
              </label>
              <LocalizedInput
                id="ec-note"
                value={createForm.note}
                lang={createLang}
                onChange={(note) => setCreateForm((f) => ({ ...f, note }))}
                className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.available247}
                onChange={(e) => setCreateForm((f) => ({ ...f, available247: e.target.checked }))}
                className="h-4 w-4 rounded border-line"
              />
              <span className="text-[12.5px] text-ink">{t("admin.system.emergency.editForm.available247Label", "Available 24/7")}</span>
            </label>
            <DialogFooter className="pt-1">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
              >
                {t("admin.system.emergency.createForm.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
              >
                {createSaving
                  ? t("admin.system.emergency.createForm.addingButton", "Adding…")
                  : t("admin.system.emergency.createForm.addButton", "Add contact")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.system.emergency.deleteDialog.title", "Delete this contact?")}
        description={t(
          "admin.system.emergency.deleteDialog.description",
          "This permanently removes the contact and every rating submitted for it. This can't be undone."
        )}
        confirmLabel={t("admin.system.emergency.deleteDialog.confirmLabel", "Delete contact")}
        loading={deleteSaving}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

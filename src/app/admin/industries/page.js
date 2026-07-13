"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, Pencil, Trash2, Building2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import ConfirmDialog from "@/components/app/confirm-dialog";
import BusinessListingForm from "@/components/app/business-listing-form";
import { pickLang } from "@/utils/localizedContent";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

const PAGE_SIZE = 10;

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder";

function VerifiedBadge({ industry, verifying, onVerify }) {
  const { t } = useI18n();
  if (industry.verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
        {t("admin.system.industries.badge.verified", "Verified")}
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={verifying}
      onClick={() => onVerify(industry)}
      className="h-7 px-3 rounded-full text-[11.5px] font-bold text-ink border border-line bg-white disabled:opacity-60 whitespace-nowrap"
    >
      {verifying
        ? t("admin.system.industries.badge.verifying", "Verifying…")
        : t("admin.system.industries.badge.verify", "Verify")}
    </button>
  );
}

export default function DirectoryPage() {
  const { toast } = useToast();
  const { t, lang } = useI18n();
  const { nicknames } = useNicknames();

  // Filters (raw inputs, debounced into `filters`)
  const [qInput, setQInput] = useState("");
  const [buildingInput, setBuildingInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [filters, setFilters] = useState({ q: "", buildingNumber: "", businessType: "" });

  // List state
  const [industries, setIndustries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  // Edit dialog
  const [editing, setEditing] = useState(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the raw filter inputs into the actual query params.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters({ q: qInput.trim(), buildingNumber: buildingInput.trim(), businessType: typeInput.trim() });
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [qInput, buildingInput, typeInput]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: PAGE_SIZE };
    if (filters.q) params.q = filters.q;
    if (filters.buildingNumber) params.buildingNumber = filters.buildingNumber;
    if (filters.businessType) params.businessType = filters.businessType;
    axiosInstance
      .get("/industries", { params })
      .then((res) => {
        setIndustries(res.data.industries || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.system.industries.toast.loadErrorTitle", "Couldn't load the directory"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVerify = (industry) => {
    setVerifyingId(industry._id);
    axiosInstance
      .put(`/industries/${industry._id}/verify`)
      .then((res) => {
        setIndustries((prev) => prev.map((i) => (i._id === industry._id ? res.data : i)));
        toast({
          title: res.data.verified
            ? t("admin.system.industries.toast.verifiedTitle", "Marked as verified")
            : t("admin.system.industries.toast.unverifiedTitle", "Verification removed"),
        });
      })
      .catch((err) => {
        toast({
          title: t("admin.system.industries.toast.verifyErrorTitle", "Couldn't update verification"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setVerifyingId(null));
  };

  const openEdit = (industry) => setEditing(industry);
  const closeEdit = () => setEditing(null);

  const handleSaved = (saved) => {
    setIndustries((prev) => prev.map((i) => (i._id === saved._id ? saved : i)));
    toast({ title: t("admin.system.industries.toast.updatedTitle", "Listing updated") });
    closeEdit();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    axiosInstance
      .delete(`/industries/${deleteTarget._id}`)
      .then(() => {
        toast({ title: t("admin.system.industries.toast.deletedTitle", "Listing deleted") });
        setDeleteTarget(null);
        if (industries.length === 1 && page > 1) setPage((p) => p - 1);
        else load();
      })
      .catch((err) => {
        toast({
          title: t("admin.system.industries.toast.deleteErrorTitle", "Couldn't delete listing"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDeleting(false));
  };

  const hasFilters = Boolean(filters.q || filters.buildingNumber || filters.businessType);

  return (
    <div>
      <PageHeader
        title={t("admin.system.industries.header.title", "Directory")}
        description={t(
          "admin.system.industries.header.description",
          "Business listings members have created — verify and manage them here."
        )}
      />

      <div className="app-glass glass-shadow rounded-2xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-body/60" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("admin.system.industries.filters.searchPlaceholder", "Search name or description…")}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder"
          />
        </div>
        <input
          type="number"
          value={buildingInput}
          onChange={(e) => setBuildingInput(e.target.value)}
          placeholder={t("admin.system.industries.filters.buildingPlaceholder", "Building number")}
          className={inputCls}
        />
        <input
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          placeholder={t("admin.system.industries.filters.typePlaceholder", "Business type")}
          className={inputCls}
        />
      </div>

      <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        )}

        {!loading && industries.length === 0 && (
          <EmptyState
            icon={Building2}
            title={
              hasFilters
                ? t("admin.system.industries.emptyState.filteredTitle", "No listings match your filters")
                : t("admin.system.industries.emptyState.title", "No business listings yet")
            }
            description={
              hasFilters
                ? t(
                    "admin.system.industries.emptyState.filteredDescription",
                    "Try a different search term, or clear the filters above."
                  )
                : t(
                    "admin.system.industries.emptyState.description",
                    "Members can create their own business listings from the member dashboard."
                  )
            }
          />
        )}

        {!loading && industries.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.system.industries.table.business", "Business")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.system.industries.table.type", "Type")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.system.industries.table.owner", "Owner")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.system.industries.table.location", "Location")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.system.industries.table.verified", "Verified")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70 text-right">
                      {t("admin.system.industries.table.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {industries.map((industry) => (
                    <tr key={industry._id} className="border-b border-line last:border-0">
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-semibold text-ink text-[13px] truncate">{pickLang(industry.name, lang)}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <div className="text-[12.5px] text-body truncate">{pickLang(industry.businessType, lang)}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <div className="text-[12.5px] text-body truncate">{industry.owner ? getDisplayName(industry.owner, nicknames) : "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-[12.5px] text-body whitespace-nowrap">
                        {t("admin.system.industries.table.buildingPrefix", "Bldg")} {industry.buildingNumber} &middot;{" "}
                        {t("admin.system.industries.table.galaPrefix", "Gala")} {industry.galaNumber}
                      </td>
                      <td className="py-3 px-4">
                        <VerifiedBadge industry={industry} verifying={verifyingId === industry._id} onVerify={toggleVerify} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(industry)}
                            aria-label={t("admin.system.industries.table.editAriaLabel", "Edit")}
                            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                          >
                            <Pencil className="h-3.5 w-3.5 text-body" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(industry)}
                            aria-label={t("admin.system.industries.table.deleteAriaLabel", "Delete")}
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
              {industries.map((industry) => (
                <div key={industry._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-[13.5px] truncate">{pickLang(industry.name, lang)}</div>
                      <div className="text-[12px] text-body truncate">{pickLang(industry.businessType, lang)}</div>
                    </div>
                    <VerifiedBadge industry={industry} verifying={verifyingId === industry._id} onVerify={toggleVerify} />
                  </div>
                  <div className="text-[11.5px] text-body mb-1">
                    {t("admin.system.industries.mobile.ownerPrefix", "Owner:")} {industry.owner ? getDisplayName(industry.owner, nicknames) : "—"}
                  </div>
                  <div className="text-[11.5px] text-body mb-3">
                    {t("admin.system.industries.table.buildingPrefix", "Bldg")} {industry.buildingNumber} &middot;{" "}
                    {t("admin.system.industries.table.galaPrefix", "Gala")} {industry.galaNumber}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(industry)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center justify-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> {t("admin.system.industries.mobile.editButton", "Edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(industry)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-alarm inline-flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> {t("admin.system.industries.mobile.deleteButton", "Delete")}
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

      {/* Edit listing */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-ink">
                  {t("admin.system.industries.editDialog.title", "Edit listing")}
                </DialogTitle>
                <DialogDescription className="text-body">
                  {t("admin.system.industries.editDialog.description", "Update this business listing's details.")}
                </DialogDescription>
              </DialogHeader>
              <BusinessListingForm mode="admin" initial={editing} onSaved={handleSaved} onCancel={closeEdit} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.system.industries.deleteDialog.title", "Delete this listing?")}
        description={
          deleteTarget
            ? `"${pickLang(deleteTarget.name, lang)}" ${t(
                "admin.system.industries.deleteDialog.description",
                "will be permanently removed. This can't be undone."
              )}`
            : undefined
        }
        confirmLabel={t("admin.system.industries.deleteDialog.confirmLabel", "Delete listing")}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

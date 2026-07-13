"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, ChevronDown, Building2, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import StatusPill from "@/components/app/status-pill";
import BusinessListingForm from "@/components/app/business-listing-form";
import { pickLang } from "@/utils/localizedContent";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const badgeClass = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ivory text-body whitespace-nowrap";
const chipClass = "inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E5E3FB] text-[#4338CA]";

export default function MemberBusinessPage() {
  const { toast } = useToast();
  const { t, lang } = useI18n();

  const [me, setMe] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const meRes = await axiosInstance.get("/auth/me");
        if (!active) return;
        setMe(meRes.data);
        const listRes = await axiosInstance.get(`/industries/owner/${meRes.data._id}`);
        if (!active) return;
        const data = Array.isArray(listRes.data) ? listRes.data : [];
        setListings(data);
        setExpandedId(data[0]?._id || null);
      } catch (err) {
        if (!active) return;
        toast({
          title: t("member.more.business.toast.loadError", "Couldn't load your business listing"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [toast, t]);

  const openCreate = () => {
    setEditingListing(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingListing(item);
    setExpandedId(item._id);
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleSaved = (saved, opts = {}) => {
    setListings((prev) => (prev.some((l) => l._id === saved._id) ? prev.map((l) => (l._id === saved._id ? saved : l)) : [saved, ...prev]));
    setExpandedId(saved._id);
    if (!opts.silent) closeForm();
  };

  return (
    <div>
      <PageHeader
        title={t("member.more.business.title", "My business")}
        description={t("member.more.business.description", "Manage your business listing in the federation directory.")}
        action={
          !loading && me ? (
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("member.more.business.addListing", "Add listing")}
            </button>
          ) : undefined
        }
      />

      {showForm && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold text-ink">
              {editingListing
                ? t("member.more.business.form.editTitle", "Edit listing")
                : t("member.more.business.form.createTitle", "Create your listing")}
            </h2>
          </div>
          <BusinessListingForm
            mode="member"
            initial={editingListing}
            prefillDefaults={me}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl app-glass glass-shadow animate-pulse" />
          ))}
        </div>
      )}

      {!loading && listings.length === 0 && !showForm && (
        <EmptyState
          icon={Building2}
          title={t("member.more.business.emptyState.title", "No business listing yet")}
          description={t(
            "member.more.business.emptyState.description",
            "Create your listing so other members can find your business in the federation directory."
          )}
          action={
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
            >
              {t("member.more.business.emptyState.action", "+ Create your listing")}
            </button>
          }
        />
      )}

      {!loading && listings.length > 0 && !showForm && (
        <div className="space-y-3">
          {listings.map((item) => {
            const expanded = expandedId === item._id;
            return (
              <div key={item._id} className="app-glass glass-shadow rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item._id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="font-display font-bold text-ink text-[14.5px] truncate">{pickLang(item.name, lang)}</div>
                    <div className="text-[12px] text-body truncate">{pickLang(item.businessType, lang)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <StatusPill status={item.occupancyType} />
                    <ChevronDown className={`h-4 w-4 text-body transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-line pt-4">
                    {item.verified && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-ok mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("member.more.business.verifiedBadge", "Verified business")}
                      </div>
                    )}

                    <p className="text-[13px] text-body mb-3 break-words">{pickLang(item.description, lang)}</p>
                    {pickLang(item.aboutUs, lang) && (
                      <p className="text-[12.5px] text-body/80 mb-3 break-words whitespace-pre-wrap">{pickLang(item.aboutUs, lang)}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={badgeClass}>
                        {t("member.more.business.buildingBadge", "Bldg")} {item.buildingNumber}
                      </span>
                      <span className={badgeClass}>
                        {t("member.more.business.galaBadge", "Gala")} {item.galaNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] text-body mb-3">
                      <div className="truncate">
                        <span className="font-semibold text-ink">{t("member.more.business.gstLabel", "GST: ")}</span>
                        {item.gstInfo}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-ink">{t("member.more.business.contactLabel", "Contact: ")}</span>
                        {item.contactNumber}
                      </div>
                    </div>

                    {item.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.keywords.map((kw, i) => (
                          <span key={kw + i} className={chipClass}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.products?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-body/70 mb-1.5">Products</p>
                        <div className="space-y-1.5">
                          {item.products.map((p) => (
                            <div key={p._id} className="flex items-center gap-2 text-[12.5px] text-ink">
                              {p.images?.[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.images[0]} alt="" className="h-8 w-8 rounded object-cover flex-none" />
                              )}
                              <span className="truncate flex-1">{pickLang(p.name, lang)}</span>
                              {p.price != null && <span className="font-bold flex-none">₹{Number(p.price).toLocaleString("en-IN")}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.images?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        {item.images.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="" className="h-14 w-14 rounded-lg object-cover border border-line" />
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white inline-flex items-center gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("member.more.business.editListingButton", "Edit listing")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

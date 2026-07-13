"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import ChipInput from "@/components/app/chip-input";
import { LocalizedInput, LocalizedTextarea, ContentLanguageTabs } from "@/components/app/localized-fields";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { emptyLocalized } from "@/utils/localizedContent";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const OCCUPANCY_OPTIONS = [
  { value: "owner", key: "member.more.business.occupancy.owner", label: "Owner" },
  { value: "tenant", key: "member.more.business.occupancy.tenant", label: "Tenant" },
];

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const MAX_BUSINESS_IMAGES = 20;
const MAX_PRODUCT_IMAGES = 8;

const emptyBusinessHours = () => DAYS.reduce((acc, d) => ({ ...acc, [d.key]: { open: "", close: "", closed: false } }), {});
const emptySocialLinks = () => ({ website: "", facebook: "", instagram: "", whatsapp: "" });
const emptyProduct = () => ({ _id: undefined, name: emptyLocalized(), description: emptyLocalized(), price: "", images: [] });

const fieldClass =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder";
const labelClass = "block text-[11px] font-bold text-body uppercase tracking-wide mb-1";

function PillSelect({ options, value, onChange }) {
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
          {t(opt.key, opt.label)}
        </button>
      ))}
    </div>
  );
}

const emptyForm = () => ({
  name: emptyLocalized(),
  businessType: emptyLocalized(),
  description: emptyLocalized(),
  aboutUs: emptyLocalized(),
  foundedYear: "",
  galaNumber: "",
  buildingNumber: "",
  occupancyType: "owner",
  gstInfo: "",
  contactNumber: "",
  keywords: [],
  materials: [],
  businessHours: emptyBusinessHours(),
  socialLinks: emptySocialLinks(),
});

const SECTIONS = [
  { value: "basics", label: "Basics" },
  { value: "about", label: "About us" },
  { value: "hours", label: "Hours" },
  { value: "social", label: "Social" },
  { value: "materials", label: "Materials" },
  { value: "products", label: "Products" },
  { value: "gallery", label: "Gallery" },
];

// Shared rich-template business-listing editor, used by both the member
// self-service page and the admin edit dialog — same fields, same depth,
// since owners and admins have identical edit permissions server-side.
export default function BusinessListingForm({ mode, initial, prefillDefaults, onSaved, onCancel }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [formLang, setFormLang] = useState("en");
  const [tab, setTab] = useState("basics");
  const [form, setForm] = useState(emptyForm());
  const [products, setProducts] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef(null);
  const productImageInputRefs = useRef({});

  const editingId = initial?._id;

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || emptyLocalized(),
        businessType: initial.businessType || emptyLocalized(),
        description: initial.description || emptyLocalized(),
        aboutUs: initial.aboutUs || emptyLocalized(),
        foundedYear: initial.foundedYear != null ? String(initial.foundedYear) : "",
        galaNumber: initial.galaNumber != null ? String(initial.galaNumber) : "",
        buildingNumber: initial.buildingNumber != null ? String(initial.buildingNumber) : "",
        occupancyType: initial.occupancyType || "owner",
        gstInfo: initial.gstInfo || "",
        contactNumber: initial.contactNumber || "",
        keywords: initial.keywords || [],
        materials: initial.materials || [],
        businessHours: { ...emptyBusinessHours(), ...(initial.businessHours || {}) },
        socialLinks: { ...emptySocialLinks(), ...(initial.socialLinks || {}) },
      });
      setProducts((initial.products || []).map((p) => ({ ...p, price: p.price != null ? String(p.price) : "" })));
      setExistingImages(initial.images || []);
    } else {
      // First-time create (member mode only): seed from whatever the member
      // already gave us at signup, so they don't re-type building/gala/etc.
      setForm({
        ...emptyForm(),
        name: prefillDefaults?.businessName ? { ...emptyLocalized(), en: prefillDefaults.businessName } : emptyLocalized(),
        businessType: prefillDefaults?.businessType ? { ...emptyLocalized(), en: prefillDefaults.businessType } : emptyLocalized(),
        galaNumber: prefillDefaults?.galaNumber != null ? String(prefillDefaults.galaNumber) : "",
        buildingNumber: prefillDefaults?.buildingNumber != null ? String(prefillDefaults.buildingNumber) : "",
        occupancyType: prefillDefaults?.occupancyType || "owner",
      });
      setProducts([]);
      setExistingImages([]);
    }
    setNewImageFiles([]);
    setFormLang("en");
    setTab("basics");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?._id]);

  const updateProduct = (index, patch) => {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };
  const addProduct = () => setProducts((prev) => [...prev, emptyProduct()]);
  const removeProduct = (index) => setProducts((prev) => prev.filter((_, i) => i !== index));

  const handleImagesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (existingImages.length + newImageFiles.length + files.length > MAX_BUSINESS_IMAGES) {
      toast({
        title: t("shared.business.toast.tooManyImages", `Up to ${MAX_BUSINESS_IMAGES} images allowed`),
        variant: "destructive",
      });
      return;
    }
    setNewImageFiles((prev) => [...prev, ...files]);
  };

  const removeExistingImage = (url) => {
    if (!editingId) {
      setExistingImages((prev) => prev.filter((u) => u !== url));
      return;
    }
    axiosInstance
      .delete(`/industries/${editingId}/images`, { data: { url } })
      .then((res) => {
        setExistingImages(res.data.images || []);
        onSaved?.(res.data, { silent: true });
      })
      .catch((err) => toast({ title: "Couldn't remove image", description: apiErrorMessage(err), variant: "destructive" }));
  };

  const moveExistingImage = (index, dir) => {
    const next = [...existingImages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setExistingImages(next);
    if (editingId) {
      axiosInstance
        .put(`/industries/${editingId}/images/reorder`, { images: next })
        .catch((err) => toast({ title: "Couldn't reorder images", description: apiErrorMessage(err), variant: "destructive" }));
    }
  };

  const uploadProductPhotos = (productId, files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("images", f));
    axiosInstance
      .post(`/industries/${editingId}/products/${productId}/images`, fd)
      .then((res) => {
        setProducts((res.data.products || []).map((p) => ({ ...p, price: p.price != null ? String(p.price) : "" })));
        onSaved?.(res.data, { silent: true });
        toast({ title: "Product photo added" });
      })
      .catch((err) => toast({ title: "Couldn't add product photo", description: apiErrorMessage(err), variant: "destructive" }));
  };

  const removeProductPhoto = (productId, url) => {
    axiosInstance
      .delete(`/industries/${editingId}/products/${productId}/images`, { data: { url } })
      .then((res) => {
        setProducts((res.data.products || []).map((p) => ({ ...p, price: p.price != null ? String(p.price) : "" })));
        onSaved?.(res.data, { silent: true });
      })
      .catch((err) => toast({ title: "Couldn't remove product photo", description: apiErrorMessage(err), variant: "destructive" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.en.trim()) return toast({ title: "Business name (English) is required", variant: "destructive" });
    if (!form.businessType.en.trim()) return toast({ title: "Business type (English) is required", variant: "destructive" });
    if (!form.description.en.trim()) return toast({ title: "Description (English) is required", variant: "destructive" });
    if (form.galaNumber === "") return toast({ title: "Gala number is required", variant: "destructive" });
    if (form.buildingNumber === "") return toast({ title: "Building number is required", variant: "destructive" });
    if (!form.gstInfo.trim()) return toast({ title: "GST information is required", variant: "destructive" });
    if (!form.contactNumber.trim()) return toast({ title: "Contact number is required", variant: "destructive" });

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", JSON.stringify(form.name));
      fd.append("businessType", JSON.stringify(form.businessType));
      fd.append("description", JSON.stringify(form.description));
      fd.append("aboutUs", JSON.stringify(form.aboutUs));
      fd.append("foundedYear", form.foundedYear);
      fd.append("galaNumber", form.galaNumber);
      fd.append("buildingNumber", form.buildingNumber);
      fd.append("occupancyType", form.occupancyType);
      fd.append("gstInfo", form.gstInfo.trim());
      fd.append("contactNumber", form.contactNumber.trim());
      fd.append("keywords", JSON.stringify(form.keywords));
      fd.append("materials", JSON.stringify(form.materials));
      fd.append("businessHours", JSON.stringify(form.businessHours));
      fd.append("socialLinks", JSON.stringify(form.socialLinks));
      fd.append(
        "products",
        JSON.stringify(products.map((p) => ({ _id: p._id, name: p.name, description: p.description, price: p.price })))
      );
      newImageFiles.forEach((f) => fd.append("images", f));

      let saved;
      if (editingId) {
        const res = await axiosInstance.put(`/industries/${editingId}`, fd);
        saved = res.data;
        toast({ title: "Listing updated" });
      } else {
        const res = await axiosInstance.post("/industries", fd);
        saved = res.data;
        toast({ title: "Listing created" });
      }
      setNewImageFiles([]);
      onSaved?.(saved, {});
    } catch (err) {
      toast({ title: "Couldn't save listing", description: apiErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <label className={labelClass}>{t("shared.forms.contentLanguageLabel", "Content language")}</label>
        <ContentLanguageTabs
          lang={formLang}
          onChange={setFormLang}
          completenessValue={{ name: form.name, businessType: form.businessType, description: form.description, aboutUs: form.aboutUs }}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="app-glass h-auto inline-flex flex-nowrap gap-1 rounded-full bg-white/70 p-1">
            {SECTIONS.map((s) => (
              <TabsTrigger
                key={s.value}
                value={s.value}
                className="whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold text-body data-[state=active]:bg-gradient-to-r data-[state=active]:from-madder data-[state=active]:to-grape data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

      <TabsContent value="basics" className="mt-4 space-y-5">
      {/* Basics */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-4">
        <h3 className="font-display font-bold text-ink text-[14px]">Basics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Business name</label>
            <LocalizedInput value={form.name} lang={formLang} onChange={(name) => setForm((f) => ({ ...f, name }))} maxLength={50} required className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Business type</label>
            <LocalizedInput value={form.businessType} lang={formLang} onChange={(businessType) => setForm((f) => ({ ...f, businessType }))} maxLength={100} required className={fieldClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Description (short — shown on cards)</label>
          <LocalizedTextarea
            value={form.description}
            lang={formLang}
            onChange={(description) => setForm((f) => ({ ...f, description }))}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder resize-none"
          />
          <p className="text-[11px] text-body mt-1">{(form.description[formLang] || "").length}/500</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Gala number</label>
            <input type="number" value={form.galaNumber} onChange={(e) => setForm((f) => ({ ...f, galaNumber: e.target.value }))} required className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Building number</label>
            <input type="number" value={form.buildingNumber} onChange={(e) => setForm((f) => ({ ...f, buildingNumber: e.target.value }))} required className={fieldClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Occupancy</label>
          <PillSelect options={OCCUPANCY_OPTIONS} value={form.occupancyType} onChange={(occupancyType) => setForm((f) => ({ ...f, occupancyType }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Founded year (optional)</label>
            <input
              type="number"
              value={form.foundedYear}
              onChange={(e) => setForm((f) => ({ ...f, foundedYear: e.target.value }))}
              placeholder="e.g. 1998"
              min={1800}
              max={new Date().getFullYear()}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>GST information</label>
            <input value={form.gstInfo} onChange={(e) => setForm((f) => ({ ...f, gstInfo: e.target.value }))} maxLength={50} required className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Contact number</label>
            <input value={form.contactNumber} onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))} maxLength={20} required className={fieldClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Keywords</label>
          <ChipInput value={form.keywords} onChange={(keywords) => setForm((f) => ({ ...f, keywords }))} />
        </div>
      </div>
      </TabsContent>

      <TabsContent value="about" className="mt-4 space-y-5">
      {/* About us */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-3">
        <h3 className="font-display font-bold text-ink text-[14px]">About us (long-form — shown on your full page)</h3>
        <LocalizedTextarea
          value={form.aboutUs}
          lang={formLang}
          onChange={(aboutUs) => setForm((f) => ({ ...f, aboutUs }))}
          maxLength={3000}
          rows={6}
          placeholder="Tell visitors more about your business, history, and what makes you different…"
          className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder resize-y"
        />
        <p className="text-[11px] text-body">{(form.aboutUs[formLang] || "").length}/3000</p>
      </div>
      </TabsContent>

      <TabsContent value="hours" className="mt-4 space-y-5">
      {/* Business hours */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-2">
        <h3 className="font-display font-bold text-ink text-[14px] mb-2">Business hours</h3>
        {DAYS.map((d) => {
          const raw = form.businessHours[d.key] || {};
          // Defensive coalescing: pre-existing listings saved before this field existed
          // (or partially filled since Mongoose leaves unset String subfields as
          // `undefined`, not "") would otherwise flip these time inputs from
          // controlled to uncontrolled mid-lifecycle, which React warns about.
          const day = { open: raw.open || "", close: raw.close || "", closed: !!raw.closed };
          return (
            <div key={d.key} className="flex items-center gap-2 flex-wrap">
              <span className="text-[12.5px] font-semibold text-ink w-24 flex-none">{d.label}</span>
              <label className="inline-flex items-center gap-1.5 text-[11.5px] text-body flex-none">
                <input
                  type="checkbox"
                  checked={day.closed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, businessHours: { ...f.businessHours, [d.key]: { ...day, closed: e.target.checked } } }))
                  }
                />
                Closed
              </label>
              {!day.closed && (
                <>
                  <input
                    type="time"
                    value={day.open}
                    onChange={(e) => setForm((f) => ({ ...f, businessHours: { ...f.businessHours, [d.key]: { ...day, open: e.target.value } } }))}
                    className="h-9 px-2 rounded-lg border border-line bg-white text-[12.5px]"
                  />
                  <span className="text-body">–</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e) => setForm((f) => ({ ...f, businessHours: { ...f.businessHours, [d.key]: { ...day, close: e.target.value } } }))}
                    className="h-9 px-2 rounded-lg border border-line bg-white text-[12.5px]"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      </TabsContent>

      <TabsContent value="social" className="mt-4 space-y-5">
      {/* Social links */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-3">
        <h3 className="font-display font-bold text-ink text-[14px]">Website & social links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {["website", "facebook", "instagram", "whatsapp"].map((key) => (
            <div key={key}>
              <label className={labelClass}>{key}</label>
              <input
                value={form.socialLinks[key] || ""}
                onChange={(e) => setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, [key]: e.target.value } }))}
                placeholder="https://…"
                className={fieldClass}
              />
            </div>
          ))}
        </div>
      </div>
      </TabsContent>

      <TabsContent value="materials" className="mt-4 space-y-5">
      {/* Materials */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-2">
        <h3 className="font-display font-bold text-ink text-[14px]">Materials</h3>
        <ChipInput value={form.materials} onChange={(materials) => setForm((f) => ({ ...f, materials }))} placeholder="Add a material and press Enter…" />
      </div>
      </TabsContent>

      <TabsContent value="products" className="mt-4 space-y-5">
      {/* Products */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-ink text-[14px]">Products</h3>
          <button type="button" onClick={addProduct} className="inline-flex items-center gap-1 text-[12px] font-bold text-madder">
            <Plus className="h-3.5 w-3.5" /> Add product
          </button>
        </div>
        {products.length === 0 && <p className="text-[12px] text-body">No products yet.</p>}
        <div className="space-y-4">
          {products.map((p, i) => (
            <div key={p._id || `new-${i}`} className="rounded-xl border border-line p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LocalizedInput
                  value={p.name}
                  lang={formLang}
                  onChange={(name) => updateProduct(i, { name })}
                  placeholder="Product name"
                  className={fieldClass}
                />
                <input
                  type="number"
                  value={p.price}
                  onChange={(e) => updateProduct(i, { price: e.target.value })}
                  placeholder="Price (₹)"
                  className={fieldClass}
                />
              </div>
              <LocalizedTextarea
                value={p.description}
                lang={formLang}
                onChange={(description) => updateProduct(i, { description })}
                placeholder="Product description"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[12.5px] text-ink placeholder:text-body/60 outline-none focus:border-madder resize-none"
              />

              {p._id ? (
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(p.images || []).map((url) => (
                      <div key={url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover border border-line" />
                        <button
                          type="button"
                          onClick={() => removeProductPhoto(p._id, url)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => productImageInputRefs.current[p._id]?.click()}
                      disabled={(p.images || []).length >= MAX_PRODUCT_IMAGES}
                      className="h-14 w-14 rounded-lg border border-dashed border-line flex items-center justify-center text-body/60 disabled:opacity-50"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <input
                      ref={(el) => (productImageInputRefs.current[p._id] = el)}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files?.length && uploadProductPhotos(p._id, e.target.files)}
                    />
                  </div>
                  <p className="text-[10.5px] text-body/70 mt-1">Photos save immediately.</p>
                </div>
              ) : (
                <p className="text-[11px] text-body/70">Save the listing once to add photos to this product.</p>
              )}

              <button type="button" onClick={() => removeProduct(i)} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-alarm">
                <Trash2 className="h-3.5 w-3.5" /> Remove product
              </button>
            </div>
          ))}
        </div>
      </div>
      </TabsContent>

      <TabsContent value="gallery" className="mt-4 space-y-5">
      {/* Gallery */}
      <div className="app-glass glass-shadow rounded-2xl p-4 space-y-3">
        <h3 className="font-display font-bold text-ink text-[14px]">Business gallery ({existingImages.length + newImageFiles.length}/{MAX_BUSINESS_IMAGES})</h3>
        <div className="flex flex-wrap gap-2">
          {existingImages.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover border border-line" />
              <button type="button" onClick={() => removeExistingImage(url)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                <button type="button" onClick={() => moveExistingImage(i, -1)} disabled={i === 0} className="h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center disabled:opacity-40">
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => moveExistingImage(i, 1)} disabled={i === existingImages.length - 1} className="h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center disabled:opacity-40">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {newImageFiles.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover border border-madder" />
              <button
                type="button"
                onClick={() => setNewImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-line flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="h-16 w-16 rounded-lg border border-dashed border-line flex items-center justify-center text-body/60"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesSelected} />
        </div>
        <p className="text-[11px] text-body">New photos are added on save; existing photos update immediately.</p>
      </div>
      </TabsContent>
      </Tabs>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white w-full sm:w-auto">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
        >
          {submitting ? "Saving…" : editingId ? "Save changes" : "Create listing"}
        </button>
      </div>
    </form>
  );
}

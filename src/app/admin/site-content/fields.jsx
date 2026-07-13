"use client";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { LocalizedInput, LocalizedTextarea } from "@/components/app/localized-fields";

export { LocalizedInput, LocalizedTextarea };

export const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13.5px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors";
export const textareaCls =
  "w-full px-3 py-2.5 rounded-xl border border-line bg-white text-[13.5px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors resize-y";
export const labelCls = "block text-[12px] font-semibold text-ink mb-1.5";

export function SectionCard({ title, hint, children }) {
  return (
    <div className="app-glass glass-shadow rounded-2xl p-5 md:p-6 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
        {hint && <span className="text-[11px] text-body/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      {label && <label className={labelCls}>{label}</label>}
      {children}
    </div>
  );
}

export function FieldGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">{children}</div>;
}

export function PlainInput({ value = "", onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

// Uploads to POST /site-content/upload-image and hands back the resulting
// Cloudinary URL — the only content-image upload path for Milestone 1 (logo/
// favicon/decorative assets stay hardcoded per the approved plan).
export function ImageUploadField({ value, onChange, alt, shape = "circle" }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axiosInstance.post("/site-content/upload-image", fd);
      onChange(res.data.url);
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.website.siteContent.toast.imageUploadFailed", "Image upload failed")), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const shapeCls = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`relative h-14 w-14 flex-none ${shapeCls} overflow-hidden border border-dashed border-madder/40 bg-madder/5 flex items-center justify-center`}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={alt || ""} className="h-full w-full object-cover" />
      ) : uploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-madder" />
      ) : (
        <Camera className="h-4 w-4 text-madder" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </button>
  );
}

"use client";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import Avatar from "@/components/app/avatar";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { setAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const fieldClass =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder";
const labelClass = "block text-[11px] font-bold text-body uppercase tracking-wide mb-1";

// Shared self-service "edit my profile" form, used by both the member
// dashboard and the admin/moderator profile pages — the same fields apply
// to any logged-in role.
export default function ProfileForm({ user, onUpdated }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingDetails, setSavingDetails] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoRemoving, setPhotoRemoving] = useState(false);

  const saveDetails = async (e) => {
    e.preventDefault();
    if (savingDetails) return;
    setSavingDetails(true);
    try {
      await axiosInstance.put("/auth/me", { fullName: fullName.trim(), phone: phone.trim() });
      onUpdated?.({ ...user, fullName: fullName.trim(), phone: phone.trim() });
      toast({ title: t("shared.profile.toast.detailsSaved", "Profile updated") });
    } catch (err) {
      toast({
        title: t("shared.profile.toast.detailsError", "Couldn't update profile"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (savingPassword) return;
    if (!currentPassword || !newPassword) {
      toast({
        title: t("shared.profile.toast.passwordRequired", "Enter your current and new password"),
        variant: "destructive",
      });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await axiosInstance.put("/auth/me", { currentPassword, newPassword });
      if (res.data?.token) setAuth({ token: res.data.token });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: t("shared.profile.toast.passwordSaved", "Password updated") });
    } catch (err) {
      toast({
        title: t("shared.profile.toast.passwordError", "Couldn't update password"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await axiosInstance.post("/auth/me/photo", fd);
      onUpdated?.({ ...user, profilePicture: res.data.profilePicture });
      toast({ title: t("shared.profile.toast.photoSaved", "Profile photo updated") });
    } catch (err) {
      toast({
        title: t("shared.profile.toast.photoError", "Couldn't upload photo"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    if (photoRemoving) return;
    setPhotoRemoving(true);
    try {
      await axiosInstance.delete("/auth/me/photo");
      onUpdated?.({ ...user, profilePicture: null });
      toast({ title: t("shared.profile.toast.photoRemoved", "Profile photo removed") });
    } catch (err) {
      toast({
        title: t("shared.profile.toast.photoError", "Couldn't remove photo"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setPhotoRemoving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="app-glass glass-shadow rounded-2xl p-5">
        <h2 className="font-display text-base font-bold text-ink mb-4">
          {t("shared.profile.photoSectionTitle", "Profile photo")}
        </h2>
        <div className="flex items-center gap-4">
          <Avatar name={fullName} src={user?.profilePicture} size="h-16 w-16" textSize="text-[18px]" />
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            <button
              type="button"
              disabled={photoUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-4 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" />
              {photoUploading
                ? t("shared.profile.photoUploading", "Uploading…")
                : user?.profilePicture
                  ? t("shared.profile.photoChange", "Change photo")
                  : t("shared.profile.photoAdd", "Add photo")}
            </button>
            {user?.profilePicture && (
              <button
                type="button"
                disabled={photoRemoving}
                onClick={removePhoto}
                className="h-9 px-4 rounded-full text-[12.5px] font-bold text-alarm border border-line bg-white inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {photoRemoving ? t("shared.profile.photoRemoving", "Removing…") : t("shared.profile.photoRemove", "Remove photo")}
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-body mt-3">
          {t(
            "shared.profile.photoHelp",
            "Helps other members tell you apart from anyone with a similar name — shown in chat, the directory, and member lists."
          )}
        </p>
      </div>

      <form onSubmit={saveDetails} className="app-glass glass-shadow rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-ink">{t("shared.profile.detailsSectionTitle", "Your details")}</h2>
        <div>
          <label className={labelClass}>{t("shared.profile.fullNameLabel", "Full name")}</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>{t("shared.profile.phoneLabel", "Phone")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>{t("shared.profile.emailLabel", "Email")}</label>
          <input value={user?.email || ""} disabled className={`${fieldClass} opacity-60`} />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingDetails}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
          >
            {savingDetails ? t("shared.profile.saving", "Saving…") : t("shared.profile.saveDetails", "Save details")}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="app-glass glass-shadow rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-ink">{t("shared.profile.passwordSectionTitle", "Change password")}</h2>
        <div>
          <label className={labelClass}>{t("shared.profile.currentPasswordLabel", "Current password")}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldClass}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className={labelClass}>{t("shared.profile.newPasswordLabel", "New password")}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            className={fieldClass}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPassword}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
          >
            {savingPassword ? t("shared.profile.saving", "Saving…") : t("shared.profile.savePassword", "Update password")}
          </button>
        </div>
      </form>
    </div>
  );
}

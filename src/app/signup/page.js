"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Camera } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

export default function SignupPage() {
  return (
    <I18nProvider>
      <SignupForm />
    </I18nProvider>
  );
}

const OCCUPANCY_OPTIONS = [
  { value: "owner", key: "auth.signup.fields.occupancyOwner", label: "Owner" },
  { value: "tenant", key: "auth.signup.fields.occupancyTenant", label: "Tenant" },
];

function SignupForm() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    buildingNumber: "",
    galaNumber: "",
    occupancyType: "owner",
    businessName: "",
    businessType: "",
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setPhoto(file || null);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      if (photo) fd.append("photo", photo);
      await axiosInstance.post("/auth/signup", fd);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.signup.errorFallback", "Could not create your account")));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center glass glass-shadow rounded-[1.75rem] p-8">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" strokeWidth={1.75} />
          <h1 className="font-display text-xl font-bold text-ink">{t("auth.signup.successTitle", "Account created")}</h1>
          <p className="text-sm text-body mt-2">
            {t(
              "auth.signup.successDescription",
              "An admin needs to approve your account before you can log in — you’ll be able to sign in as soon as that happens."
            )}
          </p>
          <Link href="/login" className="inline-block mt-5 text-sm font-bold text-madder">
            {t("auth.signup.backToLoginLink", "Back to login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-madder to-grape" />
          <span className="font-display font-bold text-lg text-ink">HDIL-IPCA</span>
        </div>

        <div className="glass glass-shadow rounded-[1.75rem] p-7">
          <h1 className="font-display text-xl font-bold text-ink">{t("auth.signup.title", "Create your account")}</h1>
          <p className="text-sm text-body mt-1 mb-6">
            {t("auth.signup.subtitle", "An admin reviews every new signup before it’s active.")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-3 pb-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-14 w-14 rounded-full flex-none overflow-hidden border border-line bg-white flex items-center justify-center"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-5 w-5 text-body/60" strokeWidth={1.75} />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <div className="min-w-0">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-madder">
                  {photoPreview
                    ? t("auth.signup.fields.photoChange", "Change photo")
                    : t("auth.signup.fields.photoAdd", "Add a profile photo")}
                </button>
                <p className="text-[11px] text-body mt-0.5">
                  {t("auth.signup.fields.photoHelp", "Optional, but helps the admin recognize you.")}
                </p>
              </div>
            </div>

            <Field label={t("auth.signup.fields.fullName", "Full name")} value={form.fullName} onChange={update("fullName")} required />
            <Field label={t("auth.signup.fields.username", "Username")} value={form.username} onChange={update("username")} required />
            <Field
              label={t("auth.signup.fields.email", "Email")}
              type="email"
              value={form.email}
              onChange={update("email")}
              required
            />
            <Field
              label={t("auth.signup.fields.phone", "Phone")}
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              pattern="[6-9][0-9]{9}"
              required
            />
            <Field
              label={t("auth.signup.fields.password", "Password")}
              type="password"
              value={form.password}
              onChange={update("password")}
              required
              minLength={6}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("auth.signup.fields.buildingNumber", "Building number")}
                type="number"
                value={form.buildingNumber}
                onChange={update("buildingNumber")}
                required
              />
              <Field
                label={t("auth.signup.fields.galaNumber", "Gala number")}
                type="number"
                value={form.galaNumber}
                onChange={update("galaNumber")}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-body mb-1.5">{t("auth.signup.fields.occupancyType", "Occupancy")}</label>
              <div className="flex gap-2">
                {OCCUPANCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, occupancyType: opt.value }))}
                    className={
                      form.occupancyType === opt.value
                        ? "h-10 flex-1 rounded-full text-sm font-bold text-white bg-gradient-to-r from-madder to-grape"
                        : "h-10 flex-1 rounded-full text-sm font-bold text-ink border border-line bg-white"
                    }
                  >
                    {t(opt.key, opt.label)}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label={t("auth.signup.fields.businessName", "Business name")}
              value={form.businessName}
              onChange={update("businessName")}
              required
            />
            <Field
              label={t("auth.signup.fields.businessType", "Business type")}
              value={form.businessType}
              onChange={update("businessType")}
              placeholder={t("auth.signup.fields.businessTypePlaceholder", "e.g. CNC machining")}
              required
            />

            {error && <p className="text-xs font-semibold text-alarm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full text-sm font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            >
              {loading ? t("auth.signup.submitLoading", "Creating account…") : t("auth.signup.submitButton", "Create account")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-body mt-5">
          {t("auth.signup.alreadyMemberPrompt", "Already a member?")}{" "}
          <Link href="/login" className="font-semibold text-madder">
            {t("auth.signup.loginLink", "Log in")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required, minLength, pattern, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-body mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        pattern={pattern}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-11 px-3.5 rounded-xl border border-line bg-white text-sm outline-none focus:ring-2 focus:ring-madder/30"
      />
    </div>
  );
}

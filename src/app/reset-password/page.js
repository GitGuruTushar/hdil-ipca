"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { setAuth, isStaffRole } from "@/utils/auth";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

// Query-string token (not a path segment) so this route works on GitHub
// Pages' static export — a purely static host can't pre-render every future
// reset token.
export default function ResetPasswordPage() {
  return (
    <I18nProvider>
      <ResetPasswordForm />
    </I18nProvider>
  );
}

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axiosInstance.put(`/auth/reset-password/${token}`, { password });
      setAuth({ token: res.data.token, role: res.data.role });
      router.push(isStaffRole(res.data.role) ? "/admin" : "/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.resetPassword.errorFallback", "Reset link is invalid or has expired")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass glass-shadow rounded-[1.75rem] p-7">
          <h1 className="font-display text-lg font-bold text-ink">{t("auth.resetPassword.title", "Set a new password")}</h1>
          <p className="text-sm text-body mt-1 mb-5">
            {t("auth.resetPassword.subtitle", "Choose something you haven’t used before.")}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              type="password"
              required
              minLength={6}
              placeholder={t("auth.resetPassword.newPasswordPlaceholder", "New password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-white text-sm outline-none focus:ring-2 focus:ring-madder/30"
            />
            {error && <p className="text-xs font-semibold text-alarm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full h-11 rounded-full text-sm font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            >
              {loading ? t("auth.resetPassword.submitLoading", "Updating…") : t("auth.resetPassword.submitButton", "Set new password")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

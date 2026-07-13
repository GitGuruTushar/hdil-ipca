"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

export default function ForgotPasswordPage() {
  return (
    <I18nProvider>
      <ForgotPasswordForm />
    </I18nProvider>
  );
}

function ForgotPasswordForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass glass-shadow rounded-[1.75rem] p-7 text-center">
          {sent ? (
            <>
              <Mail className="h-9 w-9 text-madder mx-auto mb-3" strokeWidth={1.75} />
              <h1 className="font-display text-lg font-bold text-ink">{t("auth.forgotPassword.sentTitle", "Check your email")}</h1>
              <p className="text-sm text-body mt-2">
                {t("auth.forgotPassword.confirmationPrefix", "If an account exists for ")}
                {email}
                {t("auth.forgotPassword.confirmationSuffix", ", a reset link is on its way. It expires in an hour.")}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-lg font-bold text-ink text-left">
                {t("auth.forgotPassword.title", "Reset your password")}
              </h1>
              <p className="text-sm text-body mt-1 mb-5 text-left">
                {t("auth.forgotPassword.subtitle", "We’ll email you a link to set a new one.")}
              </p>
              <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                <input
                  type="email"
                  required
                  placeholder={t("auth.forgotPassword.emailPlaceholder", "you@example.com")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-line bg-white text-sm outline-none focus:ring-2 focus:ring-madder/30"
                />
                {error && <p className="text-xs font-semibold text-alarm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-full text-sm font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                >
                  {loading ? t("auth.forgotPassword.submitLoading", "Sending…") : t("auth.forgotPassword.submitButton", "Send reset link")}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-sm text-body mt-5">
          <Link href="/login" className="font-semibold text-madder">
            {t("auth.forgotPassword.backToLoginLink", "Back to login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

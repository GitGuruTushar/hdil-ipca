"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { setAuth, isStaffRole } from "@/utils/auth";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

export default function LoginPage() {
  return (
    <I18nProvider>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </I18nProvider>
  );
}

function LoginForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/login", { email, password });
      setAuth({ token: res.data.token, role: res.data.role });
      const next = searchParams.get("next");
      router.push(next || (isStaffRole(res.data.role) ? "/admin" : "/dashboard"));
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.login.errorFallback", "Login failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-madder to-grape" />
          <span className="font-display font-bold text-lg text-ink">HDIL-IPCA</span>
        </div>

        <div className="glass glass-shadow rounded-[1.75rem] p-7">
          <h1 className="font-display text-xl font-bold text-ink">{t("auth.login.title", "Welcome back")}</h1>
          <p className="text-sm text-body mt-1 mb-6">{t("auth.login.subtitle", "Log in to the member portal.")}</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-body mb-1.5">
                {t("auth.login.emailLabel", "Email")}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("auth.login.emailPlaceholder", "you@example.com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-line bg-white text-sm outline-none focus:ring-2 focus:ring-madder/30"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-body">
                  {t("auth.login.passwordLabel", "Password")}
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-madder">
                  {t("auth.login.forgotPasswordLink", "Forgot password?")}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder={t("auth.login.passwordPlaceholder", "••••••••")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-line bg-white text-sm outline-none focus:ring-2 focus:ring-madder/30"
              />
            </div>

            {error && <p className="text-xs font-semibold text-alarm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full text-sm font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            >
              {loading ? t("auth.login.submitLoading", "Logging in…") : t("auth.login.submitButton", "Log in")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-body mt-5">
          {t("auth.login.newMemberPrompt", "New member?")}{" "}
          <Link href="/signup" className="font-semibold text-madder">
            {t("auth.login.createAccountLink", "Create an account")}
          </Link>
        </p>
      </div>
    </div>
  );
}

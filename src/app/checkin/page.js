"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { getAuth } from "@/utils/auth";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

// This is the exact URL the workshop QR code encodes — a member scans it with
// their phone's regular camera app (no in-app scanner needed), lands here,
// and self-checks-in if they're logged in. Query-string params (not path
// segments) so this route works on GitHub Pages' static export — a purely
// static host can't pre-render every future workshopId/code combination.
export default function CheckinPage() {
  return (
    <I18nProvider>
      <CheckinContent />
    </I18nProvider>
  );
}

function CheckinContent() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState("working"); // working | ok | error
  const [message, setMessage] = useState("");
  const [workshop, setWorkshop] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workshopId = params.get("workshopId");
    const code = params.get("code");
    if (!workshopId || !code) {
      setMessage(t("auth.checkin.errorFallback", "Couldn't check you in"));
      setState("error");
      return;
    }

    const { token } = getAuth();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`/checkin?workshopId=${workshopId}&code=${code}`)}`);
      return;
    }
    axiosInstance
      .post(`/workshops/${workshopId}/checkin/${code}`)
      .then((res) => {
        setWorkshop(res.data);
        setState("ok");
      })
      .catch((err) => {
        setMessage(apiErrorMessage(err, t("auth.checkin.errorFallback", "Couldn't check you in")));
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass glass-shadow rounded-[1.75rem] p-8 text-center">
        {state === "working" && (
          <>
            <span className="h-8 w-8 rounded-full border-2 border-madder border-t-transparent animate-spin inline-block mb-3" />
            <p className="text-sm text-body">{t("auth.checkin.workingMessage", "Checking you in…")}</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="h-11 w-11 text-emerald-600 mx-auto mb-3" strokeWidth={1.75} />
            <h1 className="font-display text-lg font-bold text-ink">{t("auth.checkin.successTitle", "You’re checked in")}</h1>
            {workshop?.title && <p className="text-sm text-body mt-1">{workshop.title}</p>}
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="h-11 w-11 text-alarm mx-auto mb-3" strokeWidth={1.75} />
            <h1 className="font-display text-lg font-bold text-ink">{t("auth.checkin.errorTitle", "Check-in failed")}</h1>
            <p className="text-sm text-body mt-1">{message}</p>
          </>
        )}
        <Link href="/dashboard" className="inline-block mt-5 text-sm font-bold text-madder">
          {t("auth.checkin.dashboardLink", "Go to dashboard")}
        </Link>
      </div>
    </div>
  );
}

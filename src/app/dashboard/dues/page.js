"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Receipt } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import StatusPill from "@/components/app/status-pill";
import { useToast } from "@/hooks/use-toast";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";

const formatAmount = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function MemberDuesPage() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get("/dues/mine")
      .then((res) => setDues(res.data || []))
      .catch((err) => {
        toast({
          title: t("member.misc.dues.loadError", "Couldn't load your dues"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = dues.filter((d) => d.status === "pending");
  const pendingTotal = pending.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        title={t("member.misc.dues.title", "Dues")}
        description={t("member.misc.dues.description", "Your membership dues records from the federation.")}
      />

      {!loading && pending.length > 0 && (
        <div className="app-glass glass-shadow rounded-2xl p-4 mb-4 border-l-4 border-amber-400 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-none">
            <AlertCircle className="h-4 w-4 text-amber-700" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-ink">
              {formatAmount(pendingTotal)} {t("member.misc.dues.pendingAcross", "pending across")} {pending.length}{" "}
              {t("member.misc.dues.record", "record")}
              {pending.length > 1 ? "s" : ""}
            </div>
            <div className="text-[11.5px] text-body mt-0.5">
              {t("member.misc.dues.contactNotice", "Contact the federation office to clear outstanding dues.")}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/60 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && dues.length === 0 && (
        <div className="app-glass glass-shadow rounded-2xl">
          <EmptyState
            icon={Receipt}
            title={t("member.misc.dues.emptyState.title", "No dues records yet")}
            description={t(
              "member.misc.dues.emptyState.description",
              "Your membership dues will appear here once the federation office records them."
            )}
          />
        </div>
      )}

      {!loading && dues.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dues.map((d) => (
            <div key={d._id} className="app-glass glass-shadow rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-display font-bold text-ink text-[13.5px] truncate">{d.period}</div>
                <StatusPill status={d.status} className="flex-none" />
              </div>
              <div className="font-display font-bold text-ink text-xl mb-1">{formatAmount(d.amount)}</div>
              {d.industry?.name && <div className="text-[12px] text-body truncate">{pickLang(d.industry.name, lang)}</div>}
              {d.note && (
                <div className="text-[12px] text-body mt-2 bg-ivory rounded-lg p-2 whitespace-pre-wrap break-words">
                  {d.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

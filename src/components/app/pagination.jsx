import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// Works directly against the { page, totalPages, total } shape every
// paginated list endpoint in the backend returns.
export default function Pagination({ page, totalPages, total, onChange }) {
  const { t } = useI18n();
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, start + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-xs text-body">
      <div>
        {t("shared.widgets.pagination.pageLabel", "Page")} {page} {t("shared.widgets.pagination.ofLabel", "of")} {totalPages}
        {typeof total === "number" && (
          <span className="hidden sm:inline"> &middot; {total} {t("shared.widgets.pagination.totalSuffix", "total")}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-7 w-7 rounded-lg border border-line bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("shared.widgets.pagination.previousPage", "Previous page")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={
              p === page
                ? "h-7 w-7 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-madder to-grape"
                : "h-7 w-7 rounded-lg border border-line bg-white text-xs font-semibold text-body"
            }
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="h-7 w-7 rounded-lg border border-line bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("shared.widgets.pagination.nextPage", "Next page")}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

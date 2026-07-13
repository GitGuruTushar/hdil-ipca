"use client";
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import StatusPill from "@/components/app/status-pill";
import { useToast } from "@/hooks/use-toast";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/constants/documentCategories";

const LIMIT = 10;

const FILTER_OPTIONS = [{ value: "", label: "All" }, ...DOCUMENT_CATEGORY_OPTIONS];

function PillSelect({ options, value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value || "all"}
          type="button"
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              : "h-8 px-3.5 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white"
          }
        >
          {t(`member.misc.documents.category.${opt.value || "all"}`, opt.label)}
        </button>
      ))}
    </div>
  );
}

const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function MemberDocumentsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchDocuments = async (p, category) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (category) params.category = category;
      const res = await axiosInstance.get("/documents", { params });
      setDocuments(res.data.documents || []);
      setPage(res.data.page || p);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast({
        title: t("member.misc.documents.loadError", "Couldn't load documents"),
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(page, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryFilter]);

  const changeCategoryFilter = (value) => {
    setCategoryFilter(value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title={t("member.misc.documents.title", "Documents")}
        description={t(
          "member.misc.documents.description",
          "Bylaws, minutes, circulars, and other files shared by the federation."
        )}
      />

      <div className="mb-4">
        <PillSelect options={FILTER_OPTIONS} value={categoryFilter} onChange={changeCategoryFilter} />
      </div>

      <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        )}

        {!loading && documents.length === 0 && (
          <EmptyState
            icon={FileText}
            title={t("member.misc.documents.emptyState.title", "No documents yet")}
            description={
              categoryFilter
                ? t(
                    "member.misc.documents.emptyState.filteredDescription",
                    "No documents in this category yet. Try a different filter."
                  )
                : t(
                    "member.misc.documents.emptyState.description",
                    "Documents shared by the federation office will appear here."
                  )
            }
          />
        )}

        {!loading && documents.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("member.misc.documents.table.title", "Title")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("member.misc.documents.table.category", "Category")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("member.misc.documents.table.date", "Date")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70 text-right">
                      {t("member.misc.documents.table.download", "Download")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc._id} className="border-b border-line last:border-0">
                      <td className="py-3 px-4 max-w-[320px]">
                        <div className="font-semibold text-ink text-[13px] truncate">{doc.title}</div>
                        {doc.description && (
                          <div className="text-[11.5px] text-body truncate mt-0.5">{doc.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={doc.category} label={doc.category === "other" ? doc.otherCategoryLabel : undefined} />
                      </td>
                      <td className="py-3 px-4 text-[12.5px] text-body whitespace-nowrap">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t("member.misc.documents.downloadAriaLabel", "Download")}
                            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center"
                          >
                            <Download className="h-3.5 w-3.5 text-body" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-line">
              {documents.map((doc) => (
                <div key={doc._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-ink text-[13.5px] line-clamp-2 flex-1">{doc.title}</div>
                    <StatusPill status={doc.category} label={doc.category === "other" ? doc.otherCategoryLabel : undefined} className="flex-none" />
                  </div>
                  {doc.description && (
                    <div className="text-[11.5px] text-body line-clamp-2 mb-1.5">{doc.description}</div>
                  )}
                  <div className="text-[11px] text-body mb-3">{formatDate(doc.createdAt)}</div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink inline-flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> {t("member.misc.documents.downloadButton", "Download")}
                  </a>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-line">
              <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

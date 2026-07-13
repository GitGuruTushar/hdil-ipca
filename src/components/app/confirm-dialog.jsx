"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// A single reusable "are you sure?" dialog for every destructive action across
// admin/dashboard — pass open/onOpenChange like any Radix dialog.
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = true,
  loading = false,
  onConfirm,
}) {
  const { t } = useI18n();
  const resolvedTitle = title || t("shared.widgets.confirmDialog.title", "Are you sure?");
  const resolvedConfirmLabel = confirmLabel || t("shared.widgets.confirmDialog.confirmLabel", "Delete");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-line rounded-2xl max-w-sm">
        <DialogHeader>
          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={2} />
          </div>
          <DialogTitle className="font-display text-ink">{resolvedTitle}</DialogTitle>
          {description && <DialogDescription className="text-body">{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-full border border-line bg-white text-sm font-semibold text-ink"
          >
            {t("shared.widgets.confirmDialog.cancelButton", "Cancel")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={
              destructive
                ? "h-9 px-4 rounded-full text-sm font-semibold text-white bg-alarm disabled:opacity-60"
                : "h-9 px-4 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            }
          >
            {loading ? t("shared.widgets.confirmDialog.workingLabel", "Working…") : resolvedConfirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

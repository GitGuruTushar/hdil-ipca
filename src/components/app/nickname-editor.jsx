"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useNicknames } from "@/hooks/use-nicknames";
import { useI18n } from "@/i18n/I18nProvider";

// A small pencil affordance any name-render site can drop next to a member's
// name, letting the viewer set/clear a private display-name override just
// for themselves — useful to disambiguate two members with the same name,
// since there are no profile photos guaranteed to differ either.
export default function NicknameEditor({ targetUserId, realName, size = "h-3.5 w-3.5" }) {
  const { t } = useI18n();
  const { nicknames, setNickname, clearNickname } = useNicknames();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const currentNickname = nicknames?.[targetUserId];

  const openDialog = () => {
    setValue(currentNickname || "");
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const trimmed = value.trim();
      if (trimmed) {
        await setNickname(targetUserId, trimmed);
      } else if (currentNickname) {
        await clearNickname(targetUserId);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openDialog();
        }}
        aria-label={t("shared.nicknames.editAriaLabel", "Set a nickname")}
        className="text-body/50 hover:text-madder"
      >
        <Pencil className={size} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="font-display text-ink">{t("shared.nicknames.dialogTitle", "Set a nickname")}</DialogTitle>
            <DialogDescription className="text-body">
              {t("shared.nicknames.dialogDescription", "Only visible to you — replaces how {name} is displayed everywhere you see them.").replace(
                "{name}",
                realName || ""
              )}
            </DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={50}
            placeholder={realName}
            className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 px-4 rounded-full border border-line bg-white text-sm font-semibold text-ink"
            >
              {t("shared.nicknames.cancelButton", "Cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="h-9 px-4 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
            >
              {saving ? t("shared.nicknames.saving", "Saving…") : t("shared.nicknames.saveButton", "Save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

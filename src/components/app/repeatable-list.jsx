"use client";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// Generic add/remove/reorder wrapper for array-shaped form fields (stats, history
// entries, leadership members, etc.) — used anywhere a CMS field is a list of
// structured rows rather than a single value or flat string list (see ChipInput
// for the flat-string-list case).
export default function RepeatableList({ items, onChange, renderItem, newItem, addLabel }) {
  const { t } = useI18n();

  const update = (index, next) => {
    const copy = items.slice();
    copy[index] = next;
    onChange(copy);
  };

  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  const add = () => onChange([...items, newItem()]);

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const copy = items.slice();
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 mb-2.5">
          <div className="flex flex-col gap-0.5 pt-1.5 flex-none">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={t("shared.forms.repeatableList.moveUpLabel", "Move up")}
              className="h-4 w-6 flex items-center justify-center text-body/60 hover:text-ink disabled:opacity-30"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">{renderItem(item, i, (next) => update(i, next))}</div>
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={t("shared.forms.repeatableList.removeRowLabel", "Remove row")}
            className="h-8 w-8 rounded-lg border border-line bg-white flex items-center justify-center flex-none text-body hover:text-alarm mt-0.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full text-[12.5px] font-semibold text-madder bg-madder/5 border border-dashed border-madder/35 rounded-xl py-2.5 flex items-center justify-center gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}

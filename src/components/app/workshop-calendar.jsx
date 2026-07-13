"use client";
import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkshopCalendar({ workshops = [], onSelectDay, selectedDay }) {
  const { t } = useI18n();
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const w of workshops) {
      const key = format(new Date(w.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(w);
    }
    return map;
  }, [workshops]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-bold text-ink text-[15px]">{format(cursor, "MMMM yyyy")}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label={t("shared.forms.workshopCalendar.previousMonthLabel", "Previous month")}
            className="h-7 w-7 rounded-lg border border-line bg-white flex items-center justify-center"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label={t("shared.forms.workshopCalendar.nextMonthLabel", "Next month")}
            className="h-7 w-7 rounded-lg border border-line bg-white flex items-center justify-center"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-body/70 pb-1">
            {t(`shared.forms.workshopCalendar.dow.${d.toLowerCase()}`, d)}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const events = eventsByDay.get(key) || [];
          const inMonth = isSameMonth(day, cursor);
          const selected = selectedDay && isSameDay(day, selectedDay);
          return (
            <button
              key={key}
              onClick={() => events.length && onSelectDay?.(day, events)}
              className={`aspect-square rounded-xl border p-1.5 text-left text-[11px] ${
                inMonth ? "bg-white text-body" : "bg-white/40 text-body/40"
              } ${isToday(day) ? "border-madder" : "border-line"} ${selected ? "ring-2 ring-madder" : ""}`}
            >
              <div className={isToday(day) ? "font-bold text-madder" : ""}>{format(day, "d")}</div>
              {events.slice(0, 1).map((e) => (
                <div key={e._id} className="mt-1 text-[9px] font-bold px-1 py-0.5 rounded bg-[#E5E3FB] text-[#4338CA] truncate">
                  {e.title}
                </div>
              ))}
              {events.length > 1 && (
                <div className="text-[9px] text-body/70 mt-0.5">
                  +{events.length - 1} {t("shared.forms.workshopCalendar.moreLabel", "more")}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

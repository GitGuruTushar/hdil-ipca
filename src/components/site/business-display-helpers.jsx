export const tel = (n) => `tel:${String(n || "").replace(/[^\d+]/g, "")}`;

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const SOCIAL_KEYS = ["website", "facebook", "instagram", "whatsapp"];

export function hasBusinessHours(businessHours) {
  if (!businessHours) return false;
  return DAY_ORDER.some((d) => businessHours[d] && (businessHours[d].closed || businessHours[d].open || businessHours[d].close));
}

export function BusinessHoursList({ businessHours, compact }) {
  return (
    <div className={compact ? "space-y-1 text-[12px]" : "grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2"}>
      {DAY_ORDER.map((d) => {
        const day = businessHours[d] || {};
        return (
          <div key={d} className="flex items-center justify-between gap-3 rounded-lg bg-ivory px-3 py-1.5">
            <span className="font-semibold text-ink">{DAY_LABELS[d]}</span>
            <span className="text-body">{day.closed ? "Closed" : day.open && day.close ? `${day.open} – ${day.close}` : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

export function hasSocialLinks(socialLinks) {
  if (!socialLinks) return false;
  return SOCIAL_KEYS.some((k) => socialLinks[k]);
}

export function SocialLinksList({ socialLinks }) {
  const entries = SOCIAL_KEYS.filter((k) => socialLinks[k]);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((k) => (
        <a
          key={k}
          href={socialLinks[k]}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold capitalize text-ink hover:border-madder"
        >
          {k}
        </a>
      ))}
    </div>
  );
}

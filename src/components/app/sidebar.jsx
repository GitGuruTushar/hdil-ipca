"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "./nav-config";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminSidebar({ counts = {}, onNavigate }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="p-3">
      <Link href="/admin" className="flex items-center gap-2 px-2.5 py-2 mb-3" onClick={onNavigate}>
        <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-madder to-grape flex-none" />
        <span className="font-display font-bold text-[15px] text-ink">{t("shared.nav.brandName", "HDIL-IPCA")}</span>
      </Link>

      {ADMIN_NAV.map((section) => (
        <div key={section.group} className="mb-3.5">
          <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-body/70">
            {t(`shared.nav.${section.groupKey}`, section.group)}
          </div>
          {section.items.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            const count = item.badgeKey ? counts[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-semibold mb-0.5 ${
                  active ? "bg-[#E5E3FB] text-[#4338CA]" : "text-body hover:bg-ivory"
                }`}
              >
                <Icon className="h-4 w-4 flex-none" strokeWidth={2} />
                <span className="truncate">{t(`shared.nav.${item.key}`, item.label)}</span>
                {!!count && (
                  <span className="ml-auto h-4 min-w-4 px-1 rounded-full bg-alarm text-white text-[9px] font-bold flex items-center justify-center flex-none">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

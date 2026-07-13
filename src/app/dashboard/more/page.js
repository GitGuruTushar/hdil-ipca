"use client";
import Link from "next/link";
import { MessageSquareWarning, Receipt, FileText, ChevronRight, UserCircle } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import { useI18n } from "@/i18n/I18nProvider";

// Grievances/Dues/Documents didn't earn a primary bottom-nav slot (checked far
// less often than Home/Workshops/Notices/Business) — this hub is the one tap
// further to reach them.
const ITEMS = [
  {
    labelKey: "member.more.items.profile.label",
    label: "My profile",
    descriptionKey: "member.more.items.profile.description",
    description: "Photo, contact details, and password",
    href: "/dashboard/profile",
    icon: UserCircle,
  },
  {
    labelKey: "member.more.items.grievances.label",
    label: "Grievances",
    descriptionKey: "member.more.items.grievances.description",
    description: "File and track grievances with the federation",
    href: "/dashboard/grievances",
    icon: MessageSquareWarning,
  },
  {
    labelKey: "member.more.items.dues.label",
    label: "Dues",
    descriptionKey: "member.more.items.dues.description",
    description: "View your membership dues and payment status",
    href: "/dashboard/dues",
    icon: Receipt,
  },
  {
    labelKey: "member.more.items.documents.label",
    label: "Documents",
    descriptionKey: "member.more.items.documents.description",
    description: "Bylaws, minutes, circulars, and other files",
    href: "/dashboard/documents",
    icon: FileText,
  },
];

export default function MorePage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("member.more.title", "More")} />
      <div className="flex flex-col gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="app-glass glass-shadow rounded-2xl p-4 flex items-center gap-3.5 w-full"
            >
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-madder to-grape flex items-center justify-center flex-none">
                <Icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-ink text-[14.5px]">{t(item.labelKey, item.label)}</div>
                <div className="text-[12px] text-body truncate">{t(item.descriptionKey, item.description)}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-body/60 flex-none" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

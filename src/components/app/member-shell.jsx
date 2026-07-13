"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { MEMBER_NAV } from "./nav-config";
import NotificationBell from "./notification-bell";
import LanguageSwitcher from "./language-switcher";
import Avatar from "./avatar";
import axiosInstance from "@/utils/axiosInstance";
import { clearAuth } from "@/utils/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { pickLang } from "@/utils/localizedContent";
import { getSocket } from "@/utils/socket";

export default function MemberShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    axiosInstance.get("/auth/me").then((res) => {
      setUser(res.data);
      axiosInstance
        .get(`/industries/owner/${res.data._id}`)
        .then((r) => setIndustry(r.data?.[0] || null))
        .catch(() => {});
    }).catch(() => {});

    axiosInstance
      .get("/conversations", { params: { limit: 200 } })
      .then((r) => (r.data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0))
      .catch(() => 0)
      .then((messages) => setCounts({ messages }));
  }, []);

  // Connected once for the whole authenticated shell (not per-page) so
  // presence/typing keep working even when Messages isn't the open tab.
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-ivory pb-20 md:pb-8">
      <div className="max-w-2xl mx-auto p-3 md:p-6">
        <div className="app-glass glass-shadow rounded-2xl p-3.5 mb-3.5 flex items-center gap-3">
          <Link href="/dashboard/profile" aria-label={t("shared.profile.title", "My profile")}>
            <Avatar name={user?.fullName || user?.username} src={user?.profilePicture} />
          </Link>
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-ink truncate">
              {user
                ? `${t("shared.nav.welcomeBackName", "Welcome back,")} ${user.fullName?.split(" ")[0]}`
                : t("shared.nav.welcomeBack", "Welcome back")}
            </div>
            <div className="text-[11px] text-body truncate">
              {industry
                ? `${pickLang(industry.name, lang)} · ${
                    industry.occupancyType === "owner"
                      ? t("shared.nav.ownerLabel", "Owner")
                      : t("shared.nav.tenantLabel", "Tenant")
                  }`
                : t("shared.nav.federationMember", "Federation member")}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 flex-none">
            <LanguageSwitcher />
            <NotificationBell />
            <button
              onClick={logout}
              aria-label={t("shared.nav.logout", "Log out")}
              className="hidden md:flex h-9 w-9 rounded-full border border-line bg-white items-center justify-center text-body"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-1 border-b border-line mb-4">
          {MEMBER_NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
            const count = item.badgeKey ? counts[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2.5 text-[13px] font-bold border-b-2 -mb-px ${
                  active ? "text-madder border-madder" : "text-body/70 border-transparent"
                }`}
              >
                {t(`shared.nav.${item.key}`, item.label)}
                {!!count && (
                  <span className="ml-1.5 h-4 min-w-4 px-1 rounded-full bg-alarm text-white text-[9px] font-bold flex items-center justify-center flex-none">
                    {count > 9 ? t("shared.nav.countOverflow", "9+") : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <main>{children}</main>
      </div>

      {/* Mobile bottom nav — thumb-reachable, the primary navigation surface on phone */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 app-glass border-t border-line z-30">
        <div className="flex items-stretch max-w-2xl mx-auto">
          {MEMBER_NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            const count = item.badgeKey ? counts[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${
                  active ? "text-madder" : "text-body/70"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {!!count && (
                    <span className="absolute -top-1 -right-1.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-alarm text-white text-[8px] font-bold flex items-center justify-center">
                      {count > 9 ? t("shared.nav.countOverflow", "9+") : count}
                    </span>
                  )}
                </span>
                {t(`shared.nav.${item.key}`, item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, LogOut, UserCircle } from "lucide-react";
import AdminSidebar from "./sidebar";
import SearchBar from "./search-bar";
import NotificationBell from "./notification-bell";
import LanguageSwitcher from "./language-switcher";
import Avatar from "./avatar";
import axiosInstance from "@/utils/axiosInstance";
import { clearAuth } from "@/utils/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { getSocket } from "@/utils/socket";

export default function AppShell({ children }) {
  const router = useRouter();
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [counts, setCounts] = useState({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    axiosInstance.get("/auth/me").then((res) => setUser(res.data)).catch(() => {});

    Promise.all([
      axiosInstance.get("/auth/pending", { params: { limit: 1 } }).then((r) => r.data.total).catch(() => 0),
      axiosInstance.get("/grievances", { params: { status: "open", limit: 1 } }).then((r) => r.data.total).catch(() => 0),
      axiosInstance.get("/contact", { params: { status: "new", limit: 1 } }).then((r) => r.data.total).catch(() => 0),
      axiosInstance
        .get("/conversations", { params: { limit: 200 } })
        .then((r) => (r.data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0))
        .catch(() => 0),
    ]).then(([pendingMembers, grievances, contact, messages]) => {
      setCounts({ pendingMembers, grievances, contact, messages });
    });
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
    <div className="min-h-screen bg-ivory">
      <div className="max-w-[1240px] mx-auto p-3 md:p-4">
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-3.5">
          {/* Desktop sidebar */}
          <aside className="hidden md:block">
            <div className="app-glass glass-shadow rounded-2xl sticky top-4">
              <AdminSidebar counts={counts} />
            </div>
          </aside>

          {/* Mobile drawer */}
          {drawerOpen && (
            <div className="md:hidden fixed inset-0 z-40">
              <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white overflow-y-auto">
                <div className="flex justify-end p-2">
                  <button onClick={() => setDrawerOpen(false)} aria-label={t("shared.nav.closeMenu", "Close menu")} className="h-8 w-8 flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <AdminSidebar counts={counts} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          )}

          <div className="min-w-0">
            {/* Topbar */}
            <div className="app-glass glass-shadow rounded-2xl p-2.5 mb-3.5 flex items-center gap-2.5">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label={t("shared.nav.openMenu", "Open menu")}
                className="md:hidden h-9 w-9 rounded-full border border-line bg-white flex items-center justify-center flex-none"
              >
                <Menu className="h-4 w-4" />
              </button>
              <SearchBar />
              <div className="flex items-center gap-2 ml-auto flex-none">
                <LanguageSwitcher />
                <NotificationBell />
                <div className="relative">
                  <button onClick={() => setUserMenuOpen((v) => !v)}>
                    <Avatar name={user?.fullName || user?.username} src={user?.profilePicture} size="h-9 w-9" textSize="text-[11px]" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-48 app-glass glass-shadow rounded-2xl p-1.5 z-30">
                      <div className="px-2.5 py-2 border-b border-line mb-1">
                        <div className="text-[12.5px] font-bold text-ink truncate">{user?.fullName}</div>
                        <div className="text-[11px] text-body truncate">{user?.email}</div>
                      </div>
                      <Link
                        href="/admin/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-semibold text-ink hover:bg-ivory"
                      >
                        <UserCircle className="h-3.5 w-3.5" /> {t("shared.profile.title", "My profile")}
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-semibold text-alarm hover:bg-red-50"
                      >
                        <LogOut className="h-3.5 w-3.5" /> {t("shared.nav.logout", "Log out")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <main>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

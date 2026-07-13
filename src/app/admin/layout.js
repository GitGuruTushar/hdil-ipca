import ProtectedRoute from "../components/protectedRoute";
import AppShell from "@/components/app/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/i18n/I18nProvider";
import { NicknameProvider } from "@/hooks/use-nicknames";

export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute requireStaff>
      <I18nProvider>
        <NicknameProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </NicknameProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}

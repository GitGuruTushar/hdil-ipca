import ProtectedRoute from "../components/protectedRoute";
import MemberShell from "@/components/app/member-shell";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/i18n/I18nProvider";
import { NicknameProvider } from "@/hooks/use-nicknames";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <I18nProvider>
        <NicknameProvider>
          <MemberShell>{children}</MemberShell>
          <Toaster />
        </NicknameProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}

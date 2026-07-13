"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/app/page-header";
import ProfileForm from "@/components/app/profile-form";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminProfilePage() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);

  useEffect(() => {
    axiosInstance.get("/auth/me").then((res) => setUser(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title={t("shared.profile.title", "My profile")}
        description={t("shared.profile.description", "Manage your details, password, and profile photo.")}
      />
      {user && <ProfileForm user={user} onUpdated={setUser} />}
    </div>
  );
}

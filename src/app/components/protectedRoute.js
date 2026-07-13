"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/axiosInstance";
import { getAuth, setAuth, clearAuth, isStaffRole } from "@/utils/auth";

// Renders nothing (a bare loading state) until the session is verified against
// the server — no flash of protected content, and a stale/revoked token (the
// backend re-checks role/status/tokenVersion on every request) redirects to
// /login instead of silently trusting whatever's in localStorage.
export default function ProtectedRoute({ children, requireStaff = false }) {
  const router = useRouter();
  const [state, setState] = useState("checking"); // checking | ok

  useEffect(() => {
    let cancelled = false;
    const { token } = getAuth();

    if (!token) {
      router.replace("/login");
      return;
    }

    axiosInstance
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        const role = res.data.role;
        if (requireStaff && !isStaffRole(role)) {
          router.replace("/login");
          return;
        }
        setAuth({ role });
        setState("ok");
      })
      .catch(() => {
        if (cancelled) return;
        clearAuth();
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [requireStaff, router]);

  if (state !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="flex items-center gap-3 text-body text-sm">
          <span className="h-4 w-4 rounded-full border-2 border-madder border-t-transparent animate-spin" />
          Verifying your session&hellip;
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

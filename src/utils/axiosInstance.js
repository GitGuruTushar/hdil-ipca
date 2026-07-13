import axios from "axios";
import { clearAuth } from "./auth";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api",
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// A 401 means the token is missing/invalid/expired/superseded (see backend's
// tokenVersion check) — clear the stale session and bounce to login, except for
// the auth endpoints themselves (a failed login attempt is not a stale session).
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/signup") || url.includes("/auth/forgot-password") || url.includes("/auth/reset-password");
    if (status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
      clearAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const apiErrorMessage = (err, fallback = "Something went wrong") =>
  err?.response?.data?.msg || err?.response?.data?.errors?.[0]?.msg || fallback;

export default axiosInstance;

// utils/auth.js
export const getAuth = () => {
  if (typeof window === "undefined") return { token: null, role: null };
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  return { token, role };
};

export const setAuth = ({ token, role }) => {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  if (role) localStorage.setItem("role", role);
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

// Staff = can reach /admin. Everyone approved can reach /dashboard.
export const isStaffRole = (role) => role === "admin" || role === "moderator";

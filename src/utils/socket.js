import { io } from "socket.io-client";
import { getAuth } from "./auth";

// Derives the socket origin from NEXT_PUBLIC_SOCKET_URL, or falls back to
// stripping "/api" off the REST API URL (same host, different path) — mirrors
// how axiosInstance resolves its own base URL.
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/api\/?$/, "");

let socket;

// Lazy singleton — created on first use, reused across the whole authenticated
// shell so presence/typing keep working even when Messages isn't the open tab.
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: (cb) => cb({ token: getAuth().token })
    });
  }
  return socket;
}

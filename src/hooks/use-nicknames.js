"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

const NicknameContext = createContext(null);

// Fetches the viewer's private nickname map ({ targetUserId: nickname }) once
// per authenticated shell mount, and exposes optimistic set/clear so name
// edits reflect immediately without waiting on the round trip.
export function NicknameProvider({ children }) {
  const [nicknames, setNicknames] = useState({});

  useEffect(() => {
    axiosInstance
      .get("/nicknames")
      .then((res) => setNicknames(res.data || {}))
      .catch(() => {});
  }, []);

  const setNickname = useCallback(async (targetUserId, nickname) => {
    setNicknames((prev) => ({ ...prev, [targetUserId]: nickname }));
    await axiosInstance.put(`/nicknames/${targetUserId}`, { nickname });
  }, []);

  const clearNickname = useCallback(async (targetUserId) => {
    setNicknames((prev) => {
      const next = { ...prev };
      delete next[targetUserId];
      return next;
    });
    await axiosInstance.delete(`/nicknames/${targetUserId}`);
  }, []);

  const value = useMemo(() => ({ nicknames, setNickname, clearNickname }), [nicknames, setNickname, clearNickname]);

  return <NicknameContext.Provider value={value}>{children}</NicknameContext.Provider>;
}

export function useNicknames() {
  const ctx = useContext(NicknameContext);
  if (!ctx) {
    throw new Error("useNicknames must be used within a NicknameProvider");
  }
  return ctx;
}

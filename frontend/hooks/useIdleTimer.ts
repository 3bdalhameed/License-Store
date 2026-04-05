"use client";
import { useEffect, useRef, useCallback } from "react";
import { refreshToken } from "@/lib/api";

const REFRESH_INTERVAL = 60 * 60 * 1000; // refresh token every 60 minutes

export function useIdleTimer() {
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }, []);

  const doRefresh = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await refreshToken();
      localStorage.setItem("token", res.data.token);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    refreshTimerRef.current = setInterval(doRefresh, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [doRefresh]);
}

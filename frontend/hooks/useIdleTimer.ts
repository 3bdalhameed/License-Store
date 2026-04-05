"use client";
import { useEffect, useRef, useCallback } from "react";
import { refreshToken } from "@/lib/api";

const IDLE_TIMEOUT    = 10 * 60 * 1000; // 10 minutes idle → logout (customers only)
const REFRESH_INTERVAL = 60 * 60 * 1000; // refresh token every 60 minutes

export function useIdleTimer(isAdmin = false) {
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(logout, IDLE_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    refreshTimerRef.current = setInterval(doRefresh, REFRESH_INTERVAL);

    if (!isAdmin) {
      const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;
      events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
      resetIdleTimer();

      return () => {
        events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      };
    }

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [isAdmin, doRefresh, resetIdleTimer]);
}

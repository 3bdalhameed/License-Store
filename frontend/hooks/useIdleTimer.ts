"use client";
import { useEffect, useRef, useCallback } from "react";
import { refreshToken } from "@/lib/api";

const IDLE_TIMEOUT = 5 * 60 * 1000;   // 5 minutes idle → logout
const REFRESH_INTERVAL = 4 * 60 * 1000; // refresh token every 4 minutes of activity

export function useIdleTimer() {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(logout, IDLE_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));

    resetIdleTimer();
    refreshTimerRef.current = setInterval(doRefresh, REFRESH_INTERVAL);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [resetIdleTimer, doRefresh]);
}

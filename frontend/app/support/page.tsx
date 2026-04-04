"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupportUser, setSupportUser } from "./auth";

export default function SupportEntry() {
  const router = useRouter();

  useEffect(() => {
    // 1. Valid support session → go directly
    const session = getSupportUser();
    if (session) {
      router.push(session.role === "ADMIN" ? "/support/admin" : "/support/employee");
      return;
    }
    // 2. Admin already logged in to main store → create support session automatically
    try {
      const token    = localStorage.getItem("token");
      const mainUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (token && mainUser?.role === "ADMIN") {
        setSupportUser({ id: mainUser.id, name: mainUser.name, role: "ADMIN" });
        router.push("/support/admin");
        return;
      }
    } catch { /* ignore */ }
    // 3. No session → support login
    router.push("/support/login");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Loader2 style={{ width: 36, height: 36, color: "#702dff", animation: "spin 1s linear infinite", margin: "0 auto 0.75rem" }} />
        <p style={{ fontFamily: "Tajawal, sans-serif", color: "#702dff", fontWeight: 700, fontSize: "1rem" }}>جارٍ التحميل…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

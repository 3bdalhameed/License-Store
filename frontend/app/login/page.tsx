"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      router.push(res.data.user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "بيانات غير صحيحة");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(135deg, #702dff, #9044ff)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <img src="/logo.png" alt="logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1rem", color: "#fff" }}>DIGITAL PLU+</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)" }}>ديجيتال بلس</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #702dff 0%, #9044ff 60%, #a77fff 100%)",
        padding: "3rem 2rem",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -100, right: -100 }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", bottom: -80, left: -60 }} />
        <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "2.25rem", fontWeight: 900, color: "#fff", textAlign: "center", position: "relative", zIndex: 1 }}>
          مرحباً في ديجيتال بلس
        </h1>
        <p style={{ color: "rgba(255,255,255,0.8)", marginTop: "0.5rem", fontSize: "1rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          سجّل الدخول للوصول إلى حسابك
        </p>
      </div>

      {/* Login card */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2.5rem 1.5rem" }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "2.25rem",
          width: "100%", maxWidth: 440,
          boxShadow: "0 8px 40px rgba(112,45,255,0.12)",
          border: "1px solid rgba(112,45,255,0.1)",
        }}>
          <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1.35rem", color: "#090040", marginBottom: "1.75rem", textAlign: "center" }}>
            تسجيل الدخول
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="example@email.com"
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "0.9rem", outline: "none", transition: "border-color 0.2s", color: "#111" }}
                onFocus={e => e.target.style.borderColor = "#702dff"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "0.9rem", outline: "none", transition: "border-color 0.2s", color: "#111" }}
                onFocus={e => e.target.style.borderColor = "#702dff"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
            {error && (
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: 10, fontSize: "0.875rem" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "0.9rem",
              background: loading ? "#a77fff" : "linear-gradient(135deg, #702dff, #9044ff)",
              border: "none", borderRadius: 12, color: "#fff",
              fontFamily: "Tajawal, sans-serif", fontSize: "1rem", fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              boxShadow: "0 4px 20px rgba(112,45,255,0.35)", transition: "opacity 0.2s",
              marginTop: "0.25rem",
            }}>
              {loading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
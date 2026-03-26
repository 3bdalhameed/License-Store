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
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #702dff, #9044ff)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="Digital Plus"
            style={{ height: 46, width: "auto", objectFit: "contain" }}
          />
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 60%, #a77fff 100%)", padding: "2rem 1.25rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -100, right: -80, pointerEvents: "none" }} />
        <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 900, color: "#fff", textAlign: "center", position: "relative", zIndex: 1 }}>
          مرحباً في ديجيتال بلس
        </h1>
        <p style={{ color: "rgba(255,255,255,0.8)", marginTop: "0.4rem", fontSize: "0.9rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          سجّل الدخول للوصول إلى حسابك
        </p>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem 1rem" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "1.75rem 1.25rem", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(112,45,255,0.12)", border: "1px solid rgba(112,45,255,0.1)" }}>
          <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "#090040", marginBottom: "1.5rem", textAlign: "center" }}>
            تسجيل الدخول
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} required placeholder="example@email.com"
                style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif" }}
                onFocus={e => e.target.style.borderColor = "#702dff"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif" }}
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
              width: "100%", padding: "1rem",
              background: loading ? "#a77fff" : "linear-gradient(135deg, #702dff, #9044ff)",
              border: "none", borderRadius: 12, color: "#fff",
              fontFamily: "Tajawal, sans-serif", fontSize: "1.05rem", fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              boxShadow: "0 4px 20px rgba(112,45,255,0.35)", marginTop: "0.25rem",
            }}>
              {loading && <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />}
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.25rem", fontSize: "0.875rem" }}>
            <a href="/forgot-password" style={{ color: "#702dff", fontWeight: 600, textDecoration: "none" }}>نسيت كلمة المرور؟</a>
            <a href="/register" style={{ color: "#702dff", fontWeight: 600, textDecoration: "none" }}>إنشاء حساب جديد</a>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
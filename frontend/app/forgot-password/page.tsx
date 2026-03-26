"use client";
import { useState, FormEvent } from "react";
import { forgotPassword } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg, #702dff, #9044ff)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src="/logo.png" alt="Digital Plus" style={{ height: 46, width: "auto", objectFit: "contain" }} />
      </div>

      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 60%, #a77fff 100%)", padding: "2rem 1.25rem" }}>
        <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "clamp(1.4rem, 5vw, 1.8rem)", fontWeight: 900, color: "#fff", textAlign: "center" }}>
          نسيت كلمة المرور؟
        </h1>
        <p style={{ color: "rgba(255,255,255,0.8)", marginTop: "0.4rem", fontSize: "0.9rem", textAlign: "center" }}>
          أدخل بريدك وسنرسل لك رابط إعادة التعيين
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem 1rem" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "1.75rem 1.25rem", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(112,45,255,0.12)", border: "1px solid rgba(112,45,255,0.1)" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
              <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "#090040", marginBottom: "0.75rem" }}>تم الإرسال!</h2>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7 }}>إذا كان البريد مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور خلال دقائق.</p>
              <a href="/login" style={{ display: "block", marginTop: "1.5rem", padding: "0.9rem", background: "linear-gradient(135deg, #702dff, #9044ff)", borderRadius: 12, color: "#fff", fontFamily: "Tajawal, sans-serif", fontSize: "1rem", fontWeight: 800, textDecoration: "none", textAlign: "center" }}>
                العودة لتسجيل الدخول
              </a>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "#090040", marginBottom: "1.5rem", textAlign: "center" }}>
                إعادة تعيين كلمة المرور
              </h2>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>البريد الإلكتروني</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} required placeholder="example@email.com"
                    style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif", boxSizing: "border-box" as const }}
                    onFocus={e => e.target.style.borderColor = "#702dff"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                {error && (
                  <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: 10, fontSize: "0.875rem" }}>{error}</div>
                )}
                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "1rem",
                  background: loading ? "#a77fff" : "linear-gradient(135deg, #702dff, #9044ff)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontFamily: "Tajawal, sans-serif", fontSize: "1.05rem", fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  boxShadow: "0 4px 20px rgba(112,45,255,0.35)",
                }}>
                  {loading && <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />}
                  {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                </button>
              </form>
              <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "#6b7280" }}>
                <a href="/login" style={{ color: "#702dff", fontWeight: 700, textDecoration: "none" }}>العودة لتسجيل الدخول</a>
              </p>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

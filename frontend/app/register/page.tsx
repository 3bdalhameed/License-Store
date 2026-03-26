"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { Loader2 } from "lucide-react";

function getPasswordStrength(p: string) {
  return [
    { label: "8 أحرف على الأقل", ok: p.length >= 8 },
    { label: "حرف كبير (A-Z)", ok: /[A-Z]/.test(p) },
    { label: "حرف صغير (a-z)", ok: /[a-z]/.test(p) },
    { label: "رقم (0-9)", ok: /[0-9]/.test(p) },
    { label: "رمز خاص (!@#...)", ok: /[^A-Za-z0-9]/.test(p) },
  ];
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showStrength, setShowStrength] = useState(false);
  const strength = getPasswordStrength(password);
  const isPasswordValid = strength.every(r => r.ok);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) { setError("كلمة المرور لا تستوفي متطلبات الأمان"); return; }
    setError(""); setLoading(true);
    try {
      await register(name, email, password, phone || undefined, storeLink);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "حدث خطأ، حاول مجدداً");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg, #702dff, #9044ff)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src="/logo.png" alt="Digital Plus" style={{ height: 46, width: "auto", objectFit: "contain" }} />
      </div>

      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 60%, #a77fff 100%)", padding: "2rem 1.25rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -100, right: -80, pointerEvents: "none" }} />
        <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 900, color: "#fff", textAlign: "center", position: "relative", zIndex: 1 }}>
          إنشاء حساب جديد
        </h1>
        <p style={{ color: "rgba(255,255,255,0.8)", marginTop: "0.4rem", fontSize: "0.9rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          سيتم مراجعة طلبك من قِبل الإدارة
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem 1rem" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "1.75rem 1.25rem", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(112,45,255,0.12)", border: "1px solid rgba(112,45,255,0.1)" }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
              <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "#090040", marginBottom: "0.75rem" }}>تم إرسال طلبك!</h2>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7 }}>سيتم مراجعة طلبك من قِبل الإدارة وستصلك رسالة على بريدك الإلكتروني عند القبول.</p>
              <button onClick={() => router.push("/login")} style={{ marginTop: "1.5rem", width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 12, color: "#fff", fontFamily: "Tajawal, sans-serif", fontSize: "1rem", fontWeight: 800, cursor: "pointer" }}>
                العودة لتسجيل الدخول
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "#090040", marginBottom: "1.5rem", textAlign: "center" }}>
                طلب تسجيل
              </h2>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>الاسم الكامل</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="محمد أحمد"
                    style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif", boxSizing: "border-box" as const }}
                    onFocus={e => e.target.style.borderColor = "#702dff"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>البريد الإلكتروني</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="example@email.com"
                    style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif", boxSizing: "border-box" as const }}
                    onFocus={e => e.target.style.borderColor = "#702dff"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>كلمة المرور</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={8}
                    style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif", boxSizing: "border-box" as const }}
                    onFocus={e => { e.target.style.borderColor = "#702dff"; setShowStrength(true); }}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                  {showStrength && password.length > 0 && (
                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {strength.map(r => (
                        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: r.ok ? "#16a34a" : "#9ca3af" }}>
                          <span>{r.ok ? "✓" : "○"}</span>
                          <span>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>رقم الهاتف / واتساب</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+962700000000"
                    style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", outline: "none", color: "#111", fontFamily: "monospace", boxSizing: "border-box" as const, direction: "ltr", textAlign: "left" as const }}
                    onFocus={e => e.target.style.borderColor = "#702dff"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>رابط متجرك</label>
                  <input type="url" value={storeLink} onChange={e => setStoreLink(e.target.value)} required placeholder="https://yourstore.com"
                    style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "0.9rem", outline: "none", color: "#111", fontFamily: "monospace", boxSizing: "border-box" as const, direction: "ltr", textAlign: "left" as const }}
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
                  {loading ? "جاري الإرسال..." : "إرسال طلب التسجيل"}
                </button>
              </form>
              <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "#6b7280" }}>
                لديك حساب؟{" "}
                <a href="/login" style={{ color: "#702dff", fontWeight: 700, textDecoration: "none" }}>تسجيل الدخول</a>
              </p>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

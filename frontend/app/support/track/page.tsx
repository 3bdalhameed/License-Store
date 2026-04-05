"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";

const PURPLE = "#702dff";
const API    = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string; step: number }> = {
  NEW:                      { label: "جديد — قيد الاستلام",       color: "#2563eb", bg: "#eff6ff", border: "#93c5fd",  icon: "🔵", step: 1 },
  UNDER_REVIEW:             { label: "قيد المراجعة",               color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",  icon: "🔍", step: 2 },
  ADDITIONAL_INFO_REQUIRED: { label: "يحتاج معلومات إضافية",       color: "#d97706", bg: "#fffbeb", border: "#fcd34d",  icon: "❓", step: 2 },
  IN_PROGRESS:              { label: "جارٍ المعالجة",              color: "#ea580c", bg: "#fff7ed", border: "#fdba74",  icon: "⚙️", step: 3 },
  RESOLVED:                 { label: "تم الحل",                    color: "#16a34a", bg: "#f0fdf4", border: "#86efac",  icon: "✅", step: 4 },
  CLOSED:                   { label: "مغلق",                       color: "#4b5563", bg: "#f9fafb", border: "#d1d5db",  icon: "🔒", step: 4 },
  CANCELLED:                { label: "ملغي",                       color: "#9ca3af", bg: "#f3f4f6", border: "#e5e7eb",  icon: "❌", step: 0 },
};

const CATEGORY_LABELS: Record<string, string> = {
  ACTIVATION:           "مشكلة تفعيل",
  LOGIN:                "مشكلة تسجيل دخول",
  INVITATION:           "مشكلة دعوة",
  EXPIRED_SUBSCRIPTION: "اشتراك منتهٍ",
  TECHNICAL:            "مشكلة تقنية",
  OTHER:                "أخرى",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1)    return "الآن";
  if (diff < 60)   return `منذ ${Math.floor(diff)} دقيقة`;
  if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
  if (diff < 10080) return `منذ ${Math.floor(diff / 1440)} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

const STEPS = [
  { label: "تم الاستلام",  icon: "📥" },
  { label: "قيد المراجعة", icon: "🔍" },
  { label: "جارٍ الحل",    icon: "⚙️" },
  { label: "تم الحل",      icon: "✅" },
];

export default function TrackPage() {
  const router = useRouter();
  const [ticketId, setTicketId]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [ticket, setTicket]       = useState<any>(null);
  const [error, setError]         = useState("");

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = ticketId.trim().toUpperCase();
    if (!id) return;
    setLoading(true); setError(""); setTicket(null);
    try {
      const res = await axios.get(`${API}/api/support/public/${id}`);
      setTicket(res.data);
    } catch (err: any) {
      setError(err.response?.status === 404
        ? "لم يتم العثور على تذكرة بهذا الرقم"
        : "حدث خطأ، يرجى المحاولة مجدداً"
      );
    } finally {
      setLoading(false);
    }
  };

  const cfg    = ticket ? STATUS_CONFIG[ticket.status] : null;
  const isResolved = ticket?.status === "RESOLVED";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Navbar */}
      <nav style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, padding: "0 1.25rem", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 16px rgba(112,45,255,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/logo.png" alt="logo" style={{ height: 40, width: "auto", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
          <span style={{ color: "#fff", fontWeight: 900, fontSize: "1rem" }}>تتبع تذكرتك</span>
        </div>
        <button onClick={() => router.push("/")}
          style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.9rem", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <ArrowRight style={{ width: 14, height: 14 }} /> الرئيسية
        </button>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${PURPLE},#9044ff)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", boxShadow: "0 8px 24px rgba(112,45,255,.3)", fontSize: "2rem" }}>🎫</div>
          <h1 style={{ fontWeight: 900, fontSize: "1.5rem", color: "#090040", margin: "0 0 0.4rem" }}>تتبع حالة طلبك</h1>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>أدخل رقم التذكرة الذي أرسله لك فريق الدعم</p>
        </div>

        {/* Search box */}
        <form onSubmit={search} style={{ background: "#fff", borderRadius: 18, padding: "1.5rem", border: "1px solid rgba(112,45,255,.12)", boxShadow: "0 4px 24px rgba(112,45,255,.1)", marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#374151", marginBottom: "0.6rem" }}>
            رقم التذكرة
          </label>
          <div style={{ display: "flex", gap: "0.65rem" }}>
            <input
              value={ticketId}
              onChange={e => setTicketId(e.target.value)}
              placeholder="مثال: TKT-2025-0001"
              style={{ flex: 1, padding: "0.75rem 1rem", background: "#f9f9ff", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "1rem", fontFamily: "monospace", direction: "ltr", outline: "none", color: "#090040" }}
            />
            <button type="submit" disabled={loading || !ticketId.trim()}
              style={{ background: ticketId.trim() ? `linear-gradient(135deg,${PURPLE},#9044ff)` : "#e5e7eb", border: "none", borderRadius: 12, padding: "0.75rem 1.4rem", color: ticketId.trim() ? "#fff" : "#9ca3af", cursor: ticketId.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem", boxShadow: ticketId.trim() ? "0 4px 14px rgba(112,45,255,.35)" : "none", transition: "all .15s" }}>
              {loading ? <Loader2 style={{ width: 17, height: 17, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 17, height: 17 }} />}
              بحث
            </button>
          </div>
          {error && (
            <div style={{ marginTop: "0.85rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "0.6rem 0.9rem", color: "#dc2626", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {error}
            </div>
          )}
        </form>

        {/* Ticket result */}
        {ticket && cfg && (
          <div style={{ animation: "fadeUp .3s ease both" }}>

            {/* Status hero card */}
            <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 18, padding: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{cfg.icon}</div>
              <div style={{ fontWeight: 900, fontSize: "1.2rem", color: cfg.color, marginBottom: "0.25rem" }}>{cfg.label}</div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>آخر تحديث: {formatRelative(ticket.updatedAt)}</div>

              {/* Customer notified banner */}
              {isResolved && ticket.customerNotified && (
                <div style={{ marginTop: "1rem", background: "#dcfce7", border: "1.5px solid #86efac", borderRadius: 12, padding: "0.65rem 1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <CheckCircle2 style={{ width: 17, height: 17, color: "#16a34a" }} />
                  <span style={{ fontWeight: 700, color: "#15803d", fontSize: "0.88rem" }}>تم إبلاغك بحل المشكلة ✓</span>
                </div>
              )}
              {isResolved && !ticket.customerNotified && (
                <div style={{ marginTop: "1rem", background: "#fefce8", border: "1.5px solid #fde047", borderRadius: 12, padding: "0.65rem 1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <Clock style={{ width: 17, height: 17, color: "#ca8a04" }} />
                  <span style={{ fontWeight: 700, color: "#92400e", fontSize: "0.88rem" }}>سيتم التواصل معك قريباً</span>
                </div>
              )}
            </div>

            {/* Progress steps */}
            {ticket.status !== "CANCELLED" && (
              <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", marginBottom: "1rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                  {/* connector line */}
                  <div style={{ position: "absolute", top: 20, right: "12.5%", left: "12.5%", height: 2, background: "#e5e7eb", zIndex: 0 }} />
                  <div style={{ position: "absolute", top: 20, right: "12.5%", width: `${Math.min(((cfg.step - 1) / 3) * 75, 75)}%`, height: 2, background: `linear-gradient(to left,${PURPLE},#9044ff)`, zIndex: 1, transition: "width .4s ease" }} />
                  {STEPS.map((s, i) => {
                    const done    = cfg.step > i + 1;
                    const active  = cfg.step === i + 1;
                    return (
                      <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem", zIndex: 2, flex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: done ? PURPLE : active ? "#fff" : "#f3f4f6", border: `2.5px solid ${done || active ? PURPLE : "#e5e7eb"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", boxShadow: active ? `0 0 0 4px rgba(112,45,255,.15)` : "none", transition: "all .3s" }}>
                          {done ? <span style={{ color: "#fff", fontSize: "0.85rem" }}>✓</span> : s.icon}
                        </div>
                        <span style={{ fontSize: "0.68rem", fontWeight: active || done ? 700 : 400, color: active ? PURPLE : done ? "#374151" : "#9ca3af", textAlign: "center" }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ticket info */}
            <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", marginBottom: "1rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#090040", marginBottom: "0.85rem", paddingBottom: "0.55rem", borderBottom: "1px solid #f3f4f6" }}>
                📋 تفاصيل الطلب
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                {[
                  { label: "رقم التذكرة",       value: ticket.id,                        mono: true },
                  { label: "رقم الطلب",          value: ticket.requestNumber,             mono: true },
                  { label: "المنتج / الاشتراك",  value: ticket.productType },
                  { label: "نوع المشكلة",        value: CATEGORY_LABELS[ticket.category] || ticket.category },
                  { label: "تاريخ الفتح",        value: formatDate(ticket.createdAt) },
                  { label: "آخر تحديث",          value: formatDate(ticket.updatedAt) },
                ].map(({ label, value, mono }) => (
                  <div key={label} style={{ background: "#f9f9ff", borderRadius: 10, padding: "0.6rem 0.8rem", border: "1px solid #f0f0f5" }}>
                    <div style={{ fontSize: "0.68rem", color: "#9ca3af", fontWeight: 600, marginBottom: "0.2rem" }}>{label}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#090040", fontFamily: mono ? "monospace" : "Tajawal,sans-serif", direction: mono ? "ltr" : undefined }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Public activity & messages */}
            {(ticket.comments.length > 0 || ticket.activityLog.length > 0) && (
              <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#090040", marginBottom: "0.85rem", paddingBottom: "0.55rem", borderBottom: "1px solid #f3f4f6" }}>
                  💬 تحديثات الطلب
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {[
                    ...ticket.comments.map((c: any) => ({ kind: "comment", data: c, date: c.createdAt })),
                    ...ticket.activityLog.map((a: any) => ({ kind: "activity", data: a, date: a.createdAt })),
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((item: any, i: number) => {
                      if (item.kind === "activity") {
                        const a = item.data;
                        return (
                          <div key={`a-${i}`} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.5rem 0", borderBottom: "1px solid #f9f9ff" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f5f4ff", border: "1.5px solid rgba(112,45,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem" }}>🛡️</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 600 }}>{a.action}</div>
                              {a.details && (
                                <div style={{ marginTop: "0.3rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,.15)", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>
                                  {a.details}
                                </div>
                              )}
                              <div style={{ fontSize: "0.67rem", color: "#9ca3af", marginTop: "0.2rem" }}>{formatRelative(a.createdAt)}</div>
                            </div>
                          </div>
                        );
                      }
                      const c = item.data;
                      const byAdmin = c.authorRole === "admin";
                      return (
                        <div key={`c-${i}`} style={{ background: byAdmin ? "#f5f4ff" : "#f0fff4", border: `1.5px solid ${byAdmin ? "rgba(112,45,255,.2)" : "#bbf7d0"}`, borderRadius: 12, padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.45rem" }}>
                            <span style={{ fontSize: "0.85rem" }}>{byAdmin ? "🛡️" : "👤"}</span>
                            <span style={{ fontWeight: 800, fontSize: "0.8rem", color: byAdmin ? PURPLE : "#15803d" }}>{byAdmin ? "فريق الدعم" : c.authorName}</span>
                            <span style={{ marginRight: "auto", fontSize: "0.67rem", color: "#9ca3af" }}>{formatRelative(c.createdAt)}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.88rem", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{c.content}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

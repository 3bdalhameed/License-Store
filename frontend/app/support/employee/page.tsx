"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Loader2, LogOut, RefreshCw } from "lucide-react";
import { Ticket, TicketStatus, STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../types";
import { getSupportUser, clearSupportSession } from "../auth";
import { getSupportTickets } from "@/lib/api";

const PURPLE = "#702dff";

function StatusBadge({ status }: { status: TicketStatus }) {
  const c = STATUS_CONFIG[status];
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 20, padding: "0.2rem 0.65rem", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{c.icon} {c.label}</span>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 60) return `منذ ${Math.floor(diff)} دقيقة`;
  if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

export default function EmployeePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; id: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "ALL">("ALL");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const s = getSupportUser();
    if (!s) { router.push("/support/login"); return; }
    // Employees need support_token; admins use main token
    if (s.role !== "ADMIN" && !localStorage.getItem("support_token")) {
      clearSupportSession();
      router.push("/support/login");
      return;
    }
    setUser({ name: s.name, role: s.role, id: s.id });
    getSupportTickets().then(r => setTickets(r.data)).catch(() => {});
  }, []);

  const reload = () => getSupportTickets().then(r => setTickets(r.data)).catch(() => {});

  // Backend already filters by employeeId for employees; admin gets all
  const myTickets = tickets;

  const filtered = useMemo(() => {
    let list = [...myTickets];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.requestNumber.toLowerCase().includes(q) ||
        t.activationEmail.toLowerCase().includes(q) ||
        t.productType.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "ALL") list = list.filter(t => t.status === filterStatus);
    return list;
  }, [myTickets, search, filterStatus]);

  const stats = useMemo(() => ({
    open: myTickets.filter(t => !["CLOSED", "CANCELLED"].includes(t.status)).length,
    needsInfo: myTickets.filter(t => t.status === "ADDITIONAL_INFO_REQUIRED").length,
    resolved: myTickets.filter(t => t.status === "RESOLVED").length,
    notNotified: myTickets.filter(t => t.status === "RESOLVED" && !t.customerNotified).length,
  }), [myTickets]);

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 style={{ width: 32, height: 32, color: PURPLE, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" };
  const inp: React.CSSProperties = { width: "100%", padding: "0.6rem 0.85rem", background: "#f9f9ff", border: "1.5px solid #e5e7eb", borderRadius: 10, color: "#111", fontSize: "0.85rem", outline: "none", fontFamily: "Tajawal,sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", paddingBottom: "3rem" }}>
      {/* Navbar */}
      <nav style={{ background: "linear-gradient(135deg,#702dff,#9044ff)", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.25rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 16px rgba(112,45,255,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 104, height: 34, borderRadius: 10, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="logo" style={{ height: 36, width: "auto", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
          </div>
          <div>
            <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "0.95rem", color: "#fff", lineHeight: 1.1 }}>نظام دعم العملاء</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,.7)" }}>مرحباً {user.name.split(" ")[0]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {user.role === "ADMIN" && (
            <button onClick={() => router.push("/support/admin")} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.75rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
              لوحة الإدارة
            </button>
          )}
          <button onClick={() => router.push(user.role === "ADMIN" ? "/admin" : "/dashboard")} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.75rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
            {user.role === "ADMIN" ? "المتجر" : "حسابي"}
          </button>
          <button onClick={() => { clearSupportSession(); router.push("/support/login"); }}
            style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.65rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1.35rem", color: "#090040" }}>تذاكري</h1>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", fontFamily: "Tajawal,sans-serif" }}>
              {user.role === "ADMIN" ? "عرض كل التذاكر" : `تذاكر ${user.name}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={reload} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "0.55rem 0.9rem", cursor: "pointer", color: "#374151", fontSize: "0.8rem", fontFamily: "Tajawal,sans-serif", fontWeight: 600 }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> تحديث
            </button>
            <button onClick={() => router.push("/support/tickets/new")} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "linear-gradient(135deg,#702dff,#9044ff)", border: "none", borderRadius: 10, padding: "0.55rem 1.1rem", cursor: "pointer", color: "#fff", fontSize: "0.85rem", fontFamily: "Tajawal,sans-serif", fontWeight: 700, boxShadow: "0 3px 12px rgba(112,45,255,.35)" }}>
              <Plus style={{ width: 15, height: 15 }} /> تذكرة جديدة
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            { label: "مفتوحة", value: stats.open,        icon: "📂", color: PURPLE,    bg: "#f5f4ff" },
            { label: "تحتاج ردًا", value: stats.needsInfo, icon: "❓", color: "#d97706", bg: "#fffbeb" },
            { label: "تم الحل",  value: stats.resolved,   icon: "✅", color: "#16a34a", bg: "#f0fdf4" },
            { label: "لم يُبلَّغ العميل", value: stats.notNotified, icon: "📣", color: "#dc2626", bg: "#fff5f5" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "0.9rem 1rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 8px rgba(112,45,255,.06)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#6b7280" }}>{s.label}</div>
                <div style={{ fontWeight: 900, fontSize: "1.5rem", color: s.value > 0 && (s.color === "#dc2626" || s.color === "#d97706") ? s.color : "#090040", lineHeight: 1.1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Needs info alert */}
        {stats.needsInfo > 0 && (
          <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "0.8rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.1rem" }}>❓</span>
            <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, color: "#92400e", fontSize: "0.88rem" }}>
              لديك {stats.needsInfo} {stats.needsInfo === 1 ? "تذكرة تحتاج" : "تذاكر تحتاج"} معلومات إضافية — يرجى الرد في أقرب وقت
            </span>
            <button onClick={() => setFilterStatus("ADDITIONAL_INFO_REQUIRED")} style={{ marginRight: "auto", background: "#d97706", border: "none", borderRadius: 8, padding: "0.3rem 0.8rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.75rem" }}>
              عرضها
            </button>
          </div>
        )}

        {/* Search + filter */}
        <div style={{ ...card, padding: "0.85rem 1rem", marginBottom: "1rem", display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ ...inp, paddingRight: "2.2rem" }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{ ...inp, width: "auto", minWidth: 140 }}>
            <option value="ALL">كل الحالات</option>
            {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        {/* Ticket cards */}
        {filtered.length === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎫</div>
            <p style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
              {myTickets.length === 0 ? "لا توجد تذاكر بعد — أنشئ أول تذكرة الآن" : "لا توجد نتائج للبحث"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {filtered.map(t => {
              const needsInfo = t.status === "ADDITIONAL_INFO_REQUIRED";
              const resolvedNoNotif = t.status === "RESOLVED" && !t.customerNotified;
              const infoRequest = t.comments.filter(c => c.isInfoRequest).slice(-1)[0];
              return (
                <div key={t.id} style={{ ...card, padding: "1rem 1.1rem", borderRight: `3.5px solid ${needsInfo ? "#d97706" : resolvedNoNotif ? "#dc2626" : STATUS_CONFIG[t.status].color}`, cursor: "pointer" }}
                  onClick={() => router.push(`/support/tickets/${t.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafaff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                        <code style={{ fontFamily: "monospace", fontSize: "0.75rem", color: PURPLE, fontWeight: 700, background: "#f5f4ff", padding: "0.1rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,.2)" }}>{t.id}</code>
                        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>رقم الطلب: <strong style={{ color: "#374151" }}>{t.requestNumber}</strong></span>
                        <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{CATEGORY_CONFIG[t.category].icon} {CATEGORY_CONFIG[t.category].label}</span>
                      </div>
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#090040", marginBottom: "0.2rem" }}>{t.activationEmail}</div>
                      {/* Product type — prominent badge */}
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "linear-gradient(135deg,#f5f4ff,#ede9fe)", border: "1.5px solid rgba(112,45,255,.25)", borderRadius: 8, padding: "0.2rem 0.6rem", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.7rem" }}>📦</span>
                        <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.78rem", color: "#702dff" }}>{t.productType}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{t.description}</div>

                      {/* Info request preview */}
                      {needsInfo && infoRequest && (
                        <div style={{ marginTop: "0.5rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "0.4rem 0.65rem", fontSize: "0.75rem", color: "#92400e", display: "flex", gap: "0.4rem" }}>
                          <span style={{ flexShrink: 0 }}>❓</span>
                          <span style={{ fontFamily: "Tajawal,sans-serif" }}>الإدارة تطلب: {infoRequest.content}</span>
                        </div>
                      )}

                      {resolvedNoNotif && (
                        <div style={{ marginTop: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.4rem 0.65rem", fontSize: "0.75rem", color: "#dc2626", fontFamily: "Tajawal,sans-serif", fontWeight: 700 }}>
                          ⚠️ تم حل التذكرة — يرجى إبلاغ العميل
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
                      <StatusBadge status={t.status} />
                      <span style={{ background: PRIORITY_CONFIG[t.priority].bg, color: PRIORITY_CONFIG[t.priority].color, border: `1px solid ${PRIORITY_CONFIG[t.priority].border}`, borderRadius: 20, padding: "0.15rem 0.5rem", fontSize: "0.65rem", fontWeight: 700 }}>
                        {PRIORITY_CONFIG[t.priority].label}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{formatDate(t.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

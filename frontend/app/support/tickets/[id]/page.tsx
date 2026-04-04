"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowRight, Copy, Check, Send, AlertCircle,
  X, Loader2, LogOut, ZoomIn,
} from "lucide-react";
import {
  Ticket, TicketStatus, TicketComment, ActivityLogEntry,
  STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG,
} from "../../types";
import { getSupportUser, clearSupportSession } from "../../auth";
import {
  getSupportTicket, updateSupportTicketStatus, addSupportComment, markSupportTicketNotified,
} from "@/lib/api";

const PURPLE = "#702dff";

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1)    return "الآن";
  if (diff < 60)   return `منذ ${Math.floor(diff)} دقيقة`;
  if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
  if (diff < 10080) return `منذ ${Math.floor(diff / 1440)} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status, large }: { status: TicketStatus; large?: boolean }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      borderRadius: 20, padding: large ? "0.3rem 0.9rem" : "0.2rem 0.65rem",
      fontSize: large ? "0.82rem" : "0.7rem", fontWeight: 700, whiteSpace: "nowrap",
      fontFamily: "Tajawal,sans-serif",
    }}>
      {c.icon} {c.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TicketDetailPage() {
  const router = useRouter();
  const { id: ticketId } = useParams<{ id: string }>();
  const [user, setUser]       = useState<{ name: string; role: string; id: string } | null>(null);
  const [ticket, setTicket]   = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Copy ticket ID
  const [copiedId, setCopiedId] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Admin: change status
  const [newStatus, setNewStatus]   = useState<TicketStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  // Comments
  const [commentText, setCommentText]           = useState("");
  const [infoRequestText, setInfoRequestText]   = useState("");
  const [showInfoForm, setShowInfoForm]         = useState(false);
  const [sendingComment, setSendingComment]     = useState(false);
  const [sendingInfo, setSendingInfo]           = useState(false);

  // Customer notified
  const [notifyConfirm, setNotifyConfirm]       = useState(false);
  const [notifyingCustomer, setNotifyingCustomer] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSupportUser();
    if (!s) { router.push("/support/login"); return; }
    setUser({ name: s.name, role: s.role, id: s.id });

    getSupportTicket(ticketId)
      .then(r => { setTicket(r.data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [ticketId]);

  const refresh = () => {
    getSupportTicket(ticketId).then(r => setTicket(r.data)).catch(() => {});
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const copyId = () => {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleStatusChange = async () => {
    if (!ticket || !user || !newStatus) return;
    setChangingStatus(true);
    try {
      const res = await updateSupportTicketStatus(ticket.id, newStatus, statusNote.trim() || undefined);
      setTicket(res.data); setNewStatus(""); setStatusNote("");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddComment = async (isAdminNote = false) => {
    if (!ticket || !user || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await addSupportComment(ticket.id, {
        content: commentText.trim(),
        isAdminNote,
        isInfoRequest: false,
      });
      setTicket(res.data); setCommentText("");
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } finally {
      setSendingComment(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!ticket || !user || !infoRequestText.trim()) return;
    setSendingInfo(true);
    try {
      const res = await addSupportComment(ticket.id, {
        content: infoRequestText.trim(),
        isAdminNote: false,
        isInfoRequest: true,
      });
      setTicket(res.data); setInfoRequestText(""); setShowInfoForm(false);
    } finally {
      setSendingInfo(false);
    }
  };

  const handleMarkNotified = async () => {
    if (!ticket || !user) return;
    setNotifyingCustomer(true);
    try {
      const res = await markSupportTicketNotified(ticket.id);
      setTicket(res.data); setNotifyConfirm(false);
    } finally {
      setNotifyingCustomer(false);
    }
  };

  // ── Loading / Not Found ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 style={{ width: 36, height: 36, color: PURPLE, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem" }}>
      <div style={{ fontSize: "3.5rem" }}>🎫</div>
      <h1 style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, color: "#090040", margin: 0 }}>التذكرة غير موجودة</h1>
      <p style={{ fontFamily: "Tajawal,sans-serif", color: "#6b7280", direction: "ltr" }}>{ticketId}</p>
      <button onClick={() => router.back()} style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 10, padding: "0.75rem 2rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
        العودة
      </button>
    </div>
  );

  if (!ticket || !user) return null;

  const isAdmin      = user.role === "ADMIN";
  const isNeedsInfo  = ticket.status === "ADDITIONAL_INFO_REQUIRED";
  const isResolved   = ticket.status === "RESOLVED";
  const notNotified  = isResolved && !ticket.customerNotified;
  const isClosed     = ["CLOSED", "CANCELLED"].includes(ticket.status);

  // ── Unified timeline (comments + activity, sorted by time) ───────────────
  type TLItem =
    | { kind: "comment";  data: TicketComment;      date: string }
    | { kind: "activity"; data: ActivityLogEntry;   date: string };

  const timeline: TLItem[] = [
    ...ticket.comments.map(c => ({ kind: "comment"  as const, data: c, date: c.createdAt })),
    ...ticket.activityLog.map(a => ({ kind: "activity" as const, data: a, date: a.createdAt })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── Style helpers ─────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16,
    border: "1px solid rgba(112,45,255,.1)",
    boxShadow: "0 2px 12px rgba(112,45,255,.07)",
  };
  const inp: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem",
    background: "#f9f9ff", border: "1.5px solid #e5e7eb",
    borderRadius: 10, color: "#111", fontSize: "0.85rem",
    outline: "none", fontFamily: "Tajawal,sans-serif",
    boxSizing: "border-box" as const,
  };
  const sec: React.CSSProperties = {
    fontFamily: "Tajawal,sans-serif", fontWeight: 800,
    fontSize: "0.9rem", color: "#090040",
    marginBottom: "0.9rem", paddingBottom: "0.55rem",
    borderBottom: "1px solid #f3f4f6",
    display: "flex", alignItems: "center", gap: "0.45rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", paddingBottom: "4rem" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .tl-card { animation: fadeIn .2s ease both }
        .img-thumb:hover .img-overlay { opacity: 1 !important }
        .img-thumb:hover { border-color: ${PURPLE} !important }
        @media (max-width: 768px) {
          .main-layout { flex-direction: column !important }
          .sidebar { width: 100% !important }
          .detail-grid { grid-template-columns: 1fr !important }
        }
      `}</style>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <img src={lightbox} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.5)" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: "1.25rem", left: "1.25rem", background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.3)", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <X style={{ width: 20, height: 20, color: "#fff" }} />
          </button>
        </div>
      )}

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.25rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 16px rgba(112,45,255,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
          <button onClick={() => router.back()}
            style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 8, padding: "0.35rem 0.7rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", fontFamily: "Tajawal,sans-serif", flexShrink: 0 }}>
            <ArrowRight style={{ width: 14, height: 14 }} /> رجوع
          </button>
          <img src="/logo.png" alt="logo" style={{ height: 34, width: "auto", objectFit: "contain", flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", overflow: "hidden" }}>
            <code style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#fff", fontWeight: 900, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{ticket.id}</code>
            <button onClick={copyId}
              style={{ background: "rgba(255,255,255,.15)", border: `1px solid ${copiedId ? "rgba(134,239,172,.5)" : "rgba(255,255,255,.28)"}`, borderRadius: 6, padding: "0.2rem 0.55rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", color: copiedId ? "#86efac" : "#fff", fontSize: "0.7rem", fontFamily: "Tajawal,sans-serif", flexShrink: 0 }}>
              {copiedId ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
              {copiedId ? "تم!" : "نسخ"}
            </button>
          </div>
          <div style={{ flexShrink: 0 }}><StatusBadge status={ticket.status} large /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          {isAdmin && (
            <button onClick={() => router.push("/support/admin")}
              style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 8, padding: "0.35rem 0.75rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
              لوحة الإدارة
            </button>
          )}
          <span style={{ color: "rgba(255,255,255,.85)", fontSize: "0.82rem", fontFamily: "Tajawal,sans-serif" }}>{user.name}</span>
          <button onClick={() => { clearSupportSession(); router.push("/support/login"); }}
            style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 8, padding: "0.35rem 0.6rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* ── Alert Banners ──────────────────────────────────────────────── */}
        {isNeedsInfo && (
          <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 14, padding: "0.9rem 1.1rem", marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>❓</span>
            <div>
              <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, color: "#92400e", fontSize: "0.9rem" }}>
                التذكرة تنتظر معلومات إضافية
              </div>
              <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", color: "#78350f", marginTop: "0.15rem" }}>
                {isAdmin
                  ? "بانتظار رد الموظف على طلب المعلومات المرسل"
                  : "يرجى إضافة المعلومات المطلوبة من الإدارة في قسم المحادثة أدناه"}
              </div>
            </div>
          </div>
        )}

        {notNotified && (
          <div style={{ background: "#fff5f5", border: "1.5px solid #fecaca", borderRadius: 14, padding: "0.9rem 1.1rem", marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <AlertCircle style={{ width: 20, height: 20, color: "#dc2626", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, color: "#dc2626", fontSize: "0.9rem" }}>
                ⚠️ تم حل التذكرة — لكن العميل لم يُبلَّغ بعد
              </div>
              <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", color: "#991b1b", marginTop: "0.15rem" }}>
                {isAdmin
                  ? "يُرجى التأكد من أن الموظف قام بإبلاغ العميل"
                  : "قم بإبلاغ العميل بحل مشكلته، ثم اضغط على زر 'تم إبلاغ العميل' أدناه"}
              </div>
            </div>
            {!isAdmin && !notifyConfirm && (
              <button onClick={() => setNotifyConfirm(true)}
                style={{ background: "#16a34a", border: "none", borderRadius: 9, padding: "0.5rem 1.1rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem", whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(22,163,74,.3)" }}>
                📣 تم إبلاغ العميل
              </button>
            )}
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="main-layout" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>

          {/* ──────────────── MAIN CONTENT ──────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Ticket Details */}
            <div style={{ ...card, padding: "1.25rem" }}>
              <div style={sec}>📋 تفاصيل التذكرة</div>
              <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {[
                  { label: "رقم الطلب",            value: ticket.requestNumber },
                  { label: "إيميل التفعيل",         value: ticket.activationEmail,    ltr: true },
                  { label: "المنتج / الاشتراك",     value: ticket.productType },
                  { label: "التواصل مع العميل",     value: ticket.customerContact || "—" },
                  { label: "الموظف المسؤول",        value: ticket.employeeName },
                  { label: "رقم المرجع الداخلي",    value: ticket.referenceNumber || "—" },
                ].map(({ label, value, ltr }) => (
                  <div key={label} style={{ background: "#f9f9ff", borderRadius: 10, padding: "0.65rem 0.85rem", border: "1px solid #f0f0f5" }}>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, marginBottom: "0.25rem" }}>{label}</div>
                    <div style={{ fontFamily: ltr ? "monospace" : "Tajawal,sans-serif", fontSize: "0.87rem", color: "#090040", fontWeight: 700, direction: ltr ? "ltr" : undefined, textAlign: ltr ? "left" : undefined }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Description */}
              <div style={{ marginBottom: ticket.internalNotes ? "0.85rem" : 0 }}>
                <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, marginBottom: "0.4rem" }}>وصف المشكلة</div>
                <div style={{ background: "#f9f9ff", borderRadius: 10, padding: "0.9rem 1rem", border: "1px solid #f0f0f5", fontFamily: "Tajawal,sans-serif", fontSize: "0.9rem", color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {ticket.description}
                </div>
              </div>
              {/* Internal notes */}
              {ticket.internalNotes && (
                <div>
                  <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, marginBottom: "0.4rem" }}>
                    📌 ملاحظات داخلية
                  </div>
                  <div style={{ background: "#fffbeb", borderRadius: 10, padding: "0.9rem 1rem", border: "1.5px solid #fde68a", fontFamily: "Tajawal,sans-serif", fontSize: "0.88rem", color: "#78350f", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {ticket.internalNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Images + Media Links */}
            {(ticket.attachments.length > 0 || (ticket.mediaLinks && ticket.mediaLinks.length > 0)) && (
              <div style={{ ...card, padding: "1.25rem" }}>
                <div style={sec}>
                  🖼️ الوسائط والمرفقات
                  <span style={{ fontWeight: 500, color: "#9ca3af", fontSize: "0.8rem" }}>
                    ({ticket.attachments.length + (ticket.mediaLinks?.length ?? 0)})
                  </span>
                </div>

                {/* Uploaded images */}
                {ticket.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: ticket.mediaLinks?.length ? "1rem" : 0 }}>
                    {ticket.attachments.map(a => (
                      <div key={a.id} className={a.dataUrl.startsWith("data:video/") ? undefined : "img-thumb"}
                        onClick={() => !a.dataUrl.startsWith("data:video/") && setLightbox(a.dataUrl)}
                        style={{ position: "relative", width: 100, height: 100, borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(112,45,255,.2)", cursor: a.dataUrl.startsWith("data:video/") ? "default" : "zoom-in", transition: "border-color .15s", background: "#000" }}>
                        {a.dataUrl.startsWith("data:video/")
                          ? <video src={a.dataUrl} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <img src={a.dataUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        }
                        <div className="img-overlay"
                          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}>
                          <ZoomIn style={{ width: 22, height: 22, color: "#fff" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Media links */}
                {ticket.mediaLinks && ticket.mediaLinks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {ticket.mediaLinks.map((url, i) => {
                      const isImg = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(url);
                      const isYt  = /youtube\.com|youtu\.be/i.test(url);
                      const icon  = isImg ? "🖼️" : isYt ? "▶️" : "🔗";
                      const label = isImg ? "صورة" : isYt ? "فيديو YouTube" : "رابط";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#f5f4ff", border: "1.5px solid rgba(112,45,255,.15)", borderRadius: 10, padding: "0.6rem 0.85rem" }}>
                          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.68rem", color: "#9ca3af", fontWeight: 600, fontFamily: "Tajawal,sans-serif" }}>{label}</div>
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: "0.78rem", color: PURPLE, direction: "ltr", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", fontWeight: 600 }}>
                              {url}
                            </a>
                          </div>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            style={{ background: PURPLE, border: "none", borderRadius: 7, padding: "0.35rem 0.7rem", color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                            فتح ↗
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Customer Notification Status — critical distinct section */}
            <div style={{ ...card, padding: "1.25rem", border: `2px solid ${ticket.status === "RESOLVED" ? (ticket.customerNotified ? "#86efac" : "#fecaca") : "rgba(112,45,255,.1)"}` }}>
              <div style={sec}>📣 حالة الحل وإبلاغ العميل</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {/* Resolved cell */}
                <div style={{ background: isResolved ? "#f0fdf4" : "#f9fafb", borderRadius: 12, padding: "1.1rem", border: `1.5px solid ${isResolved ? "#86efac" : "#e5e7eb"}`, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: isResolved ? "#dcfce7" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", flexShrink: 0 }}>
                    {isResolved ? "✅" : "⏳"}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600 }}>الحل التقني للمشكلة</div>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.92rem", color: isResolved ? "#16a34a" : "#6b7280", marginTop: "0.15rem" }}>
                      {isResolved ? "تم الحل ✓" : "لم يُحل بعد"}
                    </div>
                    {isResolved && (
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                        {formatRelative(ticket.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Notified cell */}
                <div style={{ background: ticket.customerNotified ? "#f0fdf4" : isResolved ? "#fff5f5" : "#f9fafb", borderRadius: 12, padding: "1.1rem", border: `1.5px solid ${ticket.customerNotified ? "#86efac" : isResolved ? "#fecaca" : "#e5e7eb"}`, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: ticket.customerNotified ? "#dcfce7" : isResolved ? "#fee2e2" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", flexShrink: 0 }}>
                    {ticket.customerNotified ? "📣" : isResolved ? "⚠️" : "—"}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600 }}>إبلاغ العميل</div>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.92rem", color: ticket.customerNotified ? "#16a34a" : isResolved ? "#dc2626" : "#6b7280", marginTop: "0.15rem" }}>
                      {ticket.customerNotified ? "تم الإبلاغ ✓" : isResolved ? "لم يُبلَّغ ⚠️" : "—"}
                    </div>
                    {ticket.customerNotified && ticket.customerNotifiedBy && (
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                        بواسطة: {ticket.customerNotifiedBy}
                        {ticket.customerNotifiedAt ? ` · ${formatRelative(ticket.customerNotifiedAt)}` : ""}
                      </div>
                    )}
                    {ticket.customerNotified && ticket.customerNotifiedAt && (
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.66rem", color: "#9ca3af" }}>
                        {formatFull(ticket.customerNotifiedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Employee action: Mark customer notified */}
              {!isAdmin && isResolved && !ticket.customerNotified && (
                <div style={{ marginTop: "1rem" }}>
                  {!notifyConfirm ? (
                    <button onClick={() => setNotifyConfirm(true)}
                      style={{ width: "100%", background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 11, padding: "0.85rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.92rem", boxShadow: "0 4px 16px rgba(22,163,74,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      📣 تم إبلاغ العميل بحل المشكلة
                    </button>
                  ) : (
                    <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "1rem" }}>
                      <p style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, color: "#15803d", fontSize: "0.88rem", marginBottom: "0.85rem", textAlign: "center" }}>
                        هل تأكدت فعلاً من إبلاغ العميل بحل المشكلة؟
                      </p>
                      <div style={{ display: "flex", gap: "0.65rem" }}>
                        <button onClick={handleMarkNotified} disabled={notifyingCustomer}
                          style={{ flex: 1, background: "#16a34a", border: "none", borderRadius: 9, padding: "0.65rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.88rem" }}>
                          {notifyingCustomer ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", margin: "0 auto" }} /> : "✓ نعم، تم الإبلاغ"}
                        </button>
                        <button onClick={() => setNotifyConfirm(false)}
                          style={{ flex: 1, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "0.65rem", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#374151" }}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin: note that resolved ≠ notified */}
              {isAdmin && isResolved && !ticket.customerNotified && (
                <div style={{ marginTop: "0.85rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "0.65rem 0.85rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", color: "#991b1b", fontWeight: 600 }}>
                  ⚠️ التذكرة محلولة تقنياً لكن العميل لم يُبلَّغ بعد — انتظر إجراء الموظف
                </div>
              )}
            </div>

            {/* Comments & Activity Thread */}
            <div style={{ ...card, padding: "1.25rem" }}>
              <div style={sec}>💬 المحادثة وسجل النشاط</div>

              {/* Timeline */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
                {timeline.length === 0 && (
                  <div style={{ textAlign: "center", color: "#9ca3af", fontFamily: "Tajawal,sans-serif", padding: "2rem", fontSize: "0.88rem" }}>
                    لا توجد تعليقات أو نشاطات بعد
                  </div>
                )}
                {timeline.map((item, idx) => {
                  if (item.kind === "activity") {
                    const a = item.data;
                    const adm = a.performedByRole === "admin";
                    return (
                      <div key={`a-${a.id}-${idx}`} className="tl-card" style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: adm ? "#f5f4ff" : "#f0fdf4", border: `1.5px solid ${adm ? "rgba(112,45,255,.25)" : "#86efac"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.15rem", fontSize: "0.65rem" }}>
                          {adm ? "🛡️" : "👤"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.78rem", color: "#374151" }}>{a.performedBy}</span>
                            <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#6b7280" }}>{a.action}</span>
                            <span style={{ marginRight: "auto", fontSize: "0.67rem", color: "#9ca3af", whiteSpace: "nowrap" }} title={formatFull(a.createdAt)}>{formatRelative(a.createdAt)}</span>
                          </div>
                          {a.details && (
                            <div style={{ marginTop: "0.25rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#6b7280", background: "#f9f9ff", borderRadius: 7, padding: "0.3rem 0.6rem", border: "1px solid #f0f0f5" }}>
                              {a.details}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Comment
                  const c = item.data;
                  const isInfoReq = c.isInfoRequest;
                  const isNote    = c.isAdminNote;
                  const byAdmin   = c.authorRole === "admin";

                  const bgColor     = isInfoReq ? "#fffbeb" : isNote ? "#f5f4ff" : byAdmin ? "#fafafa" : "#f0fff4";
                  const borderColor = isInfoReq ? "#fcd34d" : isNote ? "rgba(112,45,255,.25)" : byAdmin ? "#e5e7eb" : "#bbf7d0";
                  const badgeText   = isInfoReq ? "طلب معلومات إضافية" : isNote ? "ملاحظة داخلية" : byAdmin ? "الإدارة" : "موظف";
                  const badgeBg     = isInfoReq ? "#fef3c7" : isNote ? "#ede9fe" : byAdmin ? "#f3f4f6" : "#dcfce7";
                  const badgeColor  = isInfoReq ? "#92400e" : isNote ? PURPLE : byAdmin ? "#374151" : "#15803d";
                  const icon        = isInfoReq ? "❓" : isNote ? "📌" : byAdmin ? "🛡️" : "👤";

                  return (
                    <div key={`c-${c.id}-${idx}`} className="tl-card"
                      style={{ background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.55rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.9rem" }}>{icon}</span>
                        <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.82rem", color: "#090040" }}>{c.authorName}</span>
                        <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.69rem", color: badgeColor, background: badgeBg, borderRadius: 20, padding: "0.1rem 0.55rem", fontWeight: 700 }}>
                          {badgeText}
                        </span>
                        <span style={{ marginRight: "auto", fontSize: "0.68rem", color: "#9ca3af", whiteSpace: "nowrap" }} title={formatFull(c.createdAt)}>
                          {formatRelative(c.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.88rem", color: isInfoReq ? "#78350f" : "#374151", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>
                        {c.content}
                      </p>
                      {isInfoReq && (
                        <div style={{ marginTop: "0.55rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.73rem", color: "#92400e", fontWeight: 600 }}>
                          ↳ هذا الطلب يستوجب ردًا من الموظف
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              {/* Input area — Admin */}
              {isAdmin && !isClosed && (
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                  {!showInfoForm ? (
                    <>
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="أضف ملاحظة داخلية أو تعليقاً..."
                        rows={3}
                        style={{ ...inp, resize: "vertical" }}
                      />
                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.65rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button onClick={() => setShowInfoForm(true)}
                          style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 9, padding: "0.5rem 1rem", cursor: "pointer", color: "#92400e", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          ❓ طلب معلومات إضافية
                        </button>
                        <button
                          onClick={() => handleAddComment(true)}
                          disabled={!commentText.trim() || sendingComment}
                          style={{ background: commentText.trim() ? `linear-gradient(135deg,${PURPLE},#9044ff)` : "#e5e7eb", border: "none", borderRadius: 9, padding: "0.5rem 1.1rem", cursor: commentText.trim() ? "pointer" : "not-allowed", color: commentText.trim() ? "#fff" : "#9ca3af", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {sendingComment ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
                          إضافة ملاحظة
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "1.1rem" }}>
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, color: "#92400e", fontSize: "0.9rem", marginBottom: "0.7rem" }}>
                        ❓ طلب معلومات إضافية من الموظف
                      </div>
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", color: "#78350f", marginBottom: "0.65rem" }}>
                        اكتب بوضوح ما تحتاجه — ستتغير حالة التذكرة تلقائياً إلى "يحتاج معلومات إضافية"
                      </div>
                      <textarea
                        value={infoRequestText}
                        onChange={e => setInfoRequestText(e.target.value)}
                        placeholder="مثال: نحتاج لقطة شاشة واضحة لرسالة الخطأ، وتأكيد الإيميل المستخدم بالضبط، واسم المتصفح..."
                        rows={4}
                        style={{ ...inp, borderColor: "#fcd34d", background: "#fff", resize: "vertical" }}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.7rem", justifyContent: "flex-end" }}>
                        <button onClick={() => { setShowInfoForm(false); setInfoRequestText(""); }}
                          style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "0.5rem 0.9rem", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "#374151" }}>
                          إلغاء
                        </button>
                        <button
                          onClick={handleRequestInfo}
                          disabled={!infoRequestText.trim() || sendingInfo}
                          style={{ background: infoRequestText.trim() ? "#d97706" : "#e5e7eb", border: "none", borderRadius: 9, padding: "0.5rem 1.25rem", cursor: infoRequestText.trim() ? "pointer" : "not-allowed", color: infoRequestText.trim() ? "#fff" : "#9ca3af", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {sendingInfo ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : "❓ إرسال الطلب وتحديث الحالة"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input area — Employee */}
              {!isAdmin && !isClosed && (
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                  {isNeedsInfo && (
                    <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 9, padding: "0.55rem 0.8rem", marginBottom: "0.65rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", color: "#92400e", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      ⬇️ قدّم المعلومات المطلوبة من الإدارة هنا
                    </div>
                  )}
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={isNeedsInfo ? "أدخل المعلومات المطلوبة هنا..." : "أضف تعليقاً أو معلومة..."}
                    rows={3}
                    style={{ ...inp, resize: "vertical", borderColor: isNeedsInfo ? "#fcd34d" : "#e5e7eb" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.65rem" }}>
                    <button
                      onClick={() => handleAddComment(false)}
                      disabled={!commentText.trim() || sendingComment}
                      style={{ background: commentText.trim() ? (isNeedsInfo ? "#d97706" : `linear-gradient(135deg,${PURPLE},#9044ff)`) : "#e5e7eb", border: "none", borderRadius: 9, padding: "0.55rem 1.25rem", cursor: commentText.trim() ? "pointer" : "not-allowed", color: commentText.trim() ? "#fff" : "#9ca3af", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {sendingComment ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
                      {isNeedsInfo ? "إرسال المعلومات المطلوبة" : "إرسال التعليق"}
                    </button>
                  </div>
                </div>
              )}

              {isClosed && (
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem", textAlign: "center", fontFamily: "Tajawal,sans-serif", fontSize: "0.82rem", color: "#9ca3af" }}>
                  🔒 هذه التذكرة {ticket.status === "CANCELLED" ? "ملغاة" : "مغلقة"} — لا يمكن إضافة تعليقات
                </div>
              )}
            </div>
          </div>

          {/* ──────────────── SIDEBAR ───────────────────────────────────── */}
          <div className="sidebar" style={{ width: 285, flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Metadata Card */}
            <div style={{ ...card, padding: "1.1rem" }}>
              <div style={{ ...sec, marginBottom: "0.75rem" }}>📊 معلومات التذكرة</div>
              {[
                { label: "الحالة",         content: <StatusBadge status={ticket.status} /> },
                {
                  label: "الأولوية",
                  content: (
                    <span style={{ background: PRIORITY_CONFIG[ticket.priority].bg, color: PRIORITY_CONFIG[ticket.priority].color, border: `1px solid ${PRIORITY_CONFIG[ticket.priority].border}`, borderRadius: 20, padding: "0.18rem 0.55rem", fontSize: "0.7rem", fontWeight: 700 }}>
                      {PRIORITY_CONFIG[ticket.priority].label}
                    </span>
                  ),
                },
                {
                  label: "التصنيف",
                  content: (
                    <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", color: "#374151" }}>
                      {CATEGORY_CONFIG[ticket.category].icon} {CATEGORY_CONFIG[ticket.category].label}
                    </span>
                  ),
                },
                { label: "تاريخ الإنشاء",  content: <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#6b7280" }} title={formatFull(ticket.createdAt)}>{formatRelative(ticket.createdAt)}</span> },
                { label: "آخر تحديث",      content: <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#6b7280" }} title={formatFull(ticket.updatedAt)}>{formatRelative(ticket.updatedAt)}</span> },
                { label: "التعليقات",       content: <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#374151" }}>{ticket.comments.length}</span> },
              ].map(({ label, content }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.42rem 0", borderBottom: "1px solid #f9f9ff" }}>
                  <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.73rem", color: "#9ca3af" }}>{label}</span>
                  {content}
                </div>
              ))}
            </div>

            {/* Admin: Change Status */}
            {isAdmin && !isClosed && (
              <div style={{ ...card, padding: "1.1rem" }}>
                <div style={{ ...sec, marginBottom: "0.75rem" }}>🔄 تغيير الحالة</div>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as TicketStatus)}
                  style={{ ...inp, marginBottom: "0.6rem" }}>
                  <option value="">اختر الحالة الجديدة…</option>
                  {(Object.keys(STATUS_CONFIG) as TicketStatus[])
                    .filter(s => s !== ticket.status)
                    .map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>
                    ))}
                </select>
                <input
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="ملاحظة على التغيير (اختياري)…"
                  style={{ ...inp, marginBottom: "0.65rem" }}
                />
                <button
                  onClick={handleStatusChange}
                  disabled={!newStatus || changingStatus}
                  style={{ width: "100%", background: newStatus ? `linear-gradient(135deg,${PURPLE},#9044ff)` : "#e5e7eb", border: "none", borderRadius: 10, padding: "0.68rem", color: newStatus ? "#fff" : "#9ca3af", cursor: newStatus ? "pointer" : "not-allowed", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                  {changingStatus
                    ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                    : "تطبيق الحالة الجديدة"
                  }
                </button>

                {/* Quick resolve shortcut */}
                {!["RESOLVED","CLOSED","CANCELLED"].includes(ticket.status) && (
                  <button
                    onClick={() => {
                      updateSupportTicketStatus(ticket.id, "RESOLVED", "تم حل المشكلة")
                        .then(r => setTicket(r.data)).catch(() => {});
                    }}
                    style={{ width: "100%", marginTop: "0.5rem", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "0.6rem", color: "#16a34a", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem" }}>
                    ✅ وضع علامة "تم الحل" سريعاً
                  </button>
                )}
              </div>
            )}

            {/* Activity Log */}
            <div style={{ ...card, padding: "1.1rem" }}>
              <div style={{ ...sec, marginBottom: "0.75rem" }}>
                📅 سجل النشاط
                <span style={{ fontWeight: 500, color: "#9ca3af", fontSize: "0.75rem" }}>({ticket.activityLog.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", maxHeight: 320, overflowY: "auto", paddingLeft: "0.25rem" }}>
                {[...ticket.activityLog].reverse().map((a, idx) => (
                  <div key={`${a.id}-${idx}`} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.performedByRole === "admin" ? PURPLE : "#16a34a", flexShrink: 0, marginTop: "0.38rem" }} />
                    <div>
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.72rem", color: "#374151", lineHeight: 1.45 }}>{a.action}</div>
                      <div style={{ fontSize: "0.63rem", color: "#9ca3af", marginTop: "0.1rem" }}>
                        {a.performedBy} · {formatRelative(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick navigation */}
            <div style={{ ...card, padding: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button onClick={() => router.push(isAdmin ? "/support/admin" : "/support/employee")}
                  style={{ background: "#f5f4ff", border: `1.5px solid rgba(112,45,255,.2)`, borderRadius: 9, padding: "0.6rem 0.85rem", cursor: "pointer", color: PURPLE, fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.8rem", textAlign: "right" }}>
                  ← كل التذاكر
                </button>
                <button onClick={() => router.push("/support/tickets/new")}
                  style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 9, padding: "0.6rem 0.85rem", cursor: "pointer", color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.8rem", textAlign: "right" }}>
                  + تذكرة جديدة
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

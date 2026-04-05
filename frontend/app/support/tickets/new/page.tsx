"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Upload, X, Copy, Check, Loader2,
  Link as LinkIcon, Plus,
} from "lucide-react";
import { TicketCategory, TicketPriority, CATEGORY_CONFIG, PRIORITY_CONFIG } from "../../types";
import { getSupportUser, clearSupportSession } from "../../auth";
import { createSupportTicket, uploadSupportImage } from "@/lib/api";

const PURPLE = "#702dff";
const inp: React.CSSProperties = {
  width: "100%", padding: "0.7rem 0.9rem",
  background: "#f9f9ff", border: "1.5px solid #e5e7eb",
  borderRadius: 10, color: "#111", fontSize: "0.9rem",
  outline: "none", fontFamily: "Tajawal,sans-serif",
  boxSizing: "border-box" as const,
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 700,
  color: "#374151", marginBottom: "0.4rem", fontFamily: "Tajawal,sans-serif",
};
const required = <span style={{ color: "#dc2626", marginRight: "0.2rem" }}>*</span>;

export default function NewTicketPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser]       = useState<{ name: string; role: string; id: string } | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  // Form fields
  const [requestNumber,   setRequestNumber]   = useState("");
  const [activationEmail, setActivationEmail] = useState("");
  const [productType,     setProductType]     = useState("");
  const [description,     setDescription]     = useState("");
  const [category,        setCategory]        = useState<TicketCategory>("ACTIVATION");
  const [priority,        setPriority]        = useState<TicketPriority>("NORMAL");
  const [customerContact, setCustomerContact] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  // Media: direct uploads
  const [attachments, setAttachments] = useState<{ id: string; name: string; dataUrl: string; size: number; isDriveUrl?: boolean }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Media: video links only
  const [mediaLinks,    setMediaLinks]    = useState<string[]>([]);
  const [linkInputVal,  setLinkInputVal]  = useState("");
  const [linkError,     setLinkError]     = useState("");
  // Drag state
  const [dragging, setDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  useEffect(() => {
    const s = getSupportUser();
    if (!s) { router.push("/support/login"); return; }
    setUser({ name: s.name, role: s.role, id: s.id });
  }, []);

  // ── File upload ────────────────────────────────────────────────────────
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = async e => {
        const dataUrl = e.target?.result as string;
        const tempId = Math.random().toString(36).slice(2);
        // Show preview immediately with base64
        setAttachments(prev => [...prev, { id: tempId, name: file.name, dataUrl, size: file.size }]);
        // Then upload to Google Drive in the background
        setUploadingImage(true);
        try {
          const res = await uploadSupportImage(file.name, file.type, dataUrl);
          const { viewUrl } = res.data;
          setAttachments(prev => prev.map(a =>
            a.id === tempId ? { ...a, dataUrl: viewUrl, isDriveUrl: true } : a
          ));
        } catch {
          // Keep base64 as fallback if Drive upload fails
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Link add ──────────────────────────────────────────────────────────
  const addLink = () => {
    setLinkError("");
    const val = linkInputVal.trim();
    if (!val) return;
    try { new URL(val); } catch {
      setLinkError("الرابط غير صالح — أدخل رابطاً كاملاً يبدأ بـ https://");
      return;
    }
    if (mediaLinks.includes(val)) { setLinkError("هذا الرابط مضاف بالفعل"); return; }
    setMediaLinks(prev => [...prev, val]);
    setLinkInputVal("");
  };

  // ── Validate ──────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!requestNumber.trim()) e.requestNumber = "رقم الطلب مطلوب";
    if (!activationEmail.trim()) e.activationEmail = "الإيميل مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activationEmail))
      e.activationEmail = "إيميل غير صحيح";
    if (!productType.trim()) e.productType = "نوع المنتج مطلوب";
    if (!description.trim()) e.description = "وصف المشكلة مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      // For Drive-uploaded images, only send the URL (not base64)
      const attachmentsToSend = attachments.map(a =>
        a.isDriveUrl
          ? { id: a.id, name: a.name, dataUrl: a.dataUrl, size: a.size, isDriveUrl: true }
          : { id: a.id, name: a.name, dataUrl: a.dataUrl, size: a.size }
      );
      const res = await createSupportTicket({
        requestNumber:   requestNumber.trim(),
        activationEmail: activationEmail.trim(),
        productType:     productType.trim(),
        description:     description.trim(),
        category, priority,
        customerContact:  customerContact.trim() || undefined,
        accountPassword:  accountPassword.trim() || undefined,
        attachments:      attachmentsToSend,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : undefined,
      });
      setCreated(res.data.id);
    } catch {
      setErrors({ submit: "فشل إنشاء التذكرة، يرجى المحاولة مجدداً" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyId = () => {
    if (!created) return;
    navigator.clipboard.writeText(created);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setCreated(null);
    setRequestNumber(""); setActivationEmail(""); setProductType("");
    setDescription(""); setCustomerContact(""); setAccountPassword("");
    setAttachments([]); setMediaLinks([]); setLinkInputVal("");
    setErrors({});
  };

  if (!user) return null;

  // ── Success screen ────────────────────────────────────────────────────
  if (created) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(112,45,255,.14)", border: "1px solid rgba(112,45,255,.12)" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${PURPLE},#9044ff)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", boxShadow: "0 8px 24px rgba(112,45,255,.35)" }}>
          <span style={{ fontSize: "2rem" }}>✅</span>
        </div>
        <h2 style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1.35rem", color: "#090040", marginBottom: "0.5rem" }}>تم إنشاء التذكرة بنجاح!</h2>
        <p style={{ fontFamily: "Tajawal,sans-serif", color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          يمكنك مشاركة رقم التذكرة مع العميل للمتابعة
        </p>
        <div style={{ background: "#f5f4ff", border: "2px dashed rgba(112,45,255,.35)", borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
          <code style={{ fontFamily: "monospace", fontSize: "1.35rem", fontWeight: 900, color: PURPLE, letterSpacing: "0.05em" }}>{created}</code>
          <button onClick={copyId} style={{ background: copied ? "#f0fdf4" : "#fff", border: `1.5px solid ${copied ? "#86efac" : "rgba(112,45,255,.25)"}`, borderRadius: 8, padding: "0.5rem 0.75rem", cursor: "pointer", color: copied ? "#16a34a" : PURPLE, display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, fontSize: "0.8rem", fontFamily: "Tajawal,sans-serif" }}>
            {copied ? <Check style={{ width: 15, height: 15 }} /> : <Copy style={{ width: 15, height: 15 }} />}
            {copied ? "تم النسخ!" : "نسخ"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => router.push(`/support/tickets/${created}`)} style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 10, padding: "0.7rem 1.4rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.9rem", boxShadow: "0 4px 14px rgba(112,45,255,.35)" }}>
            فتح التذكرة
          </button>
          <button onClick={resetForm} style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "0.7rem 1.4rem", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#374151" }}>
            تذكرة جديدة
          </button>
          <button onClick={() => router.push("/support/employee")} style={{ background: "#f5f4ff", border: `1.5px solid rgba(112,45,255,.2)`, borderRadius: 10, padding: "0.7rem 1.4rem", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.9rem", color: PURPLE }}>
            قائمة التذاكر
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Form ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", paddingBottom: "3rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus,textarea:focus,select:focus{border-color:${PURPLE}!important;}`}</style>

      {/* Navbar */}
      <nav style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.25rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 16px rgba(112,45,255,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.65rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}>
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
          <img src="/logo.png" alt="logo" style={{ height: 40, width: "auto", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
          <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "0.95rem", color: "#fff" }}>إنشاء تذكرة جديدة</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ color: "rgba(255,255,255,.85)", fontSize: "0.85rem", fontFamily: "Tajawal,sans-serif" }}>
            👤 {user.name}
          </span>
          <button onClick={() => { clearSupportSession(); router.push("/support/login"); }} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.65rem", color: "#fff", cursor: "pointer", fontSize: "0.75rem", fontFamily: "Tajawal,sans-serif" }}>
            خروج
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* ── Section 1: Basic info ─────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
            <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #f3f4f6" }}>
              📋 معلومات الطلب الأساسية
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={lbl}>رقم الطلب {required}</label>
                <input value={requestNumber} onChange={e => setRequestNumber(e.target.value)}
                  placeholder="مثال: 1234"
                  style={{ ...inp, borderColor: errors.requestNumber ? "#fca5a5" : "#e5e7eb", direction: "ltr", textAlign: "left", fontFamily: "monospace" }} />
                {errors.requestNumber && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.requestNumber}</p>}
              </div>
              <div>
                <label style={lbl}>إيميل التفعيل {required}</label>
                <input type="email" value={activationEmail} onChange={e => setActivationEmail(e.target.value)} placeholder="customer@example.com"
                  style={{ ...inp, borderColor: errors.activationEmail ? "#fca5a5" : "#e5e7eb", direction: "ltr", textAlign: "left" }} />
                {errors.activationEmail && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.activationEmail}</p>}
              </div>
              <div>
                <label style={lbl}>نوع المنتج / الاشتراك {required}</label>
                <input value={productType} onChange={e => setProductType(e.target.value)} placeholder="مثال: Microsoft Office 365"
                  style={{ ...inp, borderColor: errors.productType ? "#fca5a5" : "#e5e7eb" }} />
                {errors.productType && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.productType}</p>}
              </div>
              <div>
                <label style={lbl}>طريقة التواصل مع العميل <span style={{ color: "#9ca3af", fontWeight: 400 }}>(اختياري)</span></label>
                <input value={customerContact} onChange={e => setCustomerContact(e.target.value)} placeholder="واتساب: +962..." style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>
                  🔑 كلمة مرور الحساب{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>(اختياري — لحفظها بشكل آمن في التذكرة)</span>
                </label>
                <input
                  type="text"
                  value={accountPassword}
                  onChange={e => setAccountPassword(e.target.value)}
                  placeholder="كلمة مرور الحساب / المنتج"
                  style={{ ...inp, fontFamily: "monospace", direction: "ltr", textAlign: "left" }}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Employee auto-filled — read only */}
            <div style={{ marginTop: "0.85rem", background: "#f5f4ff", border: `1.5px solid rgba(112,45,255,.18)`, borderRadius: 10, padding: "0.65rem 0.9rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1rem" }}>👤</span>
              <div>
                <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600 }}>الموظف المسؤول (تلقائي)</div>
                <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.88rem", color: PURPLE }}>{user.name}</div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Category + Priority ───────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
            <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #f3f4f6" }}>
              🏷️ التصنيف والأولوية
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={lbl}>تصنيف المشكلة {required}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(Object.keys(CATEGORY_CONFIG) as TicketCategory[]).map(c => (
                    <label key={c} style={{ display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", padding: "0.55rem 0.75rem", borderRadius: 10, border: `1.5px solid ${category === c ? PURPLE : "#e5e7eb"}`, background: category === c ? "#f5f4ff" : "#fff", transition: "all .15s" }}>
                      <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} style={{ accentColor: PURPLE }} />
                      <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.85rem", fontWeight: category === c ? 700 : 400, color: category === c ? PURPLE : "#374151" }}>
                        {CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>الأولوية {required}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map(p => {
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <label key={p} style={{ display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", padding: "0.65rem 0.75rem", borderRadius: 10, border: `1.5px solid ${priority === p ? cfg.color : "#e5e7eb"}`, background: priority === p ? cfg.bg : "#fff", transition: "all .15s" }}>
                        <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} style={{ accentColor: cfg.color }} />
                        <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.88rem", fontWeight: priority === p ? 700 : 400, color: priority === p ? cfg.color : "#374151" }}>
                          {cfg.label}
                          {p === "URGENT" && <span style={{ fontSize: "0.72rem", marginRight: "0.35rem", color: "#dc2626" }}>— يحتاج معالجة فورية</span>}
                          {p === "HIGH"   && <span style={{ fontSize: "0.72rem", marginRight: "0.35rem", color: "#ea580c" }}>— أولوية مرتفعة</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Description ────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
            <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #f3f4f6" }}>
              📝 وصف المشكلة
            </div>
            <label style={lbl}>وصف المشكلة بالتفصيل {required}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
              placeholder="اشرح المشكلة بوضوح: ما الذي حدث؟ متى بدأت المشكلة؟ ما الخطأ الذي يظهر؟"
              style={{ ...inp, resize: "vertical", minHeight: 120, borderColor: errors.description ? "#fca5a5" : "#e5e7eb" }} />
            {errors.description && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.description}</p>}
          </div>

          {/* ── Section 4: Media ──────────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
            <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #f3f4f6" }}>
              🖼️ الوسائط والمرفقات <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "0.8rem" }}>(اختياري)</span>
            </div>

            {/* ── Part A: Link input ── */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <LinkIcon style={{ width: 14, height: 14 }} /> رابط فيديو
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={linkInputVal}
                  onChange={e => { setLinkInputVal(e.target.value); setLinkError(""); }}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLink())}
                  placeholder="https://..."
                  style={{ ...inp, flex: 1, direction: "ltr", textAlign: "left" }}
                />
                <button type="button" onClick={addLink}
                  style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 10, padding: "0 1.1rem", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: "0.35rem", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                  <Plus style={{ width: 14, height: 14 }} /> إضافة
                </button>
              </div>
              {linkError && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{linkError}</p>}
              <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.3rem" }}>
                روابط فيديو من YouTube أو أي رابط فيديو مباشر
              </p>

              {/* Added links */}
              {mediaLinks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.65rem" }}>
                  {mediaLinks.map((url, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f5f4ff", border: `1px solid rgba(112,45,255,.15)`, borderRadius: 9, padding: "0.45rem 0.7rem" }}>
                      <LinkIcon style={{ width: 13, height: 13, color: PURPLE, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.78rem", color: "#374151", direction: "ltr", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                      <button type="button" onClick={() => setMediaLinks(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", flexShrink: 0, padding: "0.1rem" }}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: 1, background: "#f0f0f5" }} />
              <span style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>أو ارفع مباشرة</span>
              <div style={{ flex: 1, height: 1, background: "#f0f0f5" }} />
            </div>

            {/* ── Part B: File upload ── */}
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display: "none" }} />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${dragging ? PURPLE : "rgba(112,45,255,.3)"}`, borderRadius: 12, padding: "1.25rem", textAlign: "center", cursor: "pointer", background: dragging ? "#f0edff" : "#fafaff", transition: "all .15s" }}>
              <Upload style={{ width: 26, height: 26, color: PURPLE, margin: "0 auto 0.45rem" }} />
              <p style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, color: "#374151", fontSize: "0.85rem" }}>اضغط لرفع أو اسحب وأفلت الصور هنا</p>
              <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem" }}>PNG, JPG, WEBP — يمكن رفع عدة صور</p>
            </div>

            {uploadingImage && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.6rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", color: "#702dff" }}>
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                جارٍ رفع الصور إلى Google Drive…
              </div>
            )}
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.85rem" }}>
                {attachments.map(a => (
                  <div key={a.id} style={{ position: "relative", width: 88, height: 88, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${a.isDriveUrl ? "#86efac" : "rgba(112,45,255,.2)"}` }}>
                    <img src={a.dataUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {a.isDriveUrl && (
                      <div style={{ position: "absolute", bottom: 2, right: 2, background: "#16a34a", borderRadius: 4, padding: "1px 5px", fontSize: "0.55rem", color: "#fff", fontWeight: 700 }}>Drive ✓</div>
                    )}
                    <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}
                      style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,.65)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X style={{ width: 11, height: 11, color: "#fff" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button type="submit" disabled={submitting}
            style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 14, padding: "1rem", color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1rem", cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 4px 18px rgba(112,45,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: submitting ? 0.8 : 1 }}>
            {submitting
              ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
              : "🎫"}
            {submitting ? "جارٍ الإنشاء…" : "إنشاء التذكرة"}
          </button>
        </form>
      </div>
    </div>
  );
}

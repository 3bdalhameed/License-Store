"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getProducts, buyProduct, getMyOrders, buyManualProduct, getMyManualOrders } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Copy, Check, Loader2, AlertCircle, X, Plus, Minus, ShoppingBag, ClipboardList } from "lucide-react";

interface User { id: string; name: string; email: string; role: string; credits: number; }
interface Product { id: string; productNumber?: number; name: string; description?: string; priceInCredits: number; availableKeys: number; isManual: boolean; }
interface Order { id: string; orderNumber?: number; createdAt: string; creditsCost: number; product: { name: string }; licenseKey: { key: string }; }
interface ManualOrder { id: string; orderNumber?: number; createdAt: string; creditsCost: number; emails: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"; resultDetails?: string; product: { name: string }; }

const GRADIENTS = [
  "linear-gradient(135deg, #702dff 0%, #a77fff 100%)",
  "linear-gradient(135deg, #090040 0%, #702dff 100%)",
  "linear-gradient(135deg, #5a20d4 0%, #702dff 100%)",
  "linear-gradient(135deg, #4f1fc8 0%, #9044ff 100%)",
];
const ICONS = ["🪟", "📦", "💿", "🔑", "🖥️", "⚙️", "🎮", "📱"];

const STATUS_MAP = {
  PENDING:     { label: "قيد الانتظار",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  IN_PROGRESS: { label: "جارٍ التنفيذ",  color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  COMPLETED:   { label: "مكتمل",          color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  REJECTED:    { label: "مرفوض",           color: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
};

const DEBT_LIMIT = -20;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualOrders, setManualOrders] = useState<ManualOrder[]>([]);
  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [buying, setBuying] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyWarning, setBuyWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualModal, setManualModal] = useState<Product | null>(null);
  const [emailInputs, setEmailInputs] = useState<string[]>([""]);
  const [buyingManual, setBuyingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meRes, productsRes, ordersRes, manualRes] = await Promise.all([getMe(), getProducts(), getMyOrders(), getMyManualOrders()]);
      if (meRes.data.role === "ADMIN") { router.push("/admin"); return; }
      setUser(meRes.data); setProducts(productsRes.data); setOrders(ordersRes.data); setManualOrders(manualRes.data);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  };

  const handleBuy = async (product: Product) => {
    if (product.isManual) { setManualModal(product); setEmailInputs([""]); setManualError(null); return; }
    if (!user) return;

    // Check if would exceed debt limit
    const balanceAfter = user.credits - product.priceInCredits;
    if (balanceAfter < DEBT_LIMIT) {
      setBuyError(`رصيدك غير كافٍ — الحد الأقصى للدين هو $${Math.abs(DEBT_LIMIT)}. رصيدك الحالي: $${user.credits}`);
      return;
    }

    setBuying(product.id); setBuyError(null); setBuyWarning(null);
    try {
      const res = await buyProduct(product.id);
      const [meRes, ordersRes] = await Promise.all([getMe(), getMyOrders()]);
      setUser(meRes.data); setOrders(ordersRes.data);
      if (res.data.warning) setBuyWarning(res.data.warning);
      setTab("orders");
    } catch (err: any) { setBuyError(err.response?.data?.error || "فشل الشراء"); }
    finally { setBuying(null); }
  };

  const handleManualBuy = async () => {
    if (!manualModal || !user) return;
    const validEmails = emailInputs.map(e => e.trim()).filter(e => e);
    if (validEmails.length === 0) { setManualError("أدخل بريداً إلكترونياً واحداً على الأقل"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validEmails.every(e => emailRegex.test(e))) { setManualError("تحقق من صحة البريد الإلكتروني"); return; }

    // Check debt limit
    const totalCost = manualModal.priceInCredits * validEmails.length;
    const balanceAfter = user.credits - totalCost;
    if (balanceAfter < DEBT_LIMIT) {
      setManualError(`رصيدك غير كافٍ — الحد الأقصى للدين هو $${Math.abs(DEBT_LIMIT)}. رصيدك الحالي: $${user.credits}`);
      return;
    }

    setBuyingManual(true); setManualError(null);
    try {
      const res = await buyManualProduct(manualModal.id, validEmails);
      const [meRes, manualRes] = await Promise.all([getMe(), getMyManualOrders()]);
      setUser(meRes.data); setManualOrders(manualRes.data); setManualModal(null);
      if (res.data.warning) setBuyWarning(res.data.warning);
      setTab("orders");
    } catch (err: any) { setManualError(err.response?.data?.error || "فشل الشراء"); }
    finally { setBuyingManual(false); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 style={{ width: 32, height: 32, color: "#702dff", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return null;

  const allOrders = [
    ...manualOrders.map(o => ({ ...o, type: "manual" as const })),
    ...orders.map(o => ({ ...o, type: "key" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalEmailCost = manualModal ? manualModal.priceInCredits * (emailInputs.filter(e => e.trim()).length || 1) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", paddingBottom: "5rem" }}>
      <Navbar userName={user.name} credits={user.credits} />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 100%)", padding: "1.5rem 1.25rem", position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -80, right: -60, pointerEvents: "none" }} />
        <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "clamp(1.25rem, 4vw, 1.75rem)", fontWeight: 900, color: "#fff", position: "relative", zIndex: 1 }}>
          مرحباً {user.name.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", marginTop: "0.3rem", position: "relative", zIndex: 1 }}>
          اكتشف أقوى الاشتراكات الرقمية
        </p>
        {/* Negative balance warning in hero */}
        {user.credits < 0 && (
          <div style={{ marginTop: "0.75rem", background: "rgba(255,60,60,0.2)", border: "1px solid rgba(255,100,100,0.4)", borderRadius: 10, padding: "0.6rem 0.85rem", position: "relative", zIndex: 1 }}>
            <p style={{ color: "#fecaca", fontSize: "0.82rem", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
              ⚠️ رصيدك سلبي (${user.credits}) — يرجى إعادة الشحن. يمكنك الشراء حتى -$20
            </p>
          </div>
        )}
      </div>

      <div className="dash-wrap" style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem 0.75rem", paddingBottom: "5rem" }}>
        {/* Desktop tab bar */}
        <div id="dash-desktop-tabs" style={{ display: "none", gap: "0", marginBottom: "1.25rem", borderBottom: "2px solid #ede9fe" }}>
          {[
            { key: "shop", label: "المتجر", icon: ShoppingBag },
            { key: "orders", label: `طلباتي (${allOrders.length})`, icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as "shop" | "orders")} style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.65rem 1.25rem", border: "none", background: "none", cursor: "pointer",
              fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.9rem",
              color: tab === key ? "#702dff" : "#6b7280",
              borderBottom: tab === key ? "2.5px solid #702dff" : "2.5px solid transparent",
              marginBottom: "-2px", transition: "color 0.2s",
            }}>
              <Icon style={{ width: 16, height: 16 }} />{label}
            </button>
          ))}
        </div>

        {/* Error message */}
        {buyError && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1rem", fontSize: "0.875rem" }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />{buyError}
            <button onClick={() => setBuyError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1rem" }}>×</button>
          </div>
        )}

        {/* Warning message (negative balance after buy) */}
        {buyWarning && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1rem", fontSize: "0.875rem" }}>
            ⚠️ {buyWarning}
            <button onClick={() => setBuyWarning(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "1rem" }}>×</button>
          </div>
        )}

        {/* Products grid */}
        {tab === "shop" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {products.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "#9ca3af" }}>لا توجد منتجات متاحة</div>}
            {products.map((p, i) => {
              const balanceAfter = user.credits - p.priceInCredits;
              const wouldExceedDebt = balanceAfter < DEBT_LIMIT;
              const hasStock = p.availableKeys > 0;
              const canBuy = hasStock && !wouldExceedDebt;
              const notEnoughMsg = !hasStock ? null : wouldExceedDebt ? "رصيد غير كافٍ" : null;

              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(112,45,255,0.1)", border: "1px solid rgba(112,45,255,0.08)" }}>
                  <div style={{ background: GRADIENTS[i % GRADIENTS.length], padding: "1.75rem 1rem", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ fontSize: "2.75rem" }}>{ICONS[i % ICONS.length]}</div>
                    {p.isManual
                      ? <span style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: 20 }}>⚡ يدوي</span>
                      : <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: 20 }}>{p.availableKeys > 0 ? `${p.availableKeys} متوفر` : "نفذ"}</span>
                    }
                  </div>
                  <div style={{ padding: "1rem 1rem" }}>
                    {p.productNumber && <div style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "#702dff", fontWeight: 700, marginBottom: "0.2rem" }}>#{p.productNumber}</div>}
                    <div style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", marginBottom: "0.3rem", lineHeight: 1.3 }}>{p.name}</div>
                    {p.isManual && <div style={{ color: "#702dff", fontSize: "0.7rem", marginBottom: "0.5rem" }}>🔧 تفعيل يدوي</div>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                      <span style={{ fontWeight: 900, fontSize: "1rem", color: "#702dff" }}>${p.priceInCredits}</span>
                      <button
                        onClick={() => handleBuy(p)}
                        disabled={!hasStock || buying === p.id}
                        style={{
                          background: !hasStock ? "#f3f4f6" : wouldExceedDebt ? "#fff5f5" : "linear-gradient(135deg, #702dff, #9044ff)",
                          border: wouldExceedDebt && hasStock ? "1px solid #fecaca" : "none",
                          borderRadius: 8, padding: "0.45rem 0.75rem",
                          color: !hasStock ? "#9ca3af" : wouldExceedDebt ? "#dc2626" : "#fff",
                          fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.75rem",
                          cursor: hasStock ? "pointer" : "not-allowed",
                          display: "flex", alignItems: "center", gap: "0.3rem",
                        }}
                      >
                        {buying === p.id && <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />}
                        {!hasStock ? "نفذ" : wouldExceedDebt ? "رصيد غير كافٍ" : "شراء"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {allOrders.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", background: "#fff", borderRadius: 16 }}>لا توجد طلبات بعد.</div>}
            {allOrders.map(order => {
              if (order.type === "manual") {
                const mo = order as typeof manualOrders[0] & { type: "manual" };
                const st = STATUS_MAP[mo.status];
                return (
                  <div key={mo.id} style={{ background: "#fff", borderRadius: 16, padding: "1rem", boxShadow: "0 2px 10px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem", flexWrap: "wrap" as const, gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {mo.orderNumber && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{mo.orderNumber}</span>}
                        <span style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.875rem", color: "#090040" }}>{mo.product.name}</span>
                        <span style={{ background: "#f5f4ff", color: "#702dff", fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 8, border: "1px solid rgba(112,45,255,0.2)" }}>يدوي</span>
                      </div>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                      {new Date(mo.createdAt).toLocaleDateString("ar-EG")} · <span style={{ color: "#702dff", fontWeight: 700 }}>${mo.creditsCost} رصيد</span>
                    </div>
                    <div style={{ background: "#f9f9ff", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "#374151" }}>
                      📧 {mo.emails}
                    </div>
                    {mo.resultDetails && mo.status === "COMPLETED" && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "0.65rem 0.75rem", marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a", marginBottom: "0.3rem" }}>✅ تفاصيل التفعيل:</div>
                        <pre style={{ fontSize: "0.8rem", color: "#090040", whiteSpace: "pre-wrap" as const, fontFamily: "inherit", margin: 0 }}>{mo.resultDetails}</pre>
                      </div>
                    )}
                    {mo.status === "REJECTED" && (
                      <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem 0.75rem", marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#dc2626" }}>❌ تم رفض الطلب {mo.resultDetails ? `— ${mo.resultDetails}` : ""}</div>
                        <div style={{ fontSize: "0.72rem", color: "#16a34a", marginTop: "0.2rem" }}>✅ تم إرجاع الرصيد</div>
                      </div>
                    )}
                    {mo.status === "PENDING" && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "0.5rem 0.75rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "#92400e" }}>
                        ⏳ طلبك قيد المراجعة
                      </div>
                    )}
                  </div>
                );
              }
              const ko = order as typeof orders[0] & { type: "key" };
              return (
                <div key={ko.id} style={{ background: "#fff", borderRadius: 16, padding: "1rem", boxShadow: "0 2px 10px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {ko.orderNumber && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{ko.orderNumber}</span>}
                      <span style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.875rem", color: "#090040" }}>{ko.product.name}</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#702dff", fontWeight: 700 }}>${ko.creditsCost}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f5f4ff", border: "1.5px solid rgba(112,45,255,0.15)", borderRadius: 10, padding: "0.6rem 0.75rem" }}>
                    <code style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "#702dff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{ko.licenseKey.key}</code>
                    <button onClick={() => copyKey(ko.licenseKey.key)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedKey === ko.licenseKey.key ? "#22c55e" : "#702dff", flexShrink: 0, padding: "0.25rem" }}>
                      {copiedKey === ko.licenseKey.key ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <div id="dash-mobile-tabs" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#fff", borderTop: "1px solid #f0eeff", display: "flex", alignItems: "center", boxShadow: "0 -2px 16px rgba(112,45,255,0.08)", height: 60 }}>
        <div style={{ width: 60, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #702dff, #9044ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.85rem", fontFamily: "Syne, sans-serif" }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
        {[
          { key: "shop", label: "المتجر", icon: ShoppingBag },
          { key: "orders", label: "طلباتي", icon: ClipboardList },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as "shop" | "orders")} style={{
            flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
            gap: "0.2rem", height: "100%", border: "none", background: "none", cursor: "pointer",
            color: tab === key ? "#702dff" : "#c4b5fd",
            borderTop: tab === key ? "2px solid #702dff" : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            <Icon style={{ width: 20, height: 20, strokeWidth: tab === key ? 2.5 : 1.75 }} />
            <span style={{ fontSize: "0.7rem", fontWeight: tab === key ? 700 : 500, fontFamily: "Tajawal, sans-serif" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Manual buy modal */}
      {manualModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,0,64,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem 1.25rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 900, fontSize: "1.1rem", color: "#090040", margin: 0 }}>🔧 {manualModal.name}</h2>
                <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: "0.2rem" }}>أدخل الإيميل (أو الإيميلات) للتفعيل</p>
              </div>
              <button onClick={() => setManualModal(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "0.4rem", cursor: "pointer" }}>
                <X style={{ width: 18, height: 18, color: "#6b7280" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.75rem" }}>
              {emailInputs.map((email, idx) => (
                <div key={idx} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="email" value={email} onChange={e => { const arr = [...emailInputs]; arr[idx] = e.target.value; setEmailInputs(arr); }}
                    placeholder={`البريد الإلكتروني ${idx + 1}`}
                    style={{ flex: 1, padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif" }}
                    onFocus={e => e.target.style.borderColor = "#702dff"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                  {emailInputs.length > 1 && (
                    <button onClick={() => setEmailInputs(emailInputs.filter((_, i) => i !== idx))} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.4rem 0.6rem", cursor: "pointer", color: "#dc2626" }}>
                      <Minus style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setEmailInputs([...emailInputs, ""])} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", borderRadius: 10, padding: "0.5rem 1rem", color: "#702dff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", marginBottom: "1rem", fontFamily: "Tajawal, sans-serif", width: "100%", justifyContent: "center" }}>
              <Plus style={{ width: 14, height: 14 }} />إضافة إيميل آخر
            </button>

            {/* Cost summary */}
            <div style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.15)", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>${manualModal.priceInCredits} × {emailInputs.filter(e => e.trim()).length || 1} إيميل</span>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "#702dff", fontFamily: "Tajawal, sans-serif" }}>= ${totalEmailCost} رصيد</span>
            </div>

            {manualError && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.7rem 1rem", borderRadius: 10, fontSize: "0.85rem", marginBottom: "0.75rem" }}>{manualError}</div>}

            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "0.65rem 0.85rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.78rem", color: "#92400e", margin: 0 }}>⏳ سيعمل فريقنا على التفعيل وستصلك رسالة تأكيد.</p>
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button onClick={handleManualBuy} disabled={buyingManual} style={{ flex: 1, padding: "0.9rem", background: buyingManual ? "#a77fff" : "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 12, color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.95rem", cursor: buyingManual ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                {buyingManual && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                {buyingManual ? "جاري الشراء..." : `شراء — $${totalEmailCost} رصيد`}
              </button>
              <button onClick={() => setManualModal(null)} style={{ padding: "0.9rem 1rem", background: "#f3f4f6", border: "none", borderRadius: 12, color: "#6b7280", fontFamily: "Tajawal, sans-serif", fontWeight: 700, cursor: "pointer" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (min-width: 641px) {
          #dash-desktop-tabs { display: flex !important; }
          #dash-mobile-tabs { display: none !important; }
          .dash-wrap { padding-bottom: 1rem !important; }
        }
        @media (max-width: 640px) {
          #dash-desktop-tabs { display: none !important; }
          #dash-mobile-tabs { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
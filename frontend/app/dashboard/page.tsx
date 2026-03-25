"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getMe, getProducts, buyProduct, getMyOrders, buyManualProduct, getMyManualOrders, getMyCreditLogs } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Copy, Check, Loader2, AlertCircle, X, Plus, Minus, ShoppingBag, ClipboardList, History } from "lucide-react";

interface User { id: string; name: string; email: string; role: string; credits: number; }
interface Product { id: string; productNumber?: number; name: string; description?: string; activationInstructions?: string; priceInCredits: number; availableKeys: number; isManual: boolean; categoryId?: string | null; categoryName?: string | null; }
interface Order { id: string; orderNumber?: number; globalOrderNumber?: number; createdAt: string; creditsCost: number; product: { name: string }; licenseKey: { key: string }; }
interface ManualOrder { id: string; orderNumber?: number; globalOrderNumber?: number; createdAt: string; creditsCost: number; emails: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"; resultDetails?: string; product: { name: string }; }
interface CreditLog { id: string; amount: number; type: "ADD" | "DEDUCT"; note?: string; createdAt: string; }

const STATUS_MAP = {
  PENDING:     { label: "قيد الانتظار",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  IN_PROGRESS: { label: "جارٍ التنفيذ",  color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  COMPLETED:   { label: "مكتمل",          color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  REJECTED:    { label: "مرفوض",           color: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
};

const DEBT_LIMIT = -20;

const GRADIENTS = [
  "linear-gradient(135deg, #702dff 0%, #a77fff 100%)",
  "linear-gradient(135deg, #090040 0%, #702dff 100%)",
  "linear-gradient(135deg, #5a20d4 0%, #702dff 100%)",
  "linear-gradient(135deg, #4f1fc8 0%, #9044ff 100%)",
];

function orderDisplayNumber(o: { orderNumber?: number; globalOrderNumber?: number }, prefix = "") {
  if (o.globalOrderNumber) return o.globalOrderNumber;
  if (o.orderNumber) return `${prefix}${o.orderNumber}`;
  return null;
}

function daysUntilDeletion(createdAt: string) {
  const deleteAt = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.ceil((deleteAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualOrders, setManualOrders] = useState<ManualOrder[]>([]);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [tab, setTab] = useState<"shop" | "orders" | "credits">("shop");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [buyWarning, setBuyWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [emailInputs, setEmailInputs] = useState<string[]>([""]);
  const [buyingManual, setBuyingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const sliderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragState = useRef<{ id: string; startX: number; scrollLeft: number; dragging: boolean } | null>(null);
  const hasDragged = useRef(false);

  const setSliderRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) sliderRefs.current.set(id, el);
    else sliderRefs.current.delete(id);
  };

  const slideBy = (id: string, dir: number) => {
    const el = sliderRefs.current.get(id);
    if (el) el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const onDragStart = (id: string, e: React.MouseEvent) => {
    const el = sliderRefs.current.get(id);
    if (!el) return;
    hasDragged.current = false;
    dragState.current = { id, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, dragging: true };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };

  const onDragMove = (id: string, e: React.MouseEvent) => {
    const d = dragState.current;
    if (!d || !d.dragging || d.id !== id) return;
    const el = sliderRefs.current.get(id);
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    if (Math.abs(x - d.startX) > 6) hasDragged.current = true;
    el.scrollLeft = d.scrollLeft - (x - d.startX);
  };

  const onDragEnd = (id: string) => {
    const el = sliderRefs.current.get(id);
    if (el) { el.style.cursor = "grab"; el.style.userSelect = ""; }
    dragState.current = null;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meRes, productsRes, ordersRes, manualRes, creditsRes] = await Promise.all([
        getMe(), getProducts(), getMyOrders(), getMyManualOrders(), getMyCreditLogs(),
      ]);
      if (meRes.data.role === "ADMIN") { router.push("/admin"); return; }
      setUser(meRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setManualOrders(manualRes.data);
      setCreditLogs(creditsRes.data);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  };

  const handleBuy = async (product: Product) => {
    if (!user) return;

    const qty = quantities[product.id] ?? 1;
    const totalCost = product.priceInCredits * qty;
    const balanceAfter = user.credits - totalCost;
    if (balanceAfter < DEBT_LIMIT) {
      setManualError(`رصيدك غير كافٍ — الحد الأقصى للدين هو $${Math.abs(DEBT_LIMIT)}`);
      return;
    }

    setBuying(product.id); setManualError(null); setBuyWarning(null);
    try {
      const res = await buyProduct(product.id, qty);
      const [meRes, ordersRes, creditsRes] = await Promise.all([getMe(), getMyOrders(), getMyCreditLogs()]);
      setUser(meRes.data); setOrders(ordersRes.data); setCreditLogs(creditsRes.data);
      if (res.data.warning) setBuyWarning(res.data.warning);
      setQuantities(q => ({ ...q, [product.id]: 1 }));
      setProductModal(null);
      setTab("orders");
    } catch (err: any) { setManualError(err.response?.data?.error || "فشل الشراء"); }
    finally { setBuying(null); }
  };

  const handleManualBuy = async () => {
    if (!productModal || !user) return;
    const validEmails = emailInputs.map(e => e.trim()).filter(e => e);
    if (validEmails.length === 0) { setManualError("أدخل بريداً إلكترونياً واحداً على الأقل"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validEmails.every(e => emailRegex.test(e))) { setManualError("تحقق من صحة البريد الإلكتروني"); return; }

    const totalCost = productModal.priceInCredits * validEmails.length;
    const balanceAfter = user.credits - totalCost;
    if (balanceAfter < DEBT_LIMIT) {
      setManualError(`رصيدك غير كافٍ — الحد الأقصى للدين هو $${Math.abs(DEBT_LIMIT)}`);
      return;
    }

    setBuyingManual(true); setManualError(null);
    try {
      const res = await buyManualProduct(productModal.id, validEmails);
      const [meRes, manualRes, creditsRes] = await Promise.all([getMe(), getMyManualOrders(), getMyCreditLogs()]);
      setUser(meRes.data); setManualOrders(manualRes.data); setCreditLogs(creditsRes.data); setProductModal(null);
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

  const totalEmailCost = productModal ? productModal.priceInCredits * (emailInputs.filter(e => e.trim()).length || 1) : 0;

  const tabs = [
    { key: "shop", label: "المتجر", icon: ShoppingBag },
    { key: "orders", label: `طلباتي (${allOrders.length})`, icon: ClipboardList },
    { key: "credits", label: "سجل الرصيد", icon: History },
  ];

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
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)} style={{
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

        {/* Warning */}
        {buyWarning && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1rem", fontSize: "0.875rem" }}>
            ⚠️ {buyWarning}
            <button onClick={() => setBuyWarning(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "1rem" }}>×</button>
          </div>
        )}

        {/* ── Shop tab ── */}
        {tab === "shop" && (() => {
          const categories = Array.from(new Set(products.map(p => p.categoryName).filter(Boolean))) as string[];
          const uncategorized = products.filter(p => !p.categoryName);

          const renderProductCard = (p: Product, i: number) => {
            const hasStock = p.availableKeys > 0;

            const openModal = () => {
              if (hasDragged.current) return;
              setProductModal(p);
              setEmailInputs([""]);
              setManualError(null);
              setQuantities(q => ({ ...q, [p.id]: q[p.id] ?? 1 }));
            };

            return (
              <div
                key={p.id}
                onClick={openModal}
                style={{
                  background: "#fff",
                  borderRadius: 22,
                  overflow: "hidden",
                  boxShadow: hasStock
                    ? "0 6px 28px rgba(112,45,255,0.14), 0 1px 4px rgba(0,0,0,0.04)"
                    : "0 2px 12px rgba(0,0,0,0.07)",
                  border: "1px solid rgba(112,45,255,0.1)",
                  minWidth: 200, maxWidth: 200,
                  flexShrink: 0,
                  display: "flex", flexDirection: "column" as const,
                  opacity: hasStock ? 1 : 0.7,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {/* ── Header ── */}
                <div style={{
                  background: GRADIENTS[i % GRADIENTS.length],
                  padding: "1.35rem 1rem 1.1rem",
                  display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.65rem",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -40, right: -30, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", width: 75, height: 75, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -20, left: -18, pointerEvents: "none" }} />

                  <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                    {p.productNumber
                      ? <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", color: "#fff", fontSize: "0.58rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 20, fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.2)" }}>#{p.productNumber}</span>
                      : <span />}
                    <span style={{
                      background: hasStock ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.22)",
                      backdropFilter: "blur(4px)", color: "#fff", fontSize: "0.58rem", fontWeight: 700,
                      padding: "0.1rem 0.5rem", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)",
                    }}>
                      {p.isManual ? "📦 يدوي" : hasStock ? "⚡ فوري" : "نفذ"}
                    </span>
                  </div>

                  <div style={{
                    width: 62, height: 62, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)",
                    border: "1.5px solid rgba(255,255,255,0.3)", boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2rem", position: "relative", zIndex: 1,
                  }}>
                    {p.isManual ? "📦" : "🔑"}
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: "0.85rem 0.9rem 1rem", display: "flex", flexDirection: "column" as const, flex: 1, gap: "0.3rem" }}>
                  <div style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.93rem", color: "#090040", lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                  {p.description && (
                    <div style={{ color: "#9ca3af", fontSize: "0.7rem", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                      {p.description}
                    </div>
                  )}

                  <div style={{ flex: 1, minHeight: 8 }} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.4rem" }}>
                    <span style={{ fontWeight: 900, fontSize: "1.15rem", color: "#702dff" }}>${p.priceInCredits}</span>
                    <span style={{ fontSize: "0.7rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.18)", borderRadius: 8, padding: "0.2rem 0.55rem" }}>
                      عرض
                    </span>
                  </div>
                </div>
              </div>
            );
          };

          if (products.length === 0) return (
            <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>لا توجد منتجات متاحة</div>
          );

          const renderSection = (id: string, label: string, list: Product[]) => (
            <div key={id}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ height: 3, width: 4, borderRadius: 2, background: "linear-gradient(135deg, #702dff, #9044ff)" }} />
                <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 900, fontSize: "1.05rem", color: "#090040", margin: 0 }}>{label}</h2>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(112,45,255,0.15))" }} />
                <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "Tajawal, sans-serif" }}>{list.length} منتج</span>
              </div>
              <div style={{ position: "relative" }}>
                <button onClick={() => slideBy(id, -1)} style={{ position: "absolute", left: -80, top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 40, height: 32, borderRadius: "50%", border: "1.5px solid rgba(112,45,255,0.25)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#702dff", fontSize: "1.1rem", boxShadow: "0 2px 8px rgba(112,45,255,0.18)", lineHeight: 1 }}>›</button>
                <div
                  ref={setSliderRef(id)}
                  className="cat-slider"
                  style={{ display: "flex", overflowX: "auto", gap: "0.75rem", paddingBottom: "0.5rem", scrollbarWidth: "none" as any, cursor: "grab" }}
                  onMouseDown={e => onDragStart(id, e)}
                  onMouseMove={e => onDragMove(id, e)}
                  onMouseUp={() => onDragEnd(id)}
                  onMouseLeave={() => onDragEnd(id)}
                >
                  {list.map((p, i) => renderProductCard(p, i))}
                </div>
                <button onClick={() => slideBy(id, 1)} style={{ position: "absolute", right: -80, top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 40, height: 32, borderRadius: "50%", border: "1.5px solid rgba(112,45,255,0.25)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#702dff", fontSize: "1.1rem", boxShadow: "0 2px 8px rgba(112,45,255,0.18)", lineHeight: 1 }}>‹</button>
              </div>
            </div>
          );

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {categories.map(cat => renderSection(cat, cat, products.filter(p => p.categoryName === cat)))}
              {uncategorized.length > 0 && renderSection("__uncategorized__", categories.length > 0 ? "منتجات أخرى" : "المنتجات", uncategorized)}
            </div>
          );
        })()}

        {/* ── Orders tab ── */}
        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* 30-day deletion notice */}
            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 14, padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem", color: "#92400e" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
              <span style={{ fontFamily: "Tajawal, sans-serif" }}>يتم حذف الطلبات تلقائياً بعد <strong>30 يوماً</strong> من تاريخ الشراء. احفظ مفاتيحك في مكان آمن.</span>
            </div>
            {allOrders.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", background: "#fff", borderRadius: 16 }}>لا توجد طلبات بعد.</div>}
            {allOrders.map(order => {
              if (order.type === "manual") {
                const mo = order as typeof manualOrders[0] & { type: "manual" };
                const st = STATUS_MAP[mo.status];
                const num = orderDisplayNumber(mo, "M");
                return (
                  <div key={mo.id} style={{ background: "#fff", borderRadius: 16, padding: "1rem", boxShadow: "0 2px 10px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem", flexWrap: "wrap" as const, gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {num && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{num}</span>}
                        <span style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.875rem", color: "#090040" }}>{mo.product.name}</span>
                        <span style={{ background: "#f5f4ff", color: "#702dff", fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 8, border: "1px solid rgba(112,45,255,0.2)" }}>📦 يدوي</span>
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
              const num = orderDisplayNumber(ko, "K");
              const days = daysUntilDeletion(ko.createdAt);
              return (
                <div key={ko.id} style={{ background: "#fff", borderRadius: 16, padding: "1rem", boxShadow: "0 2px 10px rgba(112,45,255,0.08)", border: `1px solid ${days <= 7 ? "#fcd34d" : "rgba(112,45,255,0.08)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {num && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{num}</span>}
                      <span style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.875rem", color: "#090040" }}>{ko.product.name}</span>
                      <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 8, border: "1px solid #86efac" }}>🔑 تسليم فوري</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#702dff", fontWeight: 700 }}>${ko.creditsCost}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f5f4ff", border: "1.5px solid rgba(112,45,255,0.15)", borderRadius: 10, padding: "0.6rem 0.75rem" }}>
                    <code style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "#702dff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{ko.licenseKey.key}</code>
                    <button onClick={() => copyKey(ko.licenseKey.key)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedKey === ko.licenseKey.key ? "#22c55e" : "#702dff", flexShrink: 0, padding: "0.25rem" }}>
                      {copiedKey === ko.licenseKey.key ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  {days <= 7 && (
                    <div style={{ marginTop: "0.5rem", background: days <= 2 ? "#fff5f5" : "#fffbeb", border: `1px solid ${days <= 2 ? "#fecaca" : "#fcd34d"}`, borderRadius: 8, padding: "0.4rem 0.65rem", fontSize: "0.73rem", color: days <= 2 ? "#dc2626" : "#92400e", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} />
                      {days <= 0 ? "سيتم حذف هذا الطلب قريباً جداً — احفظ المفتاح الآن!" : `سيتم حذف هذا الطلب خلال ${days} ${days === 1 ? "يوم" : "أيام"}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Credit history tab ── */}
        {tab === "credits" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.25rem", boxShadow: "0 2px 10px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 700, color: "#374151" }}>الرصيد الحالي</span>
              <span style={{ fontWeight: 900, fontSize: "1.1rem", color: user.credits < 0 ? "#dc2626" : "#702dff" }}>${user.credits}</span>
            </div>
            {creditLogs.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", background: "#fff", borderRadius: 16 }}>لا يوجد سجل للرصيد بعد.</div>
            )}
            {creditLogs.map(log => (
              <div key={log.id} style={{ background: "#fff", borderRadius: 14, padding: "0.85rem 1rem", boxShadow: "0 2px 8px rgba(112,45,255,0.07)", border: "1px solid rgba(112,45,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Tajawal, sans-serif", fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}>{log.note || (log.type === "ADD" ? "إضافة رصيد" : "خصم رصيد")}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{new Date(log.createdAt).toLocaleDateString("ar-EG")} · {new Date(log.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: log.amount > 0 ? "#16a34a" : "#dc2626", flexShrink: 0 }}>
                  {log.amount > 0 ? "+" : ""}{log.amount}$
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <div id="dash-mobile-tabs" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#fff", borderTop: "1px solid #f0eeff", display: "flex", alignItems: "center", boxShadow: "0 -2px 16px rgba(112,45,255,0.08)", height: 60 }}>
        <div style={{ width: 50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #702dff, #9044ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.85rem", fontFamily: "Syne, sans-serif" }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
            gap: "0.2rem", height: "100%", border: "none", background: "none", cursor: "pointer",
            color: tab === key ? "#702dff" : "#c4b5fd",
            borderTop: tab === key ? "2px solid #702dff" : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            <Icon style={{ width: 18, height: 18, strokeWidth: tab === key ? 2.5 : 1.75 }} />
            <span style={{ fontSize: "0.65rem", fontWeight: tab === key ? 700 : 500, fontFamily: "Tajawal, sans-serif" }}>{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Unified product modal ── */}
      {productModal && (() => {
        const p = productModal;
        const hasStock = p.availableKeys > 0;
        const qty = quantities[p.id] ?? 1;
        const totalCost = p.priceInCredits * qty;
        const balanceAfter = user.credits - totalCost;
        const wouldExceedDebt = balanceAfter < DEBT_LIMIT;
        const maxQty = Math.min(p.availableKeys, 20);
        const gradIdx = products.indexOf(p);

        const changeQty = (delta: number) =>
          setQuantities(q => ({ ...q, [p.id]: Math.max(1, Math.min(maxQty, (q[p.id] ?? 1) + delta)) }));

        return (
          <div
            onClick={() => setProductModal(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(9,0,64,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="product-modal-sheet"
              style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column" as const }}
            >
              {/* Gradient header */}
              <div style={{ background: GRADIENTS[gradIdx % GRADIENTS.length], padding: "1.75rem 1.25rem 1.5rem", position: "relative", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -70, right: -50, pointerEvents: "none" }} />
                <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -50, left: -30, pointerEvents: "none" }} />

                {/* Close button */}
                <button
                  onClick={() => setProductModal(null)}
                  style={{ position: "absolute", top: "1rem", right: "1rem", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>

                {/* Stock + number badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", position: "relative", zIndex: 1 }}>
                  <span style={{ background: hasStock ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.22)", backdropFilter: "blur(4px)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)" }}>
                    {p.isManual ? "📦 تسليم يدوي" : hasStock ? "⚡ تسليم فوري" : "نفذ المخزون"}
                  </span>
                  {p.productNumber && <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 20, fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.15)" }}>#{p.productNumber}</span>}
                  {p.categoryName && <span style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)", fontSize: "0.6rem", fontWeight: 600, padding: "0.15rem 0.55rem", borderRadius: 20 }}>{p.categoryName}</span>}
                </div>

                {/* Icon + name */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative", zIndex: 1 }}>
                  <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 18, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", border: "1.5px solid rgba(255,255,255,0.3)", boxShadow: "0 6px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                    {p.isManual ? "📦" : "🔑"}
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 900, fontSize: "1.2rem", color: "#fff", margin: 0, lineHeight: 1.3 }}>{p.name}</h2>
                    <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem", marginTop: "0.25rem", fontWeight: 700 }}>
                      ${p.priceInCredits} <span style={{ fontWeight: 400 }}>رصيد / وحدة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column" as const, gap: "1rem", flex: 1 }}>

                {/* Description */}
                {p.description && (
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>الوصف</div>
                    <p style={{ fontSize: "0.9rem", color: "#374151", margin: 0, lineHeight: 1.65 }}>{p.description}</p>
                  </div>
                )}

                {/* Activation instructions */}
                {p.activationInstructions && (
                  <div style={{ background: "#f5f4ff", border: "1.5px solid rgba(112,45,255,0.15)", borderRadius: 14, padding: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#702dff", marginBottom: "0.5rem" }}>📋 تعليمات التفعيل</div>
                    <pre style={{ fontSize: "0.85rem", color: "#374151", whiteSpace: "pre-wrap" as const, fontFamily: "inherit", margin: 0, lineHeight: 1.7 }}>{p.activationInstructions}</pre>
                  </div>
                )}

                {/* ── Non-manual: qty + buy ── */}
                {!p.isManual && (
                  <>
                    {hasStock && (
                      <>
                        {/* Qty selector */}
                        <div>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>الكمية</div>
                          <div style={{ display: "flex", alignItems: "center", background: "#f5f4ff", borderRadius: 16, padding: "0.35rem 0.45rem", border: "1.5px solid rgba(112,45,255,0.1)" }}>
                            <button onClick={() => changeQty(-1)} disabled={qty <= 1} style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: qty <= 1 ? "transparent" : "#fff", color: qty <= 1 ? "#d1d5db" : "#702dff", fontWeight: 800, fontSize: "1.2rem", cursor: qty <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: qty <= 1 ? "none" : "0 2px 8px rgba(112,45,255,0.15)", flexShrink: 0, lineHeight: 1 }}>−</button>
                            <span style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: "1.1rem", color: "#090040" }}>{qty}</span>
                            <button onClick={() => changeQty(1)} disabled={qty >= maxQty} style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: qty >= maxQty ? "transparent" : "#fff", color: qty >= maxQty ? "#d1d5db" : "#702dff", fontWeight: 800, fontSize: "1.2rem", cursor: qty >= maxQty ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: qty >= maxQty ? "none" : "0 2px 8px rgba(112,45,255,0.15)", flexShrink: 0, lineHeight: 1 }}>+</button>
                          </div>
                        </div>

                        {/* Price summary */}
                        <div style={{ background: "#f9f9ff", borderRadius: 14, padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(112,45,255,0.08)" }}>
                          <span style={{ fontSize: "0.85rem", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>
                            ${p.priceInCredits} × {qty} وحدة
                          </span>
                          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#702dff" }}>${totalCost % 1 ? totalCost.toFixed(2) : totalCost} رصيد</span>
                        </div>
                      </>
                    )}

                    {manualError && (
                      <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.7rem 1rem", borderRadius: 12, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />{manualError}
                      </div>
                    )}

                    <button
                      onClick={() => handleBuy(p)}
                      disabled={!hasStock || buying === p.id}
                      style={{
                        width: "100%",
                        background: !hasStock ? "#f3f4f6" : wouldExceedDebt ? "#fff5f5" : "linear-gradient(135deg, #702dff, #9044ff)",
                        border: wouldExceedDebt && hasStock ? "1.5px solid #fecaca" : "none",
                        borderRadius: 16, padding: "0.9rem",
                        color: !hasStock ? "#9ca3af" : wouldExceedDebt ? "#dc2626" : "#fff",
                        fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1rem",
                        cursor: hasStock && !buying ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                        boxShadow: hasStock && !wouldExceedDebt ? "0 6px 20px rgba(112,45,255,0.4)" : "none",
                        minHeight: 52,
                      }}
                    >
                      {buying === p.id
                        ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />جاري الشراء...</>
                        : !hasStock ? "نفذ المخزون"
                        : wouldExceedDebt ? "رصيد غير كافٍ"
                        : qty > 1 ? `شراء ${qty} وحدات — $${totalCost % 1 ? totalCost.toFixed(2) : totalCost}`
                        : "شراء الآن"}
                    </button>
                  </>
                )}

                {/* ── Manual: email inputs + buy ── */}
                {p.isManual && (
                  <>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>البريد الإلكتروني للتفعيل</div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.55rem" }}>
                        {emailInputs.map((email, idx) => (
                          <div key={idx} style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                              type="email" value={email}
                              onChange={e => { const arr = [...emailInputs]; arr[idx] = e.target.value; setEmailInputs(arr); }}
                              placeholder={`البريد الإلكتروني ${idx + 1}`}
                              style={{ flex: 1, padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: "0.9rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif" }}
                              onFocus={e => e.target.style.borderColor = "#702dff"}
                              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                            />
                            {emailInputs.length > 1 && (
                              <button onClick={() => setEmailInputs(emailInputs.filter((_, i) => i !== idx))} style={{ width: 44, background: "#fff5f5", border: "1.5px solid #fecaca", borderRadius: 12, cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Minus style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setEmailInputs([...emailInputs, ""])} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", borderRadius: 12, padding: "0.5rem 1rem", color: "#702dff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", marginTop: "0.55rem", fontFamily: "Tajawal, sans-serif", width: "100%", justifyContent: "center" }}>
                        <Plus style={{ width: 14, height: 14 }} />إضافة إيميل آخر
                      </button>
                    </div>

                    <div style={{ background: "#f9f9ff", borderRadius: 14, padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(112,45,255,0.08)" }}>
                      <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>${p.priceInCredits} × {emailInputs.filter(e => e.trim()).length || 1} إيميل</span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#702dff" }}>${totalEmailCost} رصيد</span>
                    </div>

                    <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: "0.7rem 0.9rem" }}>
                      <p style={{ fontSize: "0.8rem", color: "#92400e", margin: 0 }}>⏳ سيعمل فريقنا على التفعيل وستصلك رسالة تأكيد.</p>
                    </div>

                    {manualError && (
                      <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.7rem 1rem", borderRadius: 12, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />{manualError}
                      </div>
                    )}

                    <button onClick={handleManualBuy} disabled={buyingManual} style={{ width: "100%", padding: "0.9rem", background: buyingManual ? "#a77fff" : "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 16, color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1rem", cursor: buyingManual ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 6px 20px rgba(112,45,255,0.4)", minHeight: 52 }}>
                      {buyingManual && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                      {buyingManual ? "جاري الشراء..." : `شراء — $${totalEmailCost} رصيد`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        .cat-slider::-webkit-scrollbar{display:none}
        .product-modal-sheet{animation:slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1) both}
        @media (min-width: 641px) {
          #dash-desktop-tabs { display: flex !important; }
          #dash-mobile-tabs { display: none !important; }
          .dash-wrap { padding-bottom: 1rem !important; }
          .product-modal-sheet { border-radius: 24px !important; margin: auto; }
        }
        @media (max-width: 640px) {
          #dash-desktop-tabs { display: none !important; }
          #dash-mobile-tabs { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getProducts, buyProduct, getMyOrders, buyManualProduct, getMyManualOrders } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Copy, Check, Loader2, AlertCircle, X, Plus, Minus } from "lucide-react";

interface User { id: string; name: string; email: string; role: string; credits: number; }
interface Product { id: string; name: string; description?: string; priceInCredits: number; availableKeys: number; isManual: boolean; }
interface Order { id: string; createdAt: string; creditsCost: number; product: { name: string }; licenseKey: { key: string }; }
interface ManualOrder { id: string; createdAt: string; creditsCost: number; emails: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED"; resultDetails?: string; product: { name: string }; }

const GRADIENTS = [
  "linear-gradient(135deg, #702dff 0%, #a77fff 100%)",
  "linear-gradient(135deg, #090040 0%, #702dff 100%)",
  "linear-gradient(135deg, #5a20d4 0%, #702dff 100%)",
  "linear-gradient(135deg, #702dff 0%, #090040 100%)",
];
const ICONS = ["🪟", "📦", "💿", "🔑", "🖥️", "⚙️", "🎮", "📱"];

const STATUS_MAP = {
  PENDING:     { label: "قيد الانتظار",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  IN_PROGRESS: { label: "جارٍ التنفيذ",  color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  COMPLETED:   { label: "مكتمل",          color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
};

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
  const [loading, setLoading] = useState(true);

  // Manual buy modal
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
      const [meRes, productsRes, ordersRes, manualRes] = await Promise.all([
        getMe(), getProducts(), getMyOrders(), getMyManualOrders(),
      ]);
      if (meRes.data.role === "ADMIN") { router.push("/admin"); return; }
      setUser(meRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setManualOrders(manualRes.data);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  };

  const handleBuy = async (product: Product) => {
    if (product.isManual) {
      setManualModal(product);
      setEmailInputs([""]);
      setManualError(null);
      return;
    }
    setBuying(product.id); setBuyError(null);
    try {
      await buyProduct(product.id);
      const [meRes, ordersRes] = await Promise.all([getMe(), getMyOrders()]);
      setUser(meRes.data); setOrders(ordersRes.data);
      setTab("orders");
    } catch (err: any) {
      setBuyError(err.response?.data?.error || "فشل الشراء");
    } finally { setBuying(null); }
  };

  const handleManualBuy = async () => {
    if (!manualModal) return;
    const validEmails = emailInputs.map(e => e.trim()).filter(e => e);
    if (validEmails.length === 0) { setManualError("أدخل بريداً إلكترونياً واحداً على الأقل"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validEmails.every(e => emailRegex.test(e))) { setManualError("تحقق من صحة البريد الإلكتروني"); return; }
    setBuyingManual(true); setManualError(null);
    try {
      await buyManualProduct(manualModal.id, validEmails);
      const [meRes, manualRes] = await Promise.all([getMe(), getMyManualOrders()]);
      setUser(meRes.data); setManualOrders(manualRes.data);
      setManualModal(null);
      setTab("orders");
    } catch (err: any) {
      setManualError(err.response?.data?.error || "فشل الشراء");
    } finally { setBuyingManual(false); }
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

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff" }}>
      <Navbar userName={user.name} credits={user.credits} />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 60%, #a77fff 100%)", padding: "2.5rem 2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -120, left: -60 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "2rem", fontWeight: 900, color: "#fff", marginBottom: "0.5rem" }}>
            مرحباً {user.name.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem" }}>
            رصيدك: <strong>{user.credits} رصيد</strong> · اكتشف أقوى الاشتراكات الرقمية
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(to right, transparent, #702dff40)" }} />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[{ key: "shop", label: "المتجر" }, { key: "orders", label: `طلباتي (${allOrders.length})` }].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as "shop" | "orders")} style={{
                padding: "0.5rem 1.25rem", borderRadius: 20, border: tab === key ? "none" : "1.5px solid rgba(112,45,255,0.2)",
                background: tab === key ? "linear-gradient(135deg, #702dff, #9044ff)" : "#fff",
                color: tab === key ? "#fff" : "#702dff",
                fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                boxShadow: tab === key ? "0 3px 14px rgba(112,45,255,0.35)" : "0 1px 6px rgba(0,0,0,0.08)",
              }}>{label}</button>
            ))}
          </div>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(to left, transparent, #702dff40)" }} />
        </div>

        {buyError && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1.25rem", fontSize: "0.875rem" }}>
            <AlertCircle style={{ width: 16, height: 16 }} />{buyError}
          </div>
        )}

        {/* Shop */}
        {tab === "shop" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {products.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem", color: "#9ca3af" }}>لا توجد منتجات متاحة</div>}
            {products.map((p, i) => {
              const canBuy = user.credits >= p.priceInCredits && p.availableKeys > 0;
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(112,45,255,0.1)", border: "1px solid rgba(112,45,255,0.08)", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(112,45,255,0.18)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(112,45,255,0.1)"; }}
                >
                  <div style={{ background: GRADIENTS[i % GRADIENTS.length], padding: "1.75rem 1.25rem", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.5rem", minHeight: 120, position: "relative" }}>
                    <div style={{ fontSize: "2.5rem", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}>{ICONS[i % ICONS.length]}</div>
                    {p.isManual ? (
                      <span style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.75rem", borderRadius: 20 }}>⚡ تفعيل يدوي</span>
                    ) : (
                      <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>
                        {p.availableKeys > 0 ? `${p.availableKeys} متوفر` : "نفذ المخزون"}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: "1.1rem 1.25rem 1.25rem" }}>
                    <h3 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1rem", color: "#090040", marginBottom: "0.3rem" }}>{p.name}</h3>
                    {p.description && <p style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: "0.5rem", lineHeight: 1.5 }}>{p.description}</p>}
                    {p.isManual && <p style={{ color: "#702dff", fontSize: "0.78rem", marginBottom: "0.5rem", fontWeight: 600 }}>🔧 يتطلب تفعيلاً من فريقنا</p>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.85rem" }}>
                      <div style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 900, fontSize: "1.1rem", color: "#702dff" }}>
                        {p.priceInCredits} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a77fff" }}>رصيد</span>
                      </div>
                      <button onClick={() => handleBuy(p)} disabled={!canBuy || buying === p.id} style={{
                        display: "flex", alignItems: "center", gap: "0.35rem",
                        background: canBuy ? "linear-gradient(135deg, #702dff, #9044ff)" : "#f3f4f6",
                        border: "none", borderRadius: 10, padding: "0.55rem 1.1rem",
                        color: canBuy ? "#fff" : "#9ca3af",
                        fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.85rem",
                        cursor: canBuy && buying !== p.id ? "pointer" : "not-allowed",
                        boxShadow: canBuy ? "0 3px 12px rgba(112,45,255,0.3)" : "none",
                      }}>
                        {buying === p.id && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
                        {buying === p.id ? "..." : "شراء"}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {allOrders.length === 0 && <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af", background: "#fff", borderRadius: 16 }}>لا توجد طلبات بعد.</div>}
            {allOrders.map(order => {
              if (order.type === "manual") {
                const mo = order as typeof manualOrders[0] & { type: "manual" };
                const st = STATUS_MAP[mo.status];
                return (
                  <div key={mo.id} style={{ background: "#fff", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 2px 12px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <p style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", margin: 0 }}>{mo.product.name}</p>
                          <span style={{ background: "#f5f4ff", color: "#702dff", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10, border: "1px solid rgba(112,45,255,0.2)" }}>تفعيل يدوي</span>
                        </div>
                        <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                          {new Date(mo.createdAt).toLocaleDateString("ar-EG")} · <span style={{ color: "#702dff", fontWeight: 700 }}>{mo.creditsCost} رصيد</span>
                        </p>
                      </div>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: "0.78rem", fontWeight: 700, padding: "0.3rem 0.85rem", borderRadius: 20, fontFamily: "Tajawal, sans-serif" }}>
                        {st.label}
                      </span>
                    </div>

                    {/* Emails */}
                    <div style={{ background: "#f9f9ff", borderRadius: 10, padding: "0.65rem 0.85rem", marginBottom: mo.resultDetails ? "0.75rem" : 0 }}>
                      <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: 0 }}>
                        📧 الإيميلات للتفعيل: <strong style={{ color: "#090040" }}>{mo.emails}</strong>
                      </p>
                    </div>

                    {/* Result details if completed */}
                    {mo.resultDetails && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "0.85rem 1rem", marginTop: "0.75rem" }}>
                        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#16a34a", marginBottom: "0.4rem" }}>✅ تفاصيل التفعيل:</p>
                        <pre style={{ fontSize: "0.85rem", color: "#090040", whiteSpace: "pre-wrap" as const, fontFamily: "inherit", margin: 0, lineHeight: 1.7 }}>{mo.resultDetails}</pre>
                      </div>
                    )}

                    {/* Pending notice */}
                    {mo.status === "PENDING" && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "0.65rem 0.85rem", marginTop: "0.75rem" }}>
                        <p style={{ fontSize: "0.78rem", color: "#92400e", margin: 0 }}>⏳ طلبك قيد المراجعة. سيصلك إشعار فور الانتهاء.</p>
                      </div>
                    )}
                  </div>
                );
              }

              // Regular key order
              const ko = order as typeof orders[0] & { type: "key" };
              return (
                <div key={ko.id} style={{ background: "#fff", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 2px 12px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "1rem" }}>
                  <div>
                    <p style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", margin: 0 }}>{ko.product.name}</p>
                    <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                      {new Date(ko.createdAt).toLocaleDateString("ar-EG")} · <span style={{ color: "#702dff", fontWeight: 700 }}>{ko.creditsCost} رصيد</span>
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#f5f4ff", border: "1.5px solid rgba(112,45,255,0.15)", borderRadius: 12, padding: "0.6rem 1rem", flex: "1", maxWidth: 420, minWidth: 200 }}>
                    <code style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "#702dff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{ko.licenseKey.key}</code>
                    <button onClick={() => copyKey(ko.licenseKey.key)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedKey === ko.licenseKey.key ? "#22c55e" : "#702dff", flexShrink: 0 }}>
                      {copiedKey === ko.licenseKey.key ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual buy modal */}
      {manualModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,0,64,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "2rem", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 900, fontSize: "1.2rem", color: "#090040", margin: 0 }}>🔧 {manualModal.name}</h2>
                <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.25rem" }}>أدخل الإيميل (أو الإيميلات) المراد التفعيل عليها</p>
              </div>
              <button onClick={() => setManualModal(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "0.4rem", cursor: "pointer", color: "#6b7280" }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
              {emailInputs.map((email, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="email" value={email}
                    onChange={e => { const arr = [...emailInputs]; arr[idx] = e.target.value; setEmailInputs(arr); }}
                    placeholder={`البريد الإلكتروني ${idx + 1}`}
                    style={{ flex: 1, padding: "0.7rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.875rem", outline: "none", color: "#111", fontFamily: "Tajawal, sans-serif" }}
                    onFocus={e => e.target.style.borderColor = "#702dff"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                  {emailInputs.length > 1 && (
                    <button onClick={() => setEmailInputs(emailInputs.filter((_, i) => i !== idx))} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.4rem", cursor: "pointer", color: "#dc2626", flexShrink: 0 }}>
                      <Minus style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setEmailInputs([...emailInputs, ""])} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", borderRadius: 10, padding: "0.5rem 1rem", color: "#702dff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", marginBottom: "1.25rem", fontFamily: "Tajawal, sans-serif" }}>
              <Plus style={{ width: 14, height: 14 }} />إضافة إيميل آخر
            </button>

            {manualError && (
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.7rem 1rem", borderRadius: 10, fontSize: "0.85rem", marginBottom: "1rem" }}>{manualError}</div>
            )}

            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "#92400e", margin: 0 }}>⏳ بعد الشراء، سيعمل فريقنا على التفعيل وستصلك رسالة تأكيد على بريدك الإلكتروني.</p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handleManualBuy} disabled={buyingManual} style={{ flex: 1, padding: "0.85rem", background: buyingManual ? "#a77fff" : "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 12, color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "0.95rem", cursor: buyingManual ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 20px rgba(112,45,255,0.35)" }}>
                {buyingManual && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                {buyingManual ? "جاري الشراء..." : `شراء — ${manualModal.priceInCredits} رصيد`}
              </button>
              <button onClick={() => setManualModal(null)} style={{ padding: "0.85rem 1.25rem", background: "#f3f4f6", border: "none", borderRadius: 12, color: "#6b7280", fontFamily: "Tajawal, sans-serif", fontWeight: 700, cursor: "pointer" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder{color:#9ca3af}`}</style>
    </div>
  );
}
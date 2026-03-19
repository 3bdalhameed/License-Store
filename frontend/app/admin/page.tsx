"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getCustomers, createCustomer, deleteCustomer, adjustCredits, getAllOrders, syncSheets, createProduct, getProducts, addKeys, getAllManualOrders, updateManualOrder, toggleManualProduct, updateProductPrice, addManualStock } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Users, ShoppingBag, RefreshCw, Plus, Trash2, Loader2, ChevronUp, ChevronDown, Package, AlertCircle, Check, KeyRound, Zap, Clock, Edit2 } from "lucide-react";

interface User { id: string; name: string; email: string; credits: number; createdAt: string; }
interface Order { id: string; orderNumber?: number; createdAt: string; creditsCost: number; user: { name: string; email: string }; product: { name: string }; licenseKey: { key: string }; }
interface Product { id: string; productNumber?: number; name: string; description?: string; priceInCredits: number; availableKeys: number; isManual: boolean; }
interface ManualOrder { id: string; orderNumber?: number; createdAt: string; creditsCost: number; emails: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"; resultDetails?: string; user: { name: string; email: string }; product: { name: string }; }
type Tab = "customers" | "orders" | "products" | "manual";

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.1)" };
const inp: React.CSSProperties = { width: "100%", padding: "0.75rem 0.9rem", background: "#f9f9ff", border: "1.5px solid #e5e7eb", borderRadius: 10, color: "#111", fontSize: "0.9rem", outline: "none", fontFamily: "Tajawal, sans-serif" };
const btnP: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 10, padding: "0.75rem 1.25rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 3px 12px rgba(112,45,255,0.3)", minHeight: 44 };

const STATUS_LABELS: Record<string, string> = { PENDING: "قيد الانتظار", IN_PROGRESS: "جارٍ التنفيذ", COMPLETED: "مكتمل", REJECTED: "مرفوض" };
const STATUS_COLORS: Record<string, string> = { PENDING: "#d97706", IN_PROGRESS: "#2563eb", COMPLETED: "#16a34a", REJECTED: "#dc2626" };
const STATUS_BG: Record<string, string> = { PENDING: "#fffbeb", IN_PROGRESS: "#eff6ff", COMPLETED: "#f0fdf4", REJECTED: "#fff5f5" };

export default function AdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [manualOrders, setManualOrders] = useState<ManualOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState(""); const [newEmail, setNewEmail] = useState(""); const [newPassword, setNewPassword] = useState(""); const [creating, setCreating] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [prodName, setProdName] = useState(""); const [prodDesc, setProdDesc] = useState(""); const [prodPrice, setProdPrice] = useState(""); const [creatingProd, setCreatingProd] = useState(false);
  const [addKeysProductId, setAddKeysProductId] = useState<string | null>(null);
  const [keysInput, setKeysInput] = useState(""); const [addingKeys, setAddingKeys] = useState(false); const [keysMsg, setKeysMsg] = useState<string | null>(null);
  const [creditUserId, setCreditUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(""); const [creditNote, setCreditNote] = useState(""); const [adjusting, setAdjusting] = useState(false);
  const [completeOrderId, setCompleteOrderId] = useState<string | null>(null);
  const [resultDetails, setResultDetails] = useState(""); const [completing, setCompleting] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(""); const [rejecting, setRejecting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editPriceId, setEditPriceId] = useState<string | null>(null); const [editPriceVal, setEditPriceVal] = useState("");
  const [manualStockId, setManualStockId] = useState<string | null>(null); const [manualStockVal, setManualStockVal] = useState(""); const [addingStock, setAddingStock] = useState(false); const [stockMsg, setStockMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const meRes = await getMe();
      if (meRes.data.role !== "ADMIN") { router.push("/dashboard"); return; }
      setAdmin(meRes.data);
      const [custRes, ordersRes, productsRes, manualRes] = await Promise.all([getCustomers(), getAllOrders(), getProducts(), getAllManualOrders()]);
      setCustomers(custRes.data); setOrders(ordersRes.data); setProducts(productsRes.data); setManualOrders(manualRes.data);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await syncSheets();
      setSyncMsg(`تم استيراد ${res.data.imported} مفتاح`);
      setProducts((await getProducts()).data);
    } catch (err: any) { setSyncMsg("خطأ: " + (err.response?.data?.error || "فشل")); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 5000); }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try {
      await createCustomer({ name: newName, email: newEmail, password: newPassword });
      setNewName(""); setNewEmail(""); setNewPassword(""); setShowCreateForm(false);
      setCustomers((await getCustomers()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setCreating(false); }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("حذف هذا العميل؟")) return;
    try { await deleteCustomer(id); setCustomers(prev => prev.filter(c => c.id !== id)); }
    catch (err: any) { setError(err.response?.data?.error || "فشل"); }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault(); if (!creditUserId) return;
    setAdjusting(true); setError(null);
    try {
      await adjustCredits(creditUserId, parseFloat(creditAmount), creditNote || undefined);
      setCreditUserId(null); setCreditAmount(""); setCreditNote("");
      setCustomers((await getCustomers()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setAdjusting(false); }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingProd(true); setError(null);
    try {
      await createProduct({ name: prodName, description: prodDesc || undefined, priceInCredits: parseFloat(prodPrice) });
      setProdName(""); setProdDesc(""); setProdPrice(""); setShowProductForm(false);
      setProducts((await getProducts()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setCreatingProd(false); }
  };

  const handleAddKeys = async (e: React.FormEvent) => {
    e.preventDefault(); if (!addKeysProductId) return;
    setAddingKeys(true); setKeysMsg(null);
    try {
      const res = await addKeys(addKeysProductId, keysInput);
      setKeysInput(""); setKeysMsg(`تمت إضافة ${res.data.added} مفاتيح`);
      setProducts((await getProducts()).data);
      setTimeout(() => { setKeysMsg(null); setAddKeysProductId(null); }, 3000);
    } catch (err: any) { setKeysMsg("خطأ: " + (err.response?.data?.error || "فشل")); }
    finally { setAddingKeys(false); }
  };

  const handleToggleManual = async (id: string) => {
    setTogglingId(id);
    try { await toggleManualProduct(id); setProducts((await getProducts()).data); }
    catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setTogglingId(null); }
  };

  const handleUpdatePrice = async (id: string) => {
    const price = parseFloat(editPriceVal);
    if (!price || price <= 0) return;
    try { await updateProductPrice(id, price); setEditPriceId(null); setEditPriceVal(""); setProducts((await getProducts()).data); }
    catch (err: any) { setError(err.response?.data?.error || "فشل"); }
  };

  const handleAddManualStock = async (e: React.FormEvent, productId: string) => {
    e.preventDefault(); const amount = parseInt(manualStockVal); if (!amount || amount < 1) return;
    setAddingStock(true); setStockMsg(null);
    try {
      await addManualStock(productId, amount);
      setStockMsg(`تمت إضافة ${amount}`); setManualStockVal("");
      setProducts((await getProducts()).data);
      setTimeout(() => { setStockMsg(null); setManualStockId(null); }, 3000);
    } catch (err: any) { setStockMsg("خطأ"); }
    finally { setAddingStock(false); }
  };

  const handleCompleteOrder = async (e: React.FormEvent, orderId: string, newStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED") => {
    e.preventDefault(); setCompleting(true);
    try {
      await updateManualOrder(orderId, newStatus, newStatus === "COMPLETED" ? resultDetails : undefined);
      setCompleteOrderId(null); setResultDetails("");
      setManualOrders((await getAllManualOrders()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setCompleting(false); }
  };

  const handleRejectOrder = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault(); setRejecting(true);
    try {
      await updateManualOrder(orderId, "REJECTED", undefined, rejectReason);
      setRejectOrderId(null); setRejectReason("");
      setManualOrders((await getAllManualOrders()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setRejecting(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 style={{ width: 28, height: 28, color: "#702dff", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pendingCount = manualOrders.filter(o => o.status !== "COMPLETED" && o.status !== "REJECTED").length;
  const tabs = [
    { key: "customers", label: "العملاء", icon: Users },
    { key: "orders", label: "الطلبات", icon: ShoppingBag },
    { key: "products", label: "المنتجات", icon: Package },
    { key: "manual", label: pendingCount > 0 ? `تفعيل (${pendingCount})` : "تفعيل", icon: Zap },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", paddingBottom: "5rem" }}>
      <Navbar userName={admin?.name || "Admin"} isAdmin />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 100%)", padding: "1.25rem", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" as const }}>
          <div>
            <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "clamp(1.1rem, 4vw, 1.5rem)", fontWeight: 900, color: "#fff", margin: 0 }}>لوحة الإدارة</h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
              {customers.length} عميل · {orders.length} طلب
              {pendingCount > 0 && <span style={{ background: "#fcd34d", color: "#92400e", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 10, marginRight: "0.4rem" }}>⚡ {pendingCount} معلق</span>}
            </p>
          </div>
          <button onClick={handleSync} disabled={syncing} style={{ ...btnP, background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.35)", boxShadow: "none", padding: "0.6rem 1rem", fontSize: "0.8rem" }}>
            {syncing ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 14, height: 14 }} />}
            {syncing ? "مزامنة..." : "مزامنة"}
          </button>
        </div>
      </div>

      <div className="admin-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0.75rem", paddingBottom: "5rem" }}>
        {syncMsg && <div style={{ padding: "0.75rem 1rem", borderRadius: 12, marginBottom: "0.75rem", fontSize: "0.85rem", background: syncMsg.startsWith("خطأ") ? "#fff5f5" : "#f0fdf4", border: `1px solid ${syncMsg.startsWith("خطأ") ? "#fecaca" : "#bbf7d0"}`, color: syncMsg.startsWith("خطأ") ? "#dc2626" : "#16a34a" }}>{syncMsg}</div>}
        {error && <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: 12, marginBottom: "0.75rem", fontSize: "0.85rem" }}>
          <AlertCircle style={{ width: 14, height: 14 }} />{error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "1rem" }}>×</button>
        </div>}

        {/* ── Desktop tab bar ── */}
        <div id="desktop-tabs" style={{ display: "none", gap: "0", marginBottom: "1.25rem", borderBottom: "2px solid #ede9fe" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as Tab)} style={{
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

        {/* ── Customers ── */}
        {tab === "customers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={card}>
              <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#702dff" }}><Plus style={{ width: 15, height: 15 }} />إنشاء عميل جديد</span>
                {showCreateForm ? <ChevronUp style={{ width: 15, height: 15, color: "#9ca3af" }} /> : <ChevronDown style={{ width: 15, height: 15, color: "#9ca3af" }} />}
              </button>
              {showCreateForm && (
                <form onSubmit={handleCreateCustomer} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0 1rem 1rem", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ paddingTop: "0.75rem" }}><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="الاسم الكامل" required style={inp} /></div>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="البريد الإلكتروني" required style={inp} />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" required minLength={6} style={inp} />
                  <button type="submit" disabled={creating} style={btnP}>{creating && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}{creating ? "جاري الإنشاء..." : "إنشاء الحساب"}</button>
                </form>
              )}
            </div>

            {/* Customer cards — mobile friendly */}
            {customers.length === 0 && <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>لا يوجد عملاء بعد</div>}
            {customers.map(c => (
              <React.Fragment key={c.id}>
                <div style={{ ...card, padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#090040" }}>{c.name}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: "0.15rem", wordBreak: "break-all" }}>{c.email}</div>
                      <span style={{ display: "inline-block", marginTop: "0.4rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>${c.credits} رصيد</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, marginRight: "0.5rem" }}>
                      <button onClick={() => setCreditUserId(creditUserId === c.id ? null : c.id)} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.4rem 0.65rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>رصيد</button>
                      <button onClick={() => handleDeleteCustomer(c.id)} style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.4rem 0.5rem", cursor: "pointer" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                    </div>
                  </div>
                  {creditUserId === c.id && (
                    <form onSubmit={handleAdjustCredits} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem", padding: "0.75rem", background: "#f5f4ff", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.8rem", color: "#702dff", fontWeight: 700 }}>تعديل رصيد {c.name}:</div>
                      <input type="number" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="مثال: 10 أو -5" required style={inp} />
                      <input value={creditNote} onChange={e => setCreditNote(e.target.value)} placeholder="ملاحظة (اختياري)" style={inp} />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="submit" disabled={adjusting} style={{ ...btnP, flex: 1, padding: "0.65rem" }}>{adjusting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}تطبيق</button>
                        <button type="button" onClick={() => setCreditUserId(null)} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                      </div>
                    </form>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Orders ── */}
        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {orders.length === 0 && <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>لا توجد طلبات</div>}
            {orders.map(o => (
              <div key={o.id} style={{ ...card, padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {o.orderNumber && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{o.orderNumber}</span>}
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#090040" }}>{o.product.name}</span>
                  </div>
                  <span style={{ color: "#702dff", fontWeight: 700, fontSize: "0.85rem" }}>${o.creditsCost}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>{o.user.name} · {new Date(o.createdAt).toLocaleDateString("ar-EG")}</div>
                <code style={{ display: "block", background: "#f5f4ff", color: "#702dff", padding: "0.5rem 0.75rem", borderRadius: 8, fontSize: "0.78rem", wordBreak: "break-all" }}>{o.licenseKey.key}</code>
              </div>
            ))}
          </div>
        )}

        {/* ── Products ── */}
        {tab === "products" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={card}>
              <button onClick={() => setShowProductForm(!showProductForm)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#702dff" }}><Plus style={{ width: 15, height: 15 }} />إضافة منتج</span>
                {showProductForm ? <ChevronUp style={{ width: 15, height: 15, color: "#9ca3af" }} /> : <ChevronDown style={{ width: 15, height: 15, color: "#9ca3af" }} />}
              </button>
              {showProductForm && (
                <form onSubmit={handleCreateProduct} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0 1rem 1rem", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ paddingTop: "0.75rem" }}><input value={prodName} onChange={e => setProdName(e.target.value)} placeholder="اسم المنتج" required style={inp} /></div>
                  <input type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} placeholder="السعر بالرصيد" required style={inp} />
                  <input value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="الوصف (اختياري)" style={inp} />
                  <button type="submit" disabled={creatingProd} style={btnP}>{creatingProd && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}{creatingProd ? "جاري..." : "إنشاء"}</button>
                </form>
              )}
            </div>

            {products.length === 0 && <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>لا توجد منتجات</div>}
            {products.map(p => (
              <React.Fragment key={p.id}>
                <div style={{ ...card, padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {p.productNumber && <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.1rem 0.35rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{p.productNumber}</span>}
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#090040" }}>{p.name}</span>
                      </div>
                      {p.description && <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.15rem" }}>{p.description}</div>}
                    </div>
                    <button onClick={() => handleToggleManual(p.id)} disabled={togglingId === p.id} style={{ background: p.isManual ? "#f5f4ff" : "#f3f4f6", border: `1px solid ${p.isManual ? "rgba(112,45,255,0.3)" : "#e5e7eb"}`, color: p.isManual ? "#702dff" : "#6b7280", borderRadius: 20, padding: "0.25rem 0.65rem", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", flexShrink: 0, marginRight: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      {togglingId === p.id ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Zap style={{ width: 11, height: 11 }} />}
                      {p.isManual ? "يدوي" : "عادي"}
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" as const }}>
                    {editPriceId === p.id ? (
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <input type="number" step="0.01" value={editPriceVal} onChange={e => setEditPriceVal(e.target.value)} style={{ ...inp, width: 90 }} autoFocus />
                        <button onClick={() => handleUpdatePrice(p.id)} style={{ ...btnP, padding: "0.4rem 0.65rem" }}><Check style={{ width: 13, height: 13 }} /></button>
                        <button onClick={() => setEditPriceId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", cursor: "pointer", color: "#6b7280" }}>×</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 20 }}>${p.priceInCredits} رصيد</span>
                        <button onClick={() => { setEditPriceId(p.id); setEditPriceVal(String(p.priceInCredits)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "0.2rem" }}><Edit2 style={{ width: 12, height: 12 }} /></button>
                      </div>
                    )}
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: p.availableKeys > 0 ? "#16a34a" : "#dc2626" }}>{p.availableKeys} مفاتيح</span>

                    {p.isManual ? (
                      <button onClick={() => { setManualStockId(manualStockId === p.id ? null : p.id); setManualStockVal(""); setStockMsg(null); }} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Plus style={{ width: 12, height: 12 }} />مخزون
                      </button>
                    ) : (
                      <button onClick={() => { setAddKeysProductId(addKeysProductId === p.id ? null : p.id); setKeysInput(""); setKeysMsg(null); }} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <KeyRound style={{ width: 12, height: 12 }} />مفاتيح
                      </button>
                    )}
                  </div>

                  {manualStockId === p.id && (
                    <form onSubmit={e => handleAddManualStock(e, p.id)} style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" as const, background: "#f5f4ff", padding: "0.75rem", borderRadius: 10 }}>
                      <input type="number" min="1" step="1" value={manualStockVal} onChange={e => setManualStockVal(e.target.value)} placeholder="عدد" required style={{ ...inp, width: 90 }} />
                      <button type="submit" disabled={addingStock} style={{ ...btnP, padding: "0.6rem 1rem" }}>{addingStock ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}إضافة</button>
                      <button type="button" onClick={() => setManualStockId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>إلغاء</button>
                      {stockMsg && <span style={{ fontSize: "0.75rem", color: stockMsg.startsWith("خطأ") ? "#dc2626" : "#16a34a" }}>{stockMsg}</span>}
                    </form>
                  )}

                  {addKeysProductId === p.id && (
                    <form onSubmit={handleAddKeys} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
                      <textarea value={keysInput} onChange={e => setKeysInput(e.target.value)} placeholder={"XXXXX-XXXXX\nYYYYY-YYYYY"} rows={4} required style={{ ...inp, resize: "none" as const, fontFamily: "monospace" }} />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="submit" disabled={addingKeys} style={{ ...btnP, flex: 1 }}>{addingKeys ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}{addingKeys ? "جاري..." : "إضافة"}</button>
                        <button type="button" onClick={() => setAddKeysProductId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                      </div>
                      {keysMsg && <div style={{ fontSize: "0.8rem", color: keysMsg.startsWith("خطأ") ? "#dc2626" : "#16a34a" }}>{keysMsg}</div>}
                    </form>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Manual Orders ── */}
        {tab === "manual" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {manualOrders.length === 0 && (
              <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                <Clock style={{ width: 32, height: 32, margin: "0 auto 0.5rem", opacity: 0.3 }} />
                <p>لا توجد طلبات تفعيل يدوي</p>
              </div>
            )}
            {manualOrders.map(o => (
              <div key={o.id} style={{ ...card, padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem", gap: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" as const }}>
                      {o.orderNumber && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{o.orderNumber}</span>}
                      <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#090040" }}>{o.product.name}</span>
                      <span style={{ background: STATUS_BG[o.status], color: STATUS_COLORS[o.status], fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 20 }}>{STATUS_LABELS[o.status]}</span>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: "0.2rem" }}>{o.user.name} · {new Date(o.createdAt).toLocaleDateString("ar-EG")} · <span style={{ color: "#702dff", fontWeight: 700 }}>${o.creditsCost}</span></div>
                  </div>
                </div>

                <div style={{ background: "#f9f9ff", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "0.6rem", fontSize: "0.78rem", color: "#374151" }}>
                  📧 {o.emails}
                </div>

                {o.resultDetails && (
                  <div style={{ background: o.status === "REJECTED" ? "#fff5f5" : "#f0fdf4", border: `1px solid ${o.status === "REJECTED" ? "#fecaca" : "#86efac"}`, borderRadius: 8, padding: "0.6rem 0.75rem", marginBottom: "0.6rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: o.status === "REJECTED" ? "#dc2626" : "#16a34a", marginBottom: "0.2rem" }}>{o.status === "REJECTED" ? "سبب الرفض:" : "تفاصيل التفعيل:"}</div>
                    <pre style={{ fontSize: "0.8rem", color: "#090040", whiteSpace: "pre-wrap" as const, fontFamily: "inherit", margin: 0 }}>{o.resultDetails}</pre>
                  </div>
                )}

                {o.status !== "COMPLETED" && o.status !== "REJECTED" && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
                    {o.status === "PENDING" && (
                      <button onClick={async e => { await handleCompleteOrder(e, o.id, "IN_PROGRESS"); }} style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#2563eb", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                        بدء التنفيذ
                      </button>
                    )}
                    <button onClick={() => setCompleteOrderId(completeOrderId === o.id ? null : o.id)} style={{ ...btnP, padding: "0.5rem 0.85rem", fontSize: "0.78rem" }}>
                      <Check style={{ width: 13, height: 13 }} />مكتمل
                    </button>
                    <button onClick={() => { setRejectOrderId(rejectOrderId === o.id ? null : o.id); setRejectReason(""); }} style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                      ✕ رفض
                    </button>
                  </div>
                )}

                {completeOrderId === o.id && (
                  <form onSubmit={e => handleCompleteOrder(e, o.id, "COMPLETED")} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
                    <textarea value={resultDetails} onChange={e => setResultDetails(e.target.value)} required rows={4} placeholder="تفاصيل التفعيل..." style={{ ...inp, resize: "none" as const }} />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" disabled={completing} style={{ ...btnP, flex: 1 }}>{completing ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}{completing ? "جاري..." : "إرسال وإتمام"}</button>
                      <button type="button" onClick={() => setCompleteOrderId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                    </div>
                  </form>
                )}

                {rejectOrderId === o.id && (
                  <form onSubmit={e => handleRejectOrder(e, o.id)} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column" as const, gap: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "0.75rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", fontFamily: "Tajawal, sans-serif" }}>سبب الرفض (سيُرجع الرصيد تلقائياً):</label>
                    <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="سبب الرفض..." style={{ ...inp, border: "1.5px solid #fecaca" }} required />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" disabled={rejecting} style={{ ...btnP, background: "#dc2626", boxShadow: "none", flex: 1 }}>{rejecting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : null}{rejecting ? "جاري..." : "تأكيد الرفض"}</button>
                      <button type="button" onClick={() => setRejectOrderId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div id="mobile-tabs" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#fff", borderTop: "1px solid #f0eeff", alignItems: "center", boxShadow: "0 -2px 16px rgba(112,45,255,0.08)", height: 60, display: "none" }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
            gap: "0.2rem", height: "100%", border: "none", background: "none", cursor: "pointer",
            color: tab === key ? "#702dff" : "#c4b5fd",
            borderTop: tab === key ? "2px solid #702dff" : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            <Icon style={{ width: 20, height: 20, strokeWidth: tab === key ? 2.5 : 1.75 }} />
            <span style={{ fontSize: "0.66rem", fontWeight: tab === key ? 700 : 500, fontFamily: "Tajawal, sans-serif" }}>{label}</span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder,textarea::placeholder{color:#9ca3af}
        @media (min-width: 641px) {
          #desktop-tabs { display: flex !important; }
          #mobile-tabs { display: none !important; }
          .admin-wrap { padding-bottom: 1rem !important; }
        }
        @media (max-width: 640px) {
          #desktop-tabs { display: none !important; }
          #mobile-tabs { display: flex !important; }
        }
      `}</style>

    </div>
  );
}
"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getCustomers, createCustomer, deleteCustomer, adjustCredits, getAllOrders, syncSheets, createProduct, getProducts, addKeys, getAllManualOrders, updateManualOrder, toggleManualProduct, updateProductPrice, addManualStock } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Users, ShoppingBag, RefreshCw, Plus, Trash2, Loader2, ChevronUp, ChevronDown, Package, AlertCircle, Check, KeyRound, Zap, Clock, Edit2 } from "lucide-react";

interface User { id: string; name: string; email: string; credits: number; createdAt: string; }
interface Order { id: string; createdAt: string; creditsCost: number; user: { name: string; email: string }; product: { name: string }; licenseKey: { key: string }; }
interface Product { id: string; productNumber?: number; name: string; description?: string; priceInCredits: number; availableKeys: number; isManual: boolean; }
interface ManualOrder { id: string; createdAt: string; creditsCost: number; emails: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"; resultDetails?: string; user: { name: string; email: string }; product: { name: string }; }
type Tab = "customers" | "orders" | "products" | "manual";

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.1)" };
const inp: React.CSSProperties = { width: "100%", padding: "0.65rem 0.9rem", background: "#f9f9ff", border: "1.5px solid #e5e7eb", borderRadius: 10, color: "#111", fontSize: "0.875rem", outline: "none", fontFamily: "Tajawal, sans-serif" };
const btnP: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 10, padding: "0.65rem 1.25rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 3px 12px rgba(112,45,255,0.3)" };
const th: React.CSSProperties = { textAlign: "left", padding: "0.85rem 1.25rem", color: "#6b7280", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #f3f4f6", background: "#fafafa" };
const td: React.CSSProperties = { padding: "0.9rem 1.25rem", borderBottom: "1px solid #f9f9ff", fontSize: "0.875rem", color: "#111827" };

const STATUS_LABELS = { PENDING: "قيد الانتظار", IN_PROGRESS: "جارٍ التنفيذ", COMPLETED: "مكتمل", REJECTED: "مرفوض" };
const STATUS_COLORS = { PENDING: "#d97706", IN_PROGRESS: "#2563eb", COMPLETED: "#16a34a", REJECTED: "#dc2626" };
const STATUS_BG = { PENDING: "#fffbeb", IN_PROGRESS: "#eff6ff", COMPLETED: "#f0fdf4", REJECTED: "#fff5f5" };

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

  // Manual orders
  const [completeOrderId, setCompleteOrderId] = useState<string | null>(null);
  const [resultDetails, setResultDetails] = useState("");
  const [completing, setCompleting] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Price edit
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");
  const [manualStockId, setManualStockId] = useState<string | null>(null);
  const [manualStockVal, setManualStockVal] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [stockMsg, setStockMsg] = useState<string | null>(null);

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
      setSyncMsg(`تم استيراد ${res.data.imported} مفتاح، تخطي ${res.data.skipped}`);
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
      setKeysInput("");
      setKeysMsg(`تمت إضافة ${res.data.added} مفاتيح`);
      setProducts((await getProducts()).data);
      setTimeout(() => { setKeysMsg(null); setAddKeysProductId(null); }, 3000);
    } catch (err: any) { setKeysMsg("خطأ: " + (err.response?.data?.error || "فشل")); }
    finally { setAddingKeys(false); }
  };

  const handleToggleManual = async (id: string) => {
    setTogglingId(id);
    try {
      await toggleManualProduct(id);
      setProducts((await getProducts()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setTogglingId(null); }
  };

  const handleUpdatePrice = async (id: string) => {
    const price = parseFloat(editPriceVal);
    if (!price || price <= 0) return;
    try {
      await updateProductPrice(id, price);
      setEditPriceId(null); setEditPriceVal("");
      setProducts((await getProducts()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
  };

  const handleAddManualStock = async (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    const amount = parseInt(manualStockVal);
    if (!amount || amount < 1) return;
    setAddingStock(true); setStockMsg(null);
    try {
      await addManualStock(productId, amount);
      setStockMsg(`تمت إضافة ${amount} إلى المخزون`);
      setManualStockVal("");
      setProducts((await getProducts()).data);
      setTimeout(() => { setStockMsg(null); setManualStockId(null); }, 3000);
    } catch (err: any) { setStockMsg("خطأ: " + (err.response?.data?.error || "فشل")); }
    finally { setAddingStock(false); }
  };

  const handleCompleteOrder = async (e: React.FormEvent, orderId: string, newStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED") => {
    e.preventDefault();
    setCompleting(true);
    try {
      await updateManualOrder(orderId, newStatus, newStatus === "COMPLETED" ? resultDetails : undefined);
      setCompleteOrderId(null); setResultDetails("");
      setManualOrders((await getAllManualOrders()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setCompleting(false); }
  };

  const handleRejectOrder = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    setRejecting(true);
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

  const pendingCount = manualOrders.filter(o => o.status !== "COMPLETED").length;
  const tabs = [
    { key: "customers", label: "العملاء", icon: Users },
    { key: "orders", label: "الطلبات", icon: ShoppingBag },
    { key: "products", label: "المنتجات", icon: Package },
    { key: "manual", label: `التفعيل اليدوي${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: Zap },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff" }}>
      <Navbar userName={admin?.name || "Admin"} isAdmin />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 100%)", padding: "2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -100, right: -60 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "1rem", position: "relative", zIndex: 1 }}>
          <div>
            <h1 style={{ fontFamily: "Tajawal, sans-serif", fontSize: "1.6rem", fontWeight: 900, color: "#fff", margin: 0 }}>لوحة الإدارة</h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {customers.length} عميل · {orders.length} طلب · {products.length} منتج
              {pendingCount > 0 && <span style={{ background: "#fcd34d", color: "#92400e", fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 20, marginRight: "0.5rem" }}>⚡ {pendingCount} تفعيل معلق</span>}
            </p>
          </div>
          <button onClick={handleSync} disabled={syncing} style={{ ...btnP, background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.35)", boxShadow: "none" }}>
            {syncing ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 15, height: 15 }} />}
            {syncing ? "جاري المزامنة..." : "مزامنة Google Sheets"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {syncMsg && <div style={{ padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1rem", fontSize: "0.875rem", background: syncMsg.startsWith("خطأ") ? "#fff5f5" : "#f0fdf4", border: `1px solid ${syncMsg.startsWith("خطأ") ? "#fecaca" : "#bbf7d0"}`, color: syncMsg.startsWith("خطأ") ? "#dc2626" : "#16a34a" }}>{syncMsg}</div>}
        {error && <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1rem", fontSize: "0.875rem" }}>
          <AlertCircle style={{ width: 15, height: 15 }} />{error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>×</button>
        </div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.75rem", borderBottom: "2px solid #ede9fe" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as Tab)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.25rem", border: "none", background: "none", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.9rem", color: tab === key ? "#702dff" : "#6b7280", borderBottom: tab === key ? "2.5px solid #702dff" : "2.5px solid transparent", marginBottom: "-2px" }}>
              <Icon style={{ width: 16, height: 16 }} />{label}
            </button>
          ))}
        </div>

        {/* ── Customers ── */}
        {tab === "customers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={card}>
              <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#702dff" }}><Plus style={{ width: 15, height: 15 }} />إنشاء حساب عميل جديد</span>
                {showCreateForm ? <ChevronUp style={{ width: 15, height: 15, color: "#9ca3af" }} /> : <ChevronDown style={{ width: 15, height: 15, color: "#9ca3af" }} />}
              </button>
              {showCreateForm && (
                <form onSubmit={handleCreateCustomer} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", padding: "0 1.25rem 1.25rem", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ paddingTop: "1rem" }}><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="الاسم الكامل" required style={inp} /></div>
                  <div style={{ paddingTop: "1rem" }}><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="البريد الإلكتروني" required style={inp} /></div>
                  <div style={{ paddingTop: "1rem" }}><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة المرور" required minLength={6} style={inp} /></div>
                  <button type="submit" disabled={creating} style={{ ...btnP, gridColumn: "1/-1" }}>{creating && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}{creating ? "جاري الإنشاء..." : "إنشاء الحساب"}</button>
                </form>
              )}
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead><tr><th style={th}>الاسم</th><th style={th}>البريد</th><th style={th}>الرصيد</th><th style={{ ...th, textAlign: "right" as const }}>إجراءات</th></tr></thead>
                <tbody>
                  {customers.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: "2.5rem" }}>لا يوجد عملاء بعد</td></tr>}
                  {customers.map(c => (
                    <React.Fragment key={c.id}>
                      <tr onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#faf9ff"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                        <td style={td}><span style={{ fontWeight: 700 }}>{c.name}</span></td>
                        <td style={{ ...td, color: "#6b7280" }}>{c.email}</td>
                        <td style={td}><span style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>${c.credits} رصيد</span></td>
                        <td style={{ ...td, textAlign: "right" as const }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                            <button onClick={() => setCreditUserId(creditUserId === c.id ? null : c.id)} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>رصيد</button>
                            <button onClick={() => handleDeleteCustomer(c.id)} style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.35rem 0.5rem", cursor: "pointer" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                          </div>
                        </td>
                      </tr>
                      {creditUserId === c.id && (
                        <tr>
                          <td colSpan={4} style={{ background: "#f5f4ff", borderBottom: "1px solid #f3f4f6", padding: "0.85rem 1.25rem" }}>
                            <form onSubmit={handleAdjustCredits} style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.8rem", color: "#702dff", fontWeight: 700, fontFamily: "Tajawal, sans-serif" }}>تعديل رصيد {c.name}:</span>
                              <input type="number" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="مثال: 10 أو -5" required style={{ ...inp, width: 130 }} />
                              <input value={creditNote} onChange={e => setCreditNote(e.target.value)} placeholder="ملاحظة (اختياري)" style={{ ...inp, flex: 1, minWidth: 120 }} />
                              <button type="submit" disabled={adjusting} style={{ ...btnP, padding: "0.5rem 1rem", fontSize: "0.8rem" }}>{adjusting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}تطبيق</button>
                              <button type="button" onClick={() => setCreditUserId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Orders ── */}
        {tab === "orders" && (
          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead><tr><th style={th}>العميل</th><th style={th}>المنتج</th><th style={th}>المفتاح</th><th style={th}>الرصيد</th><th style={th}>التاريخ</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: "2.5rem" }}>لا توجد طلبات</td></tr>}
                {orders.map(o => (
                  <tr key={o.id} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#faf9ff"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={td}><div style={{ fontWeight: 700 }}>{o.user.name}</div><div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{o.user.email}</div></td>
                    <td style={{ ...td, color: "#6b7280" }}>{o.product.name}</td>
                    <td style={td}><code style={{ background: "#f5f4ff", color: "#702dff", padding: "0.2rem 0.5rem", borderRadius: 6, fontSize: "0.75rem" }}>{o.licenseKey.key}</code></td>
                    <td style={td}><span style={{ color: "#702dff", fontWeight: 700 }}>${o.creditsCost}</span></td>
                    <td style={{ ...td, color: "#9ca3af", fontSize: "0.75rem" }}>{new Date(o.createdAt).toLocaleDateString("ar-EG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Products ── */}
        {tab === "products" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={card}>
              <button onClick={() => setShowProductForm(!showProductForm)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#702dff" }}><Plus style={{ width: 15, height: 15 }} />إضافة منتج جديد</span>
                {showProductForm ? <ChevronUp style={{ width: 15, height: 15, color: "#9ca3af" }} /> : <ChevronDown style={{ width: 15, height: 15, color: "#9ca3af" }} />}
              </button>
              {showProductForm && (
                <form onSubmit={handleCreateProduct} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", padding: "0 1.25rem 1.25rem", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ paddingTop: "1rem" }}><input value={prodName} onChange={e => setProdName(e.target.value)} placeholder="اسم المنتج" required style={inp} /></div>
                  <div style={{ paddingTop: "1rem" }}><input type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} placeholder="السعر بالرصيد" required style={inp} /></div>
                  <div style={{ gridColumn: "1/-1" }}><input value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="الوصف (اختياري)" style={inp} /></div>
                  <button type="submit" disabled={creatingProd} style={{ ...btnP, gridColumn: "1/-1" }}>{creatingProd && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}{creatingProd ? "جاري الإنشاء..." : "إنشاء المنتج"}</button>
                </form>
              )}
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead><tr><th style={th}>المنتج</th><th style={th}>السعر</th><th style={th}>المخزون</th><th style={th}>النوع</th><th style={{ ...th, textAlign: "right" as const }}>إجراءات</th></tr></thead>
                <tbody>
                  {products.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: "2.5rem" }}>لا توجد منتجات</td></tr>}
                  {products.map(p => (
                    <React.Fragment key={p.id}>
                      <tr onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#faf9ff"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {p.productNumber && <span style={{ background: "#f5f4ff", color: "#702dff", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 6, border: "1px solid rgba(112,45,255,0.2)", fontFamily: "monospace", flexShrink: 0 }}>#{p.productNumber}</span>}
                            <div style={{ fontWeight: 700 }}>{p.name}</div>
                          </div>
                          {p.description && <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.2rem" }}>{p.description}</div>}
                        </td>
                        <td style={td}>
                          {editPriceId === p.id ? (
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                              <input type="number" step="0.01" value={editPriceVal} onChange={e => setEditPriceVal(e.target.value)} style={{ ...inp, width: 80 }} autoFocus />
                              <button onClick={() => handleUpdatePrice(p.id)} style={{ ...btnP, padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}><Check style={{ width: 12, height: 12 }} /></button>
                              <button onClick={() => setEditPriceId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "0.3rem 0.6rem", cursor: "pointer", color: "#6b7280", fontSize: "0.75rem" }}>×</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>${p.priceInCredits} رصيد</span>
                              <button onClick={() => { setEditPriceId(p.id); setEditPriceVal(String(p.priceInCredits)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "0.2rem" }}><Edit2 style={{ width: 12, height: 12 }} /></button>
                            </div>
                          )}
                        </td>
                        <td style={td}><span style={{ fontWeight: 700, color: p.availableKeys > 0 ? "#16a34a" : "#dc2626" }}>{p.availableKeys} مفاتيح</span></td>
                        <td style={td}>
                          <button onClick={() => handleToggleManual(p.id)} disabled={togglingId === p.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: p.isManual ? "#f5f4ff" : "#f3f4f6", border: `1px solid ${p.isManual ? "rgba(112,45,255,0.3)" : "#e5e7eb"}`, color: p.isManual ? "#702dff" : "#6b7280", borderRadius: 20, padding: "0.25rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                            {togglingId === p.id ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Zap style={{ width: 11, height: 11 }} />}
                            {p.isManual ? "تفعيل يدوي" : "مفتاح عادي"}
                          </button>
                        </td>
                        <td style={{ ...td, textAlign: "right" as const }}>
                          {p.isManual ? (
                            <button onClick={() => { setManualStockId(manualStockId === p.id ? null : p.id); setManualStockVal(""); setStockMsg(null); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                              <Plus style={{ width: 13, height: 13 }} />إضافة مخزون
                            </button>
                          ) : (
                            <button onClick={() => { setAddKeysProductId(addKeysProductId === p.id ? null : p.id); setKeysInput(""); setKeysMsg(null); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                              <KeyRound style={{ width: 13, height: 13 }} />إضافة مفاتيح
                            </button>
                          )}
                        </td>
                      </tr>
                      {manualStockId === p.id && (
                        <tr>
                          <td colSpan={5} style={{ background: "#f5f4ff", borderBottom: "1px solid #f3f4f6", padding: "1.25rem" }}>
                            <form onSubmit={e => handleAddManualStock(e, p.id)} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const }}>
                              <p style={{ fontSize: "0.85rem", color: "#702dff", margin: 0, fontWeight: 700, fontFamily: "Tajawal, sans-serif" }}>إضافة مخزون لـ <strong>{p.name}</strong>:</p>
                              <input type="number" min="1" step="1" value={manualStockVal} onChange={e => setManualStockVal(e.target.value)} placeholder="عدد" required style={{ ...inp, width: 100 }} />
                              <button type="submit" disabled={addingStock} style={btnP}>{addingStock ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}{addingStock ? "جاري الإضافة..." : "إضافة"}</button>
                              <button type="button" onClick={() => setManualStockId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: "0.875rem" }}>إلغاء</button>
                              {stockMsg && <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 20, background: stockMsg.startsWith("خطأ") ? "#fff5f5" : "#f0fdf4", color: stockMsg.startsWith("خطأ") ? "#dc2626" : "#16a34a", border: `1px solid ${stockMsg.startsWith("خطأ") ? "#fecaca" : "#bbf7d0"}` }}>{stockMsg}</span>}
                            </form>
                          </td>
                        </tr>
                      )}
                      {addKeysProductId === p.id && (
                        <tr>
                          <td colSpan={5} style={{ background: "#f5f4ff", borderBottom: "1px solid #f3f4f6", padding: "1.25rem" }}>
                            <form onSubmit={handleAddKeys} style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <p style={{ fontSize: "0.85rem", color: "#702dff", margin: 0, fontWeight: 700, fontFamily: "Tajawal, sans-serif" }}>إضافة مفاتيح لـ <strong>{p.name}</strong></p>
                                {keysMsg && <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 20, background: keysMsg.startsWith("خطأ") ? "#fff5f5" : "#f0fdf4", color: keysMsg.startsWith("خطأ") ? "#dc2626" : "#16a34a", border: `1px solid ${keysMsg.startsWith("خطأ") ? "#fecaca" : "#bbf7d0"}` }}>{keysMsg}</span>}
                              </div>
                              <textarea value={keysInput} onChange={e => setKeysInput(e.target.value)} placeholder={"XXXXX-XXXXX\nYYYYY-YYYYY"} rows={4} required style={{ ...inp, resize: "none" as const, fontFamily: "monospace", lineHeight: 1.7 }} />
                              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                <button type="submit" disabled={addingKeys} style={btnP}>{addingKeys ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}{addingKeys ? "جاري الإضافة..." : "إضافة للمخزون"}</button>
                                <button type="button" onClick={() => setAddKeysProductId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: "0.875rem" }}>إلغاء</button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Manual Orders ── */}
        {tab === "manual" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {manualOrders.length === 0 && (
              <div style={{ ...card, padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
                <Clock style={{ width: 36, height: 36, margin: "0 auto 0.75rem", opacity: 0.3 }} />
                <p>لا توجد طلبات تفعيل يدوي</p>
              </div>
            )}
            {manualOrders.map(o => (
              <div key={o.id} style={{ ...card, padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                      <h3 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 800, fontSize: "1rem", color: "#090040", margin: 0 }}>{o.product.name}</h3>
                      <span style={{ background: STATUS_BG[o.status], color: STATUS_COLORS[o.status], fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>{STATUS_LABELS[o.status]}</span>
                    </div>
                    <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: 0 }}>
                      👤 {o.user.name} ({o.user.email}) · {new Date(o.createdAt).toLocaleDateString("ar-EG")} · <span style={{ color: "#702dff", fontWeight: 700 }}>{o.creditsCost} رصيد</span>
                    </p>
                  </div>

                  {/* Status actions */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
                    {o.status === "PENDING" && (
                      <button onClick={async e => { await handleCompleteOrder(e, o.id, "IN_PROGRESS"); }} style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#2563eb", borderRadius: 8, padding: "0.4rem 0.85rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                        بدء التنفيذ
                      </button>
                    )}
                    {o.status !== "COMPLETED" && o.status !== "REJECTED" && (
                      <button onClick={() => setCompleteOrderId(completeOrderId === o.id ? null : o.id)} style={{ ...btnP, padding: "0.4rem 0.85rem", fontSize: "0.75rem" }}>
                        <Check style={{ width: 13, height: 13 }} />تحديد كمكتمل
                      </button>
                    )}
                    {o.status !== "COMPLETED" && o.status !== "REJECTED" && (
                      <button onClick={() => { setRejectOrderId(rejectOrderId === o.id ? null : o.id); setRejectReason(""); }} style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.4rem 0.85rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                        ✕ رفض الطلب
                      </button>
                    )}
                  </div>
                </div>

                {/* Emails */}
                <div style={{ background: "#f9f9ff", borderRadius: 10, padding: "0.65rem 1rem", marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "0.8rem", color: "#374151", margin: 0 }}>
                    📧 <strong>الإيميلات للتفعيل:</strong> {o.emails}
                  </p>
                </div>

                {/* Result if completed */}
                {o.resultDetails && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "0.85rem 1rem" }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#16a34a", marginBottom: "0.35rem" }}>✅ تفاصيل التفعيل المُرسلة:</p>
                    <pre style={{ fontSize: "0.82rem", color: "#090040", whiteSpace: "pre-wrap" as const, fontFamily: "inherit", margin: 0, lineHeight: 1.7 }}>{o.resultDetails}</pre>
                  </div>
                )}

                {/* Reject form */}
                {rejectOrderId === o.id && (
                  <form onSubmit={e => handleRejectOrder(e, o.id)} style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column" as const, gap: "0.6rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12, padding: "1rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626", fontFamily: "Tajawal, sans-serif" }}>سبب الرفض (سيُرسل للعميل + سيُسترجع الرصيد تلقائياً):</label>
                    <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="مثال: المنتج غير متوفر حالياً" style={{ ...inp, border: "1.5px solid #fecaca" }} required />
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <button type="submit" disabled={rejecting} style={{ ...btnP, background: "#dc2626", boxShadow: "none" }}>
                        {rejecting ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                        {rejecting ? "جاري الرفض..." : "تأكيد الرفض واسترجاع الرصيد"}
                      </button>
                      <button type="button" onClick={() => setRejectOrderId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: "0.875rem" }}>إلغاء</button>
                    </div>
                  </form>
                )}

                {/* Complete form */}
                {completeOrderId === o.id && (
                  <form onSubmit={e => handleCompleteOrder(e, o.id, "COMPLETED")} style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column" as const, gap: "0.6rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#702dff", fontFamily: "Tajawal, sans-serif" }}>تفاصيل التفعيل (ستُرسل للعميل بالإيميل):</label>
                    <textarea value={resultDetails} onChange={e => setResultDetails(e.target.value)} required rows={4}
                      placeholder="أدخل تفاصيل التفعيل هنا — مثل: اسم المستخدم، كلمة المرور، رابط الدخول..."
                      style={{ ...inp, resize: "none" as const, lineHeight: 1.7 }} />
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <button type="submit" disabled={completing} style={btnP}>{completing ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}{completing ? "جاري الإرسال..." : "إرسال وإتمام الطلب"}</button>
                      <button type="button" onClick={() => setCompleteOrderId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: "0.875rem" }}>إلغاء</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder,textarea::placeholder{color:#9ca3af}`}</style>
    </div>
  );
}
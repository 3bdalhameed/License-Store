"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe, getCustomers, createCustomer, deleteCustomer, adjustCredits, getAllOrders,
  syncSheets, createProduct, getProducts, addKeys, getAllManualOrders, updateManualOrder,
  toggleManualProduct, updateProductPrice, addManualStock, getAdminStats,
  getPendingRegistrations, approveRegistration, rejectRegistration, updateProductInstructions,
  getCategories, createCategory, deleteCategory, updateProductCategory, reorderProducts,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  Users, ShoppingBag, RefreshCw, Plus, Trash2, Loader2, ChevronUp, ChevronDown,
  Package, AlertCircle, Check, KeyRound, Zap, Clock, Edit2, BarChart2, UserCheck, FileText, Tag,
} from "lucide-react";

interface User { id: string; name: string; email: string; credits: number; createdAt: string; }
interface PendingUser { id: string; name: string; email: string; phone?: string; storeLink?: string; createdAt: string; }
interface Order { id: string; orderNumber?: number; globalOrderNumber?: number; createdAt: string; creditsCost: number; user: { name: string; email: string }; product: { name: string }; licenseKey: { key: string }; }
interface Product { id: string; productNumber?: number; name: string; description?: string; activationInstructions?: string; priceInCredits: number; availableKeys: number; totalSold?: number | null; isManual: boolean; categoryId?: string | null; categoryName?: string | null; }
interface ManualOrder { id: string; orderNumber?: number; globalOrderNumber?: number; createdAt: string; creditsCost: number; emails: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"; resultDetails?: string; user: { name: string; email: string }; product: { name: string }; }
interface Stats { totalCustomers: number; totalOrders: number; pendingManualOrders: number; totalProducts: number; totalRevenue: number; }
interface Category { id: string; name: string; _count: { products: number }; }
type Tab = "stats" | "customers" | "registrations" | "orders" | "products" | "manual" | "categories";

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(112,45,255,0.08)", border: "1px solid rgba(112,45,255,0.1)" };
const inp: React.CSSProperties = { width: "100%", padding: "0.75rem 0.9rem", background: "#f9f9ff", border: "1.5px solid #e5e7eb", borderRadius: 10, color: "#111", fontSize: "0.9rem", outline: "none", fontFamily: "Tajawal, sans-serif" };
const btnP: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "linear-gradient(135deg, #702dff, #9044ff)", border: "none", borderRadius: 10, padding: "0.75rem 1.25rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 3px 12px rgba(112,45,255,0.3)", minHeight: 44 };

const STATUS_LABELS: Record<string, string> = { PENDING: "قيد الانتظار", IN_PROGRESS: "جارٍ التنفيذ", COMPLETED: "مكتمل", REJECTED: "مرفوض" };
const STATUS_COLORS: Record<string, string> = { PENDING: "#d97706", IN_PROGRESS: "#2563eb", COMPLETED: "#16a34a", REJECTED: "#dc2626" };
const STATUS_BG: Record<string, string> = { PENDING: "#fffbeb", IN_PROGRESS: "#eff6ff", COMPLETED: "#f0fdf4", REJECTED: "#fff5f5" };

function orderNum(o: { orderNumber?: number; globalOrderNumber?: number }) {
  return o.globalOrderNumber ?? o.orderNumber;
}

export default function AdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("stats");
  const [customers, setCustomers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [manualOrders, setManualOrders] = useState<ManualOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
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
  const [editInstructionsId, setEditInstructionsId] = useState<string | null>(null); const [instructionsVal, setInstructionsVal] = useState(""); const [savingInstructions, setSavingInstructions] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectRegId, setRejectRegId] = useState<string | null>(null); const [rejectRegReason, setRejectRegReason] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState(""); const [creatingCategory, setCreatingCategory] = useState(false); const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null); const [editCategoryVal, setEditCategoryVal] = useState<string>("");
  const [savingCategory, setSavingCategory] = useState(false);

  type StatsPeriod = "all" | "today" | "week" | "month" | "year";
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("all");
  const [statsLoading, setStatsLoading] = useState(false);

  const getDateRange = (period: StatsPeriod): { from?: string; to?: string } => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (period === "today") { const t = fmt(now); return { from: t, to: t }; }
    if (period === "week") { const d = new Date(now); d.setDate(now.getDate() - 6); return { from: fmt(d), to: fmt(now) }; }
    if (period === "month") { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: fmt(d), to: fmt(now) }; }
    if (period === "year") { return { from: `${now.getFullYear()}-01-01`, to: fmt(now) }; }
    return {};
  };

  const handleMoveProduct = async (id: string, direction: "up" | "down") => {
    const idx = products.findIndex(p => p.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === products.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...products];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const withOrder = updated.map((p, i) => ({ ...p, sortOrder: i }));
    setProducts(withOrder);
    await reorderProducts(withOrder.map((p, i) => ({ id: p.id, sortOrder: i })));
  };

  const handleStatsPeriodChange = async (period: StatsPeriod) => {
    setStatsPeriod(period);
    setStatsLoading(true);
    try {
      const { from, to } = getDateRange(period);
      const res = await getAdminStats(from, to);
      setStats(res.data);
    } finally { setStatsLoading(false); }
  };

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
      const [custRes, ordersRes, productsRes, manualRes, statsRes, pendingRes, categoriesRes] = await Promise.all([
        getCustomers(), getAllOrders(), getProducts(), getAllManualOrders(), getAdminStats(), getPendingRegistrations(), getCategories(),
      ]);
      setCustomers(custRes.data);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setManualOrders(manualRes.data);
      setStats(statsRes.data);
      setPendingUsers(pendingRes.data);
      setCategories(categoriesRes.data);
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
    } catch { setStockMsg("خطأ"); }
    finally { setAddingStock(false); }
  };

  const handleSaveInstructions = async (id: string) => {
    setSavingInstructions(true);
    try {
      await updateProductInstructions(id, instructionsVal);
      setEditInstructionsId(null); setInstructionsVal("");
      setProducts((await getProducts()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setSavingInstructions(false); }
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

  const handleApproveRegistration = async (id: string) => {
    setApprovingId(id);
    try {
      await approveRegistration(id);
      setPendingUsers(prev => prev.filter(u => u.id !== id));
      setCustomers((await getCustomers()).data);
      setStats((await getAdminStats()).data);
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setApprovingId(null); }
  };

  const handleRejectRegistration = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); setRejecting(true);
    try {
      await rejectRegistration(id, rejectRegReason || undefined);
      setRejectRegId(null); setRejectRegReason("");
      setPendingUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setRejecting(false); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingCategory(true); setCategoryError(null);
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      setCategories((await getCategories()).data);
    } catch (err: any) { setCategoryError(err.response?.data?.error || "فشل"); }
    finally { setCreatingCategory(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("حذف هذه الفئة؟ سيتم إلغاء ربطها بالمنتجات.")) return;
    try { await deleteCategory(id); setCategories((await getCategories()).data); setProducts((await getProducts()).data); }
    catch (err: any) { setError(err.response?.data?.error || "فشل"); }
  };

  const handleAssignCategory = async (productId: string, categoryId: string | null) => {
    setSavingCategory(true);
    try { await updateProductCategory(productId, categoryId); setProducts((await getProducts()).data); setEditCategoryId(null); }
    catch (err: any) { setError(err.response?.data?.error || "فشل"); }
    finally { setSavingCategory(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 style={{ width: 28, height: 28, color: "#702dff", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pendingCount = manualOrders.filter(o => o.status !== "COMPLETED" && o.status !== "REJECTED").length;
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "stats", label: "الإحصائيات", icon: BarChart2 },
    { key: "customers", label: "العملاء", icon: Users },
    { key: "registrations", label: pendingUsers.length > 0 ? `تسجيلات (${pendingUsers.length})` : "تسجيلات", icon: UserCheck },
    { key: "orders", label: "الطلبات", icon: ShoppingBag },
    { key: "products", label: "المنتجات", icon: Package },
    { key: "categories", label: "الفئات", icon: Tag },
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
              {stats?.totalCustomers ?? customers.length} عميل · {stats?.totalOrders ?? orders.length} طلب
              {pendingCount > 0 && <span style={{ background: "#fcd34d", color: "#92400e", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 10, marginRight: "0.4rem" }}>⚡ {pendingCount} معلق</span>}
              {pendingUsers.length > 0 && <span style={{ background: "#bfdbfe", color: "#1e40af", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 10, marginRight: "0.4rem" }}>👤 {pendingUsers.length} تسجيل جديد</span>}
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
        <div id="desktop-tabs" style={{ display: "none", gap: "0", marginBottom: "1.25rem", borderBottom: "2px solid #ede9fe", overflowX: "auto" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.65rem 1.1rem", border: "none", background: "none", cursor: "pointer",
              fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.875rem",
              color: tab === key ? "#702dff" : "#6b7280",
              borderBottom: tab === key ? "2.5px solid #702dff" : "2.5px solid transparent",
              marginBottom: "-2px", transition: "color 0.2s", whiteSpace: "nowrap" as const,
            }}>
              <Icon style={{ width: 15, height: 15 }} />{label}
            </button>
          ))}
        </div>

        {/* ── Stats ── */}
        {tab === "stats" && stats && (() => {
          const avgOrder = stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : "0.00";
          const lowStockProducts = products.filter(p => !p.isManual && p.availableKeys <= 3);
          const periodLabels: Record<string, string> = { all: "الكل", today: "اليوم", week: "الأسبوع", month: "الشهر", year: "السنة" };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

              {/* ── Period filter ── */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" as const }}>
                {(["all", "today", "week", "month", "year"] as const).map(p => (
                  <button key={p} onClick={() => handleStatsPeriodChange(p)} disabled={statsLoading} style={{
                    padding: "0.45rem 0.9rem", borderRadius: 10, border: "1.5px solid",
                    borderColor: statsPeriod === p ? "#702dff" : "#e5e7eb",
                    background: statsPeriod === p ? "#702dff" : "#fff",
                    color: statsPeriod === p ? "#fff" : "#374151",
                    fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.8rem",
                    cursor: statsLoading ? "not-allowed" : "pointer", opacity: statsLoading ? 0.6 : 1,
                  }}>
                    {periodLabels[p]}
                  </button>
                ))}
              </div>

              {/* ── Revenue hero ── */}
              <div style={{ background: "linear-gradient(135deg, #702dff 0%, #9044ff 100%)", borderRadius: 20, padding: "1.5rem 1.4rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -70, right: -55, pointerEvents: "none" }} />
                <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -50, left: -35, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem", fontFamily: "Tajawal, sans-serif" }}>إجمالي الإيرادات</div>
                  <div style={{ fontSize: "clamp(2rem,6vw,2.8rem)", fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    ${stats.totalRevenue.toFixed(2)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.85rem", flexWrap: "wrap" as const }}>
                    <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", borderRadius: 10, padding: "0.35rem 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>
                      <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal, sans-serif" }}>متوسط الطلب </span>
                      <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 800, fontFamily: "monospace" }}>${avgOrder}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", borderRadius: 10, padding: "0.35rem 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>
                      <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal, sans-serif" }}>الطلبات </span>
                      <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 800, fontFamily: "monospace" }}>{stats.totalOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4 KPI cards ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {([
                  { label: "العملاء", value: stats.totalCustomers, Icon: Users, color: "#702dff", bg: "#f5f4ff", border: "rgba(112,45,255,0.18)" },
                  { label: "الطلبات الكلية", value: stats.totalOrders, Icon: ShoppingBag, color: "#0ea5e9", bg: "#f0f9ff", border: "rgba(14,165,233,0.2)" },
                  { label: "المنتجات", value: stats.totalProducts, Icon: Package, color: "#16a34a", bg: "#f0fdf4", border: "rgba(22,163,74,0.2)" },
                  { label: "معلقة يدوية", value: stats.pendingManualOrders, Icon: Clock, color: "#d97706", bg: "#fffbeb", border: "rgba(217,119,6,0.2)" },
                ] as const).map(({ label, value, Icon, color, bg, border }) => (
                  <div key={label} style={{ background: "#fff", borderRadius: 18, padding: "1.1rem 1rem", boxShadow: "0 2px 14px rgba(112,45,255,0.07)", border: "1px solid rgba(112,45,255,0.08)", display: "flex", flexDirection: "column" as const, gap: "0.6rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 18, height: 18, color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "1.65rem", color: "#090040", fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem", fontFamily: "Tajawal, sans-serif" }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Action alerts ── */}
              {(pendingUsers.length > 0 || stats.pendingManualOrders > 0 || lowStockProducts.length > 0) && (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.55rem" }}>
                  {pendingUsers.length > 0 && (
                    <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 14, padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <UserCheck style={{ width: 16, height: 16, color: "#2563eb" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#1e3a5f", fontWeight: 800, fontFamily: "Tajawal, sans-serif" }}>{pendingUsers.length} تسجيل جديد</div>
                          <div style={{ fontSize: "0.7rem", color: "#60a5fa" }}>بانتظار الموافقة</div>
                        </div>
                      </div>
                      <button onClick={() => setTab("registrations")} style={{ background: "#2563eb", border: "none", borderRadius: 10, padding: "0.4rem 0.85rem", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", flexShrink: 0 }}>مراجعة</button>
                    </div>
                  )}
                  {stats.pendingManualOrders > 0 && (
                    <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 14, padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Zap style={{ width: 16, height: 16, color: "#d97706" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#78350f", fontWeight: 800, fontFamily: "Tajawal, sans-serif" }}>{stats.pendingManualOrders} طلب تفعيل</div>
                          <div style={{ fontSize: "0.7rem", color: "#f59e0b" }}>يدوي معلق</div>
                        </div>
                      </div>
                      <button onClick={() => setTab("manual")} style={{ background: "#d97706", border: "none", borderRadius: 10, padding: "0.4rem 0.85rem", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", flexShrink: 0 }}>معالجة</button>
                    </div>
                  )}
                  {lowStockProducts.length > 0 && (
                    <div style={{ background: "#fff5f5", border: "1.5px solid #fecaca", borderRadius: 14, padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <AlertCircle style={{ width: 16, height: 16, color: "#dc2626" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#7f1d1d", fontWeight: 800, fontFamily: "Tajawal, sans-serif" }}>{lowStockProducts.length} منتج مخزونه منخفض</div>
                          <div style={{ fontSize: "0.7rem", color: "#f87171" }}>{lowStockProducts.map(p => p.name).join("، ")}</div>
                        </div>
                      </div>
                      <button onClick={() => setTab("products")} style={{ background: "#dc2626", border: "none", borderRadius: 10, padding: "0.4rem 0.85rem", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", flexShrink: 0 }}>إضافة</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Breakdown card ── */}
              <div style={{ ...card, padding: "1.1rem 1.25rem" }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#090040", marginBottom: "1rem", fontFamily: "Tajawal, sans-serif" }}>تفاصيل إضافية</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "0" }}>
                  {[
                    { label: "عملاء نشطون", value: stats.totalCustomers, color: "#702dff", max: Math.max(stats.totalCustomers, 1) },
                    { label: "إجمالي الطلبات", value: stats.totalOrders, color: "#0ea5e9", max: Math.max(stats.totalOrders, 1) },
                    { label: "تسجيلات معلقة", value: pendingUsers.length, color: "#2563eb", max: Math.max(pendingUsers.length, stats.totalCustomers, 1) },
                    { label: "طلبات يدوية معلقة", value: stats.pendingManualOrders, color: "#d97706", max: Math.max(stats.pendingManualOrders, stats.totalOrders, 1) },
                  ].map(({ label, value, color, max }, idx, arr) => (
                    <div key={label} style={{ paddingTop: idx === 0 ? 0 : "0.7rem", paddingBottom: "0.7rem", borderBottom: idx < arr.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "0.82rem", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>{label}</span>
                        <strong style={{ fontSize: "0.9rem", color: "#090040", fontFamily: "monospace" }}>{value}</strong>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "#f3f4f6", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((value / max) * 100)}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ── Pending Registrations ── */}
        {tab === "registrations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pendingUsers.length === 0 && (
              <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                <UserCheck style={{ width: 32, height: 32, margin: "0 auto 0.5rem", opacity: 0.3 }} />
                <p>لا توجد طلبات تسجيل معلقة</p>
              </div>
            )}
            {pendingUsers.map(u => (
              <div key={u.id} style={{ ...card, padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#090040" }}>{u.name}</div>
                    <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: "0.15rem", wordBreak: "break-all" as const }}>{u.email}</div>
                    {u.phone && (
                      <div style={{ fontSize: "0.78rem", color: "#374151", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ color: "#25D366" }}>📱</span>
                        <a href={`https://wa.me/${u.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none", fontFamily: "monospace" }}>{u.phone}</a>
                      </div>
                    )}
                    {u.storeLink && (
                      <div style={{ fontSize: "0.75rem", marginTop: "0.15rem" }}>
                        <a href={u.storeLink} target="_blank" rel="noopener noreferrer" style={{ color: "#702dff", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" as const }}>🔗 {u.storeLink}</a>
                      </div>
                    )}
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{new Date(u.createdAt).toLocaleDateString("ar-EG")}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    <button
                      onClick={() => handleApproveRegistration(u.id)}
                      disabled={approvingId === u.id}
                      style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", borderRadius: 8, padding: "0.4rem 0.75rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", display: "flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      {approvingId === u.id ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 12, height: 12 }} />}
                      قبول
                    </button>
                    <button
                      onClick={() => setRejectRegId(rejectRegId === u.id ? null : u.id)}
                      style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.4rem 0.75rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}
                    >
                      رفض
                    </button>
                  </div>
                </div>
                {rejectRegId === u.id && (
                  <form onSubmit={e => handleRejectRegistration(e, u.id)} style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem", marginTop: "0.75rem", padding: "0.75rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10 }}>
                    <input value={rejectRegReason} onChange={e => setRejectRegReason(e.target.value)} placeholder="سبب الرفض (اختياري)" style={{ ...inp, border: "1.5px solid #fecaca" }} />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" disabled={rejecting} style={{ ...btnP, background: "#dc2626", boxShadow: "none", flex: 1, padding: "0.6rem" }}>
                        {rejecting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : null}
                        تأكيد الرفض
                      </button>
                      <button type="button" onClick={() => setRejectRegId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "0.6rem 1rem", cursor: "pointer", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

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

            {customers.length === 0 && <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>لا يوجد عملاء بعد</div>}
            {customers.map(c => (
              <React.Fragment key={c.id}>
                <div style={{ ...card, padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#090040" }}>{c.name}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: "0.15rem", wordBreak: "break-all" as const }}>{c.email}</div>
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
                    {orderNum(o) && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{orderNum(o)}</span>}
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#090040" }}>{o.product.name}</span>
                  </div>
                  <span style={{ color: "#702dff", fontWeight: 700, fontSize: "0.85rem" }}>${o.creditsCost}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>{o.user.name} · {new Date(o.createdAt).toLocaleDateString("ar-EG")}</div>
                <code style={{ display: "block", background: "#f5f4ff", color: "#702dff", padding: "0.5rem 0.75rem", borderRadius: 8, fontSize: "0.78rem", wordBreak: "break-all" as const }}>{o.licenseKey.key}</code>
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
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#090040" }}>{p.isManual ? "📦" : "🔑"} {p.name}</span>
                      </div>
                      {p.description && <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.15rem" }}>{p.description}</div>}
                    </div>
                    {/* Reorder buttons */}
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "2px", flexShrink: 0, marginRight: "0.25rem" }}>
                      <button onClick={() => handleMoveProduct(p.id, "up")} disabled={products.indexOf(p) === 0} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 5, padding: "0.1rem 0.3rem", cursor: "pointer", color: "#6b7280", lineHeight: 1, fontSize: "0.7rem" }}>▲</button>
                      <button onClick={() => handleMoveProduct(p.id, "down")} disabled={products.indexOf(p) === products.length - 1} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 5, padding: "0.1rem 0.3rem", cursor: "pointer", color: "#6b7280", lineHeight: 1, fontSize: "0.7rem" }}>▼</button>
                    </div>
                    <button onClick={() => handleToggleManual(p.id)} disabled={togglingId === p.id} style={{ background: p.isManual ? "#f5f4ff" : "#f3f4f6", border: `1px solid ${p.isManual ? "rgba(112,45,255,0.3)" : "#e5e7eb"}`, color: p.isManual ? "#702dff" : "#6b7280", borderRadius: 20, padding: "0.25rem 0.65rem", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", flexShrink: 0, marginRight: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      {togglingId === p.id ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Zap style={{ width: 11, height: 11 }} />}
                      {p.isManual ? "يدوي" : "تلقائي"}
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
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: p.availableKeys > 0 ? "#16a34a" : "#dc2626" }}>{p.availableKeys} {p.isManual ? "مخزون" : "مفاتيح"}</span>
                    {!p.isManual && p.totalSold != null && (
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#2563eb" }}>{p.totalSold} مبيعة</span>
                    )}

                    {p.isManual ? (
                      <button onClick={() => { setManualStockId(manualStockId === p.id ? null : p.id); setManualStockVal(""); setStockMsg(null); }} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Plus style={{ width: 12, height: 12 }} />مخزون
                      </button>
                    ) : (
                      <button onClick={() => { setAddKeysProductId(addKeysProductId === p.id ? null : p.id); setKeysInput(""); setKeysMsg(null); }} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <KeyRound style={{ width: 12, height: 12 }} />مفاتيح
                      </button>
                    )}

                    {/* Instructions button */}
                    <button onClick={() => { setEditInstructionsId(editInstructionsId === p.id ? null : p.id); setInstructionsVal(p.activationInstructions || ""); }} style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <FileText style={{ width: 12, height: 12 }} />تعليمات
                    </button>
                    {/* Category button */}
                    <button onClick={() => { setEditCategoryId(editCategoryId === p.id ? null : p.id); setEditCategoryVal(p.categoryId || ""); }} style={{ background: p.categoryId ? "#f0fdf4" : "#f5f4ff", border: `1px solid ${p.categoryId ? "#86efac" : "rgba(112,45,255,0.2)"}`, color: p.categoryId ? "#16a34a" : "#702dff", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Tag style={{ width: 12, height: 12 }} />{p.categoryName || "فئة"}
                    </button>
                  </div>

                  {editInstructionsId === p.id && (
                    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
                      <textarea
                        value={instructionsVal}
                        onChange={e => setInstructionsVal(e.target.value)}
                        placeholder="تعليمات التفعيل التي ستظهر للعملاء..."
                        rows={4}
                        style={{ ...inp, resize: "none" as const }}
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleSaveInstructions(p.id)} disabled={savingInstructions} style={{ ...btnP, flex: 1 }}>
                          {savingInstructions ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}
                          {savingInstructions ? "جاري الحفظ..." : "حفظ التعليمات"}
                        </button>
                        <button onClick={() => setEditInstructionsId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", color: "#6b7280", fontFamily: "Tajawal, sans-serif" }}>إلغاء</button>
                      </div>
                    </div>
                  )}

                  {editCategoryId === p.id && (
                    <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" as const, background: "#f5f4ff", padding: "0.75rem", borderRadius: 10 }}>
                      <select
                        value={editCategoryVal}
                        onChange={e => setEditCategoryVal(e.target.value)}
                        style={{ ...inp, flex: 1 }}
                      >
                        <option value="">-- بدون فئة --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button onClick={() => handleAssignCategory(p.id, editCategoryVal || null)} disabled={savingCategory} style={{ ...btnP, padding: "0.6rem 1rem" }}>
                        {savingCategory ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 13, height: 13 }} />}حفظ
                      </button>
                      <button onClick={() => setEditCategoryId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>إلغاء</button>
                    </div>
                  )}

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

        {/* ── Categories ── */}
        {tab === "categories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {categoryError && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: 12, fontSize: "0.85rem" }}>
                <AlertCircle style={{ width: 14, height: 14 }} />{categoryError}
                <button onClick={() => setCategoryError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "1rem" }}>×</button>
              </div>
            )}
            <div style={card}>
              <form onSubmit={handleCreateCategory} style={{ display: "flex", gap: "0.5rem", padding: "1rem", alignItems: "center" }}>
                <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="اسم الفئة الجديدة" required style={{ ...inp, flex: 1 }} />
                <button type="submit" disabled={creatingCategory} style={{ ...btnP, padding: "0.65rem 1rem", flexShrink: 0 }}>
                  {creatingCategory ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 14, height: 14 }} />}
                  إضافة
                </button>
              </form>
            </div>
            {categories.length === 0 && <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#9ca3af" }}>لا توجد فئات بعد</div>}
            {categories.map(c => (
              <div key={c.id} style={{ ...card, padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Tag style={{ width: 16, height: 16, color: "#702dff" }} />
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#090040" }}>{c.name}</span>
                  <span style={{ background: "#f5f4ff", border: "1px solid rgba(112,45,255,0.2)", color: "#702dff", fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 20 }}>{c._count.products} منتج</span>
                </div>
                <button onClick={() => handleDeleteCategory(c.id)} style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.4rem 0.5rem", cursor: "pointer" }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
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
                      {orderNum(o) && <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#702dff", fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.4rem", borderRadius: 5, border: "1px solid rgba(112,45,255,0.2)" }}>#{orderNum(o)}</span>}
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
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
            gap: "0.15rem", height: "100%", border: "none", background: "none", cursor: "pointer",
            color: tab === key ? "#702dff" : "#c4b5fd",
            borderTop: tab === key ? "2px solid #702dff" : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            <Icon style={{ width: 18, height: 18, strokeWidth: tab === key ? 2.5 : 1.75 }} />
            <span style={{ fontSize: "0.58rem", fontWeight: tab === key ? 700 : 500, fontFamily: "Tajawal, sans-serif" }}>{label.split(" ")[0]}</span>
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

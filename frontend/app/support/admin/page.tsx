"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, Filter, Plus, RefreshCw, Download,
  Clock, AlertCircle, CheckCircle2, Bell, Users,
  ChevronDown, LogOut, ArrowUpRight, Eye, X,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Ticket, TicketStatus, TicketPriority, TicketCategory,
  STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG,
} from "../types";
import { getSupportUser, setSupportUser, clearSupportSession } from "../auth";
import {
  getSupportTickets, deleteSupportTicketApi,
} from "@/lib/api";
import {
  getSupportEmployees, createSupportEmployee, deleteSupportEmployee, updateSupportEmployee,
  getTelegramSettings, saveTelegramSettings, testTelegramSettings,
} from "@/lib/api";
import type { TelegramConfig } from "../telegram";

interface SupportEmployee {
  id: string;
  name: string;
  email: string;
  telegramChatId?: string | null;
  createdAt: string;
}

const PURPLE = "#702dff";

function SupportNav({ userName, role }: { userName: string; role: string }) {
  const router = useRouter();
  const logout = () => { clearSupportSession(); router.push("/support/login"); };
  return (
    <nav style={{ background: "linear-gradient(135deg,#702dff,#9044ff)", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.25rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 16px rgba(112,45,255,.35)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/logo.png" alt="logo" style={{ height: 106, width: "auto", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
        </div>
        <div>
          <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "0.95rem", color: "#fff", lineHeight: 1.1 }}>نظام دعم العملاء</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,.7)" }}>لوحة الإدارة</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <button onClick={() => router.push("/admin")} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.75rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
          لوحة المتجر
        </button>
        <span style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 20, padding: "0.2rem 0.75rem", color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>
          {role === "ADMIN" ? "مدير" : "موظف"}
        </span>
        <span style={{ color: "rgba(255,255,255,.85)", fontSize: "0.85rem", fontWeight: 500 }}>{userName}</span>
        <button onClick={logout} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, padding: "0.35rem 0.65rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
          <LogOut style={{ width: 14, height: 14 }} /> خروج
        </button>
      </div>
    </nav>
  );
}

function StatCard({ label, value, icon, color, bg, sub, urgent }: { label: string; value: number; icon: string; color: string; bg: string; sub?: string; urgent?: boolean }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "1.1rem 1.25rem", border: `1.5px solid ${urgent && value > 0 ? color : "#e5e7eb"}`, boxShadow: urgent && value > 0 ? `0 4px 20px ${color}30` : "0 2px 10px rgba(0,0,0,.05)", display: "flex", alignItems: "center", gap: "0.9rem", position: "relative", overflow: "hidden" }}>
      {urgent && value > 0 && <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", background: color, borderRadius: "0 16px 16px 0" }} />}
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.78rem", color: "#6b7280", fontWeight: 500 }}>{label}</div>
        <div style={{ fontWeight: 900, fontSize: "1.65rem", color: urgent && value > 0 ? color : "#090040", lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: "0.7rem", color: color, fontWeight: 700, marginTop: "0.1rem" }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const c = STATUS_CONFIG[status];
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 20, padding: "0.18rem 0.6rem", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{c.icon} {c.label}</span>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const c = PRIORITY_CONFIG[priority];
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 20, padding: "0.18rem 0.55rem", fontSize: "0.68rem", fontWeight: 700 }}>{c.label}</span>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 60000;
  if (diff < 60) return `منذ ${Math.floor(diff)} دقيقة`;
  if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
}

function isOld(iso: string): boolean {
  return (Date.now() - new Date(iso).getTime()) > 72 * 3600_000;
}

export default function SupportAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; id: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "ALL">("ALL");
  const [filterPriority, setFilterPriority] = useState<TicketPriority | "ALL">("ALL");
  const [filterCategory, setFilterCategory] = useState<TicketCategory | "ALL">("ALL");
  const [filterEmployee, setFilterEmployee] = useState("ALL");
  const [filterNotified, setFilterNotified] = useState<"ALL" | "YES" | "NO">("ALL");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "priority">("updatedAt");
  const [showFilters, setShowFilters] = useState(false);

  // Employee management tab
  const [activeTab, setActiveTab]     = useState<"tickets" | "employees">("tickets");
  const [showTgSettings, setShowTgSettings] = useState(false);
  const [employees, setEmployees]     = useState<SupportEmployee[]>([]);
  const [newEmpName, setNewEmpName]   = useState("");
  const [newEmpUser, setNewEmpUser]   = useState("");
  const [newEmpPass, setNewEmpPass]   = useState("");
  const [empError,   setEmpError]     = useState("");
  const [empSuccess, setEmpSuccess]   = useState("");
  const [editingEmpId,       setEditingEmpId]       = useState<string | null>(null);
  const [editingEmpPass,     setEditingEmpPass]     = useState("");
  const [editingEmpTelegram, setEditingEmpTelegram] = useState<string | null>(null);
  const [editingEmpTgVal,    setEditingEmpTgVal]    = useState("");

  // Telegram settings
  const [tgConfig,    setTgConfig]    = useState<TelegramConfig>({ botToken: "", adminChatId: "" });
  const [tgSaved,     setTgSaved]     = useState(false);
  const [tgTesting,   setTgTesting]   = useState<"admin" | "emp" | null>(null);
  const [tgTestResult, setTgTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [tgTestEmpId, setTgTestEmpId] = useState("");

  useEffect(() => {
    let s = getSupportUser();
    if (!s) {
      // Bootstrap admin session from main store JWT
      const mainToken = localStorage.getItem("token");
      if (mainToken) {
        try {
          const payload = JSON.parse(atob(mainToken.split(".")[1]));
          if (payload.role === "ADMIN") {
            s = { id: payload.id, name: "الإدارة", role: "ADMIN" };
            setSupportUser(s);
          }
        } catch {}
      }
    }
    if (!s) { router.push("/support/login"); return; }
    if (s.role !== "ADMIN") { router.push("/support/employee"); return; }
    setUser({ name: s.name, role: s.role, id: s.id });
    fetchTickets();
    getSupportEmployees().then(r => setEmployees(r.data)).catch(() => {});
    getTelegramSettings().then(r => setTgConfig(r.data)).catch(() => {});

    const interval = setInterval(fetchTickets, 15_000);
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = () => {
    getSupportTickets().then(r => setTickets(r.data)).catch(() => {});
  };

  const reload = fetchTickets;

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("هل تريد حذف هذه التذكرة نهائياً؟")) return;
    await deleteSupportTicketApi(id).catch(() => {});
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  // Names that appear in tickets (for the filter dropdown)
  const ticketEmployeeNames = useMemo(() => {
    const names = new Set(tickets.map(t => t.employeeName));
    return Array.from(names);
  }, [tickets]);

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.requestNumber.toLowerCase().includes(q) ||
        t.activationEmail.toLowerCase().includes(q) ||
        t.employeeName.toLowerCase().includes(q) ||
        t.productType.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "ALL") list = list.filter(t => t.status === filterStatus);
    if (filterPriority !== "ALL") list = list.filter(t => t.priority === filterPriority);
    if (filterCategory !== "ALL") list = list.filter(t => t.category === filterCategory);
    if (filterEmployee !== "ALL") list = list.filter(t => t.employeeName === filterEmployee);
    if (filterNotified === "YES") list = list.filter(t => t.customerNotified);
    if (filterNotified === "NO") list = list.filter(t => !t.customerNotified && t.status === "RESOLVED");

    list.sort((a, b) => {
      if (sortBy === "priority") {
        const order = { URGENT: 0, HIGH: 1, NORMAL: 2 };
        return order[a.priority] - order[b.priority];
      }
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
    });
    return list;
  }, [tickets, search, filterStatus, filterPriority, filterCategory, filterEmployee, filterNotified, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: tickets.length,
    new: tickets.filter(t => t.status === "NEW").length,
    inProgress: tickets.filter(t => ["UNDER_REVIEW", "IN_PROGRESS"].includes(t.status)).length,
    needsInfo: tickets.filter(t => t.status === "ADDITIONAL_INFO_REQUIRED").length,
    resolved: tickets.filter(t => t.status === "RESOLVED").length,
    resolvedNotNotified: tickets.filter(t => t.status === "RESOLVED" && !t.customerNotified).length,
    open: tickets.filter(t => !["CLOSED", "CANCELLED"].includes(t.status)).length,
  }), [tickets]);

  const exportXLSX = () => {
    const rows = filtered.map(t => ({
      "رقم التذكرة": t.id,
      "رقم الطلب": t.requestNumber,
      "الإيميل": t.activationEmail,
      "المنتج": t.productType,
      "الحالة": STATUS_CONFIG[t.status].label,
      "الأولوية": PRIORITY_CONFIG[t.priority].label,
      "التصنيف": CATEGORY_CONFIG[t.category].label,
      "الموظف": t.employeeName,
      "أُبلغ العميل": t.customerNotified ? "نعم" : "لا",
      "تاريخ الإنشاء": new Date(t.createdAt).toLocaleDateString("ar-EG"),
      "آخر تحديث": new Date(t.updatedAt).toLocaleDateString("ar-EG"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التذاكر");
    XLSX.writeFile(wb, `support-tickets-${Date.now()}.xlsx`);
  };

  const handleAddEmployee = async () => {
    setEmpError(""); setEmpSuccess("");
    if (!newEmpName.trim() || !newEmpUser.trim() || !newEmpPass.trim()) {
      setEmpError("يرجى تعبئة جميع الحقول"); return;
    }
    try {
      await createSupportEmployee(newEmpName.trim(), newEmpUser.trim(), newEmpPass.trim());
      const r = await getSupportEmployees();
      setEmployees(r.data);
      setNewEmpName(""); setNewEmpUser(""); setNewEmpPass("");
      setEmpSuccess(`تم إنشاء الحساب بنجاح`);
      setTimeout(() => setEmpSuccess(""), 3000);
    } catch (err: any) {
      setEmpError(err?.response?.data?.error || "فشل إنشاء الحساب");
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف حساب "${name}"؟`)) return;
    try {
      await deleteSupportEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch {
      alert("فشل حذف الحساب");
    }
  };

  const handleUpdatePass = async (id: string) => {
    if (!editingEmpPass.trim()) return;
    try {
      await updateSupportEmployee(id, { password: editingEmpPass.trim() });
      setEditingEmpId(null); setEditingEmpPass("");
    } catch {
      alert("فشل تحديث كلمة المرور");
    }
  };

  const handleUpdateTelegram = async (id: string) => {
    try {
      await updateSupportEmployee(id, { telegramChatId: editingEmpTgVal.trim() || "" });
      setEditingEmpTelegram(null); setEditingEmpTgVal("");
      const r = await getSupportEmployees();
      setEmployees(r.data);
    } catch {
      alert("فشل تحديث معرف تليجرام");
    }
  };

  const handleSaveTgConfig = async () => {
    try {
      await saveTelegramSettings(tgConfig.botToken, tgConfig.adminChatId);
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 2500);
    } catch (err: any) {
      alert("فشل حفظ الإعدادات: " + (err?.response?.data?.error || err?.message || "خطأ غير معروف"));
    }
  };

  const handleTestTelegram = async (target: "admin" | "emp") => {
    setTgTesting(target); setTgTestResult(null);
    const chatId = target === "admin" ? tgConfig.adminChatId : tgTestEmpId;
    try {
      const res = await testTelegramSettings(tgConfig.botToken, chatId);
      setTgTestResult(res.data);
    } catch {
      setTgTestResult({ ok: false, error: "فشل الاتصال" });
    }
    setTgTesting(null);
  };

  if (!user) return null;

  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" };
  const inp: React.CSSProperties = { width: "100%", padding: "0.6rem 0.85rem", background: "#f9f9ff", border: "1.5px solid #e5e7eb", borderRadius: 10, color: "#111", fontSize: "0.85rem", outline: "none", fontFamily: "Tajawal,sans-serif" };
  const selectStyle: React.CSSProperties = { ...inp, width: "auto", minWidth: 120 };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", paddingBottom: "3rem" }}>
      <SupportNav userName={user.name} role={user.role} />

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 900, fontSize: "1.4rem", color: "#090040", margin: 0 }}>لوحة متابعة التذاكر</h1>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.2rem", fontFamily: "Tajawal,sans-serif" }}>إدارة شاملة لجميع تذاكر دعم العملاء</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={reload} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "0.55rem 0.9rem", cursor: "pointer", color: "#374151", fontSize: "0.8rem", fontFamily: "Tajawal,sans-serif", fontWeight: 600 }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> تحديث
            </button>
            <button onClick={exportXLSX} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "0.55rem 0.9rem", cursor: "pointer", color: "#374151", fontSize: "0.8rem", fontFamily: "Tajawal,sans-serif", fontWeight: 600 }}>
              <Download style={{ width: 14, height: 14 }} /> تصدير Excel
            </button>
            <button onClick={() => router.push("/support/tickets/new")} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "linear-gradient(135deg,#702dff,#9044ff)", border: "none", borderRadius: 10, padding: "0.55rem 1.1rem", cursor: "pointer", color: "#fff", fontSize: "0.85rem", fontFamily: "Tajawal,sans-serif", fontWeight: 700, boxShadow: "0 3px 12px rgba(112,45,255,.35)" }}>
              <Plus style={{ width: 15, height: 15 }} /> تذكرة جديدة
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#fff", border: "1px solid rgba(112,45,255,.12)", borderRadius: 14, padding: "0.3rem", marginBottom: "1.25rem", gap: "0.3rem", width: "fit-content", flexWrap: "wrap" }}>
          {([
            { key: "tickets",   label: "التذاكر",        icon: "🎫" },
            { key: "employees", label: "إدارة الموظفين", icon: "👥" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.83rem", background: activeTab === t.key ? PURPLE : "transparent", color: activeTab === t.key ? "#fff" : "#6b7280", boxShadow: activeTab === t.key ? "0 2px 10px rgba(112,45,255,.3)" : "none", transition: "all .15s" }}>
              <span>{t.icon}</span> {t.label}
              {t.key === "employees" && <span style={{ background: activeTab === t.key ? "rgba(255,255,255,.25)" : "#f5f4ff", color: activeTab === t.key ? "#fff" : PURPLE, borderRadius: 20, padding: "0 0.45rem", fontSize: "0.7rem", fontWeight: 800 }}>{employees.length}</span>}
            </button>
          ))}
        </div>

        {/* ── Employee Management Tab ── */}
        {activeTab === "employees" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Create new employee */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
              <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040", marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #f3f4f6" }}>
                ➕ إضافة موظف جديد
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.65rem", alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.3rem", fontFamily: "Tajawal,sans-serif" }}>الاسم الكامل</label>
                  <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="مثال: سارة الموظفة" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.3rem", fontFamily: "Tajawal,sans-serif" }}>البريد الإلكتروني</label>
                  <input type="email" value={newEmpUser} onChange={e => setNewEmpUser(e.target.value)} placeholder="مثال: sara@support.com" style={{ ...inp, direction: "ltr" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.3rem", fontFamily: "Tajawal,sans-serif" }}>كلمة المرور</label>
                  <input type="password" value={newEmpPass} onChange={e => setNewEmpPass(e.target.value)} placeholder="••••••" style={{ ...inp, direction: "ltr" }} />
                </div>
                <button onClick={handleAddEmployee} style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 10, padding: "0.6rem 1.1rem", cursor: "pointer", color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(112,45,255,.3)" }}>
                  إضافة
                </button>
              </div>
              {empError   && <div style={{ marginTop: "0.65rem", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 9, padding: "0.5rem 0.8rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", color: "#dc2626", fontWeight: 600 }}>⚠️ {empError}</div>}
              {empSuccess && <div style={{ marginTop: "0.65rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 9, padding: "0.5rem 0.8rem", fontFamily: "Tajawal,sans-serif", fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>✓ {empSuccess}</div>}
            </div>

            {/* Employee list */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6", fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#090040" }}>
                👥 الموظفون الحاليون ({employees.length})
              </div>
              {employees.length === 0 ? (
                <div style={{ padding: "2.5rem", textAlign: "center", fontFamily: "Tajawal,sans-serif", color: "#9ca3af" }}>لا يوجد موظفون — أضف أول موظف من النموذج أعلاه</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Tajawal,sans-serif" }}>
                  <thead>
                    <tr style={{ background: "#f9f9ff" }}>
                      {["الاسم", "البريد الإلكتروني", "تاريخ الإنشاء", "التذاكر المفتوحة", "كلمة المرور", "معرف تليجرام", ""].map(h => (
                        <th key={h} style={{ padding: "0.7rem 0.9rem", textAlign: "right", fontSize: "0.73rem", fontWeight: 800, color: "#6b7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const openCount = tickets.filter(t => t.employeeName === emp.name && !["CLOSED","CANCELLED"].includes(t.status)).length;
                      return (
                        <tr key={emp.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.75rem 0.9rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>👤</div>
                              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#090040" }}>{emp.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 0.9rem" }}>
                            <code style={{ background: "#f5f4ff", color: PURPLE, borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>{emp.email}</code>
                          </td>
                          <td style={{ padding: "0.75rem 0.9rem", fontSize: "0.78rem", color: "#9ca3af" }}>
                            {new Date(emp.createdAt).toLocaleDateString("ar-EG")}
                          </td>
                          <td style={{ padding: "0.75rem 0.9rem" }}>
                            <span style={{ background: openCount > 0 ? "#fff7ed" : "#f9fafb", color: openCount > 0 ? "#ea580c" : "#9ca3af", borderRadius: 20, padding: "0.15rem 0.6rem", fontSize: "0.75rem", fontWeight: 700 }}>
                              {openCount} مفتوحة
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 0.9rem" }}>
                            {editingEmpId === emp.id ? (
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <input type="password" value={editingEmpPass} onChange={e => setEditingEmpPass(e.target.value)} placeholder="كلمة مرور جديدة" style={{ ...inp, width: 140, fontSize: "0.78rem", padding: "0.4rem 0.6rem" }} />
                                <button onClick={() => handleUpdatePass(emp.id)} style={{ background: "#16a34a", border: "none", borderRadius: 7, padding: "0.4rem 0.7rem", cursor: "pointer", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>حفظ</button>
                                <button onClick={() => { setEditingEmpId(null); setEditingEmpPass(""); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "0.4rem 0.7rem", cursor: "pointer", fontSize: "0.75rem" }}>إلغاء</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingEmpId(emp.id); setEditingEmpPass(""); }} style={{ background: "#f5f4ff", border: `1px solid rgba(112,45,255,.2)`, borderRadius: 7, padding: "0.35rem 0.7rem", cursor: "pointer", color: PURPLE, fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", fontWeight: 600 }}>
                                تغيير
                              </button>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 0.9rem" }}>
                            {editingEmpTelegram === emp.id ? (
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <input value={editingEmpTgVal} onChange={e => setEditingEmpTgVal(e.target.value)} placeholder="Chat ID" style={{ ...inp, width: 130, fontSize: "0.78rem", padding: "0.4rem 0.6rem", direction: "ltr" }} />
                                <button onClick={() => handleUpdateTelegram(emp.id)} style={{ background: "#16a34a", border: "none", borderRadius: 7, padding: "0.4rem 0.7rem", cursor: "pointer", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>حفظ</button>
                                <button onClick={() => { setEditingEmpTelegram(null); setEditingEmpTgVal(""); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "0.4rem 0.7rem", cursor: "pointer", fontSize: "0.75rem" }}>إلغاء</button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                {emp.telegramChatId
                                  ? <code style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.75rem", fontWeight: 700 }}>{emp.telegramChatId}</code>
                                  : <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>غير محدد</span>
                                }
                                <button onClick={() => { setEditingEmpTelegram(emp.id); setEditingEmpTgVal(emp.telegramChatId ?? ""); }} style={{ background: "#f5f4ff", border: `1px solid rgba(112,45,255,.2)`, borderRadius: 7, padding: "0.25rem 0.55rem", cursor: "pointer", color: PURPLE, fontFamily: "Tajawal,sans-serif", fontSize: "0.7rem", fontWeight: 600 }}>
                                  تعديل
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 0.9rem" }}>
                            <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 7, padding: "0.35rem 0.7rem", cursor: "pointer", color: "#dc2626", fontFamily: "Tajawal,sans-serif", fontSize: "0.75rem", fontWeight: 600 }}>
                              حذف
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Telegram settings — hidden toggle */}
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={() => setShowTgSettings(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#6b7280", padding: "0.35rem 0" }}>
                <span style={{ fontSize: "0.75rem", transition: "transform .2s", display: "inline-block", transform: showTgSettings ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                إعدادات التليجرام
                {(tgConfig.botToken || tgConfig.adminChatId) && <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", borderRadius: 20, padding: "0 0.45rem", fontSize: "0.65rem", fontWeight: 800 }}>مفعّل</span>}
              </button>

              {showTgSettings && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 680, marginTop: "0.75rem" }}>

                  <div style={{ background: "#fff", borderRadius: 14, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "#090040", marginBottom: "0.25rem" }}>📨 إعدادات بوت التليجرام</div>
                    <p style={{ fontFamily: "Tajawal,sans-serif", fontSize: "0.76rem", color: "#6b7280", margin: "0 0 1rem" }}>
                      أدخل رمز البوت ومعرف المحادثة لتفعيل الإشعارات التلقائية.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.3rem", fontFamily: "Tajawal,sans-serif" }}>🤖 رمز البوت (Bot Token)</label>
                        <input value={tgConfig.botToken} onChange={e => setTgConfig(c => ({ ...c, botToken: e.target.value }))}
                          placeholder="123456789:ABC-DEF..." style={{ ...inp, direction: "ltr", fontFamily: "monospace", letterSpacing: "0.03em" }} />
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.25rem", fontFamily: "Tajawal,sans-serif" }}>
                          احصل عليه من <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: PURPLE, fontWeight: 700 }}>@BotFather</a>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.3rem", fontFamily: "Tajawal,sans-serif" }}>🔑 معرف محادثة المدير (Admin Chat ID)</label>
                        <input value={tgConfig.adminChatId} onChange={e => setTgConfig(c => ({ ...c, adminChatId: e.target.value }))}
                          placeholder="مثال: 123456789" style={{ ...inp, direction: "ltr", fontFamily: "monospace" }} />
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.25rem", fontFamily: "Tajawal,sans-serif" }}>
                          استخدم <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: PURPLE, fontWeight: 700 }}>@userinfobot</a> للحصول على معرفك
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                        <button onClick={handleSaveTgConfig} style={{ background: `linear-gradient(135deg,${PURPLE},#9044ff)`, border: "none", borderRadius: 10, padding: "0.55rem 1.25rem", cursor: "pointer", color: "#fff", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.82rem", boxShadow: "0 3px 10px rgba(112,45,255,.3)" }}>
                          💾 حفظ
                        </button>
                        {tgSaved && <span style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "0.4rem 0.8rem", color: "#16a34a", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.78rem" }}>✓ تم الحفظ</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#fff", borderRadius: 14, padding: "1.25rem", border: "1px solid rgba(112,45,255,.1)", boxShadow: "0 2px 12px rgba(112,45,255,.07)" }}>
                    <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "#090040", marginBottom: "0.85rem" }}>🧪 اختبار الاتصال</div>
                    <div style={{ marginBottom: "0.85rem", paddingBottom: "0.85rem", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem", fontFamily: "Tajawal,sans-serif" }}>اختبار إشعار المدير</div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button onClick={() => handleTestTelegram("admin")} disabled={tgTesting === "admin" || !tgConfig.botToken || !tgConfig.adminChatId}
                          style={{ background: "#f5f4ff", border: `1.5px solid ${PURPLE}`, borderRadius: 9, padding: "0.45rem 0.9rem", cursor: "pointer", color: PURPLE, fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.78rem", opacity: (!tgConfig.botToken || !tgConfig.adminChatId) ? 0.5 : 1 }}>
                          {tgTesting === "admin" ? "⏳ جاري..." : "📩 اختبر الآن"}
                        </button>
                        {tgTestResult && tgTesting === null && (
                          <span style={{ background: tgTestResult.ok ? "#f0fdf4" : "#fff5f5", border: `1px solid ${tgTestResult.ok ? "#86efac" : "#fecaca"}`, borderRadius: 8, padding: "0.35rem 0.75rem", color: tgTestResult.ok ? "#16a34a" : "#dc2626", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.75rem" }}>
                            {tgTestResult.ok ? "✅ ناجح!" : `❌ ${tgTestResult.error}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem", fontFamily: "Tajawal,sans-serif" }}>اختبار إشعار الموظف</div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <input value={tgTestEmpId} onChange={e => setTgTestEmpId(e.target.value)} placeholder="Chat ID للموظف"
                          style={{ ...inp, width: 170, direction: "ltr", fontFamily: "monospace" }} />
                        <button onClick={() => handleTestTelegram("emp")} disabled={tgTesting === "emp" || !tgConfig.botToken || !tgTestEmpId.trim()}
                          style={{ background: "#f5f4ff", border: `1.5px solid ${PURPLE}`, borderRadius: 9, padding: "0.45rem 0.9rem", cursor: "pointer", color: PURPLE, fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.78rem", opacity: (!tgConfig.botToken || !tgTestEmpId.trim()) ? 0.5 : 1 }}>
                          {tgTesting === "emp" ? "⏳ جاري..." : "📩 اختبر الآن"}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tickets Tab ── */}
        {activeTab === "tickets" && <>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.85rem", marginBottom: "1.25rem" }}>
          <StatCard label="إجمالي التذاكر"    value={stats.total}               icon="📋" color="#702dff" bg="#f5f4ff" />
          <StatCard label="جديدة"             value={stats.new}                 icon="🔵" color="#2563eb" bg="#eff6ff" urgent />
          <StatCard label="قيد التنفيذ"        value={stats.inProgress}          icon="⚙️" color="#ea580c" bg="#fff7ed" urgent />
          <StatCard label="تحتاج معلومات"      value={stats.needsInfo}           icon="❓" color="#d97706" bg="#fffbeb" urgent sub={stats.needsInfo > 0 ? "بانتظار رد الموظف" : undefined} />
          <StatCard label="تم الحل"            value={stats.resolved}            icon="✅" color="#16a34a" bg="#f0fdf4" />
          <StatCard label="تم الحل ولم يُبلَّغ" value={stats.resolvedNotNotified} icon="📣" color="#dc2626" bg="#fff5f5" urgent sub={stats.resolvedNotNotified > 0 ? "⚠️ العميل لم يُبلَّغ بعد" : undefined} />
        </div>

        {/* Alert for resolved-not-notified */}
        {stats.resolvedNotNotified > 0 && (
          <div style={{ background: "#fff5f5", border: "1.5px solid #fecaca", borderRadius: 14, padding: "0.85rem 1.1rem", marginBottom: "1.1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle style={{ width: 20, height: 20, color: "#dc2626", flexShrink: 0 }} />
            <span style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, color: "#dc2626", fontSize: "0.9rem" }}>
              ⚠️ يوجد {stats.resolvedNotNotified} {stats.resolvedNotNotified === 1 ? "تذكرة" : "تذاكر"} تم حلها لكن لم يُبلَّغ العميل بعد
            </span>
            <button onClick={() => { setFilterStatus("RESOLVED"); setFilterNotified("NO"); }} style={{ marginRight: "auto", background: "#dc2626", border: "none", borderRadius: 8, padding: "0.35rem 0.9rem", color: "#fff", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.78rem" }}>
              عرضها الآن
            </button>
          </div>
        )}

        {/* Search + filters */}
        <div style={{ ...card, padding: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 260px" }}>
              <Search style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9ca3af" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث برقم التذكرة، الطلب، الإيميل، الموظف..."
                style={{ ...inp, paddingRight: "2.4rem" }} />
            </div>
            <button onClick={() => setShowFilters(v => !v)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: showFilters ? "#f5f4ff" : "#fff", border: `1.5px solid ${showFilters ? PURPLE : "#e5e7eb"}`, borderRadius: 10, padding: "0.6rem 0.9rem", cursor: "pointer", color: showFilters ? PURPLE : "#374151", fontFamily: "Tajawal,sans-serif", fontWeight: 600, fontSize: "0.8rem" }}>
              <Filter style={{ width: 14, height: 14 }} /> فلاتر <ChevronDown style={{ width: 13, height: 13 }} />
            </button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={selectStyle}>
              <option value="updatedAt">آخر تحديث</option>
              <option value="createdAt">تاريخ الإنشاء</option>
              <option value="priority">الأولوية</option>
            </select>
          </div>

          {showFilters && (
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid #f3f4f6" }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={selectStyle}>
                <option value="ALL">كل الحالات</option>
                {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)} style={selectStyle}>
                <option value="ALL">كل الأولويات</option>
                <option value="URGENT">عاجل</option>
                <option value="HIGH">عالٍ</option>
                <option value="NORMAL">عادي</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)} style={selectStyle}>
                <option value="ALL">كل التصنيفات</option>
                {(Object.keys(CATEGORY_CONFIG) as TicketCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}</option>
                ))}
              </select>
              <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={selectStyle}>
                <option value="ALL">كل الموظفين</option>
                {ticketEmployeeNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filterNotified} onChange={e => setFilterNotified(e.target.value as any)} style={selectStyle}>
                <option value="ALL">الإبلاغ: الكل</option>
                <option value="NO">تم الحل — لم يُبلَّغ</option>
                <option value="YES">تم الإبلاغ</option>
              </select>
              {(filterStatus !== "ALL" || filterPriority !== "ALL" || filterCategory !== "ALL" || filterEmployee !== "ALL" || filterNotified !== "ALL") && (
                <button onClick={() => { setFilterStatus("ALL"); setFilterPriority("ALL"); setFilterCategory("ALL"); setFilterEmployee("ALL"); setFilterNotified("ALL"); }}
                  style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.5rem 0.85rem", cursor: "pointer", color: "#dc2626", fontFamily: "Tajawal,sans-serif", fontWeight: 600, fontSize: "0.78rem" }}>
                  مسح الفلاتر
                </button>
              )}
            </div>
          )}
        </div>

        {/* Count */}
        <div style={{ fontSize: "0.8rem", color: "#6b7280", fontFamily: "Tajawal,sans-serif", marginBottom: "0.65rem", fontWeight: 600 }}>
          {filtered.length} تذكرة {filtered.length !== tickets.length ? `(من أصل ${tickets.length})` : ""}
        </div>

        {/* Table */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Tajawal,sans-serif" }}>
              <thead>
                <tr style={{ background: "#f9f9ff", borderBottom: "1.5px solid #ede9fe" }}>
                  {["رقم التذكرة", "رقم الطلب", "الإيميل / المنتج", "الحالة", "الأولوية", "الموظف", "تم الحل؟ / إبلاغ؟", "آخر تحديث", ""].map(h => (
                    <th key={h} style={{ padding: "0.75rem 0.9rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "#6b7280", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>لا توجد نتائج</td></tr>
                )}
                {filtered.map((t, idx) => {
                  const old = isOld(t.updatedAt) && !["CLOSED", "CANCELLED", "RESOLVED"].includes(t.status);
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6", background: old ? "#fffbeb" : idx % 2 === 0 ? "#fff" : "#fafafa", transition: "background .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f5f4ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = old ? "#fffbeb" : idx % 2 === 0 ? "#fff" : "#fafafa")}>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {old && <span title="تذكرة قديمة لم تُحدَّث">⚠️</span>}
                          <code style={{ fontFamily: "monospace", fontSize: "0.78rem", color: PURPLE, fontWeight: 700, background: "#f5f4ff", padding: "0.15rem 0.45rem", borderRadius: 6, border: "1px solid rgba(112,45,255,.2)" }}>{t.id}</code>
                        </div>
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>{t.requestNumber}</span>
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        <div style={{ fontSize: "0.82rem", color: "#090040", fontWeight: 700 }}>{t.activationEmail}</div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#f5f4ff", border: "1px solid rgba(112,45,255,.2)", borderRadius: 6, padding: "0.1rem 0.45rem", marginTop: "0.2rem" }}>
                          <span style={{ fontSize: "0.65rem" }}>📦</span>
                          <span style={{ fontSize: "0.72rem", color: "#702dff", fontWeight: 700, fontFamily: "Tajawal,sans-serif" }}>{t.productType}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem" }}><StatusBadge status={t.status} /></td>
                      <td style={{ padding: "0.7rem 0.9rem" }}><PriorityBadge priority={t.priority} /></td>
                      <td style={{ padding: "0.7rem 0.9rem", fontSize: "0.82rem", color: "#374151", whiteSpace: "nowrap" }}>{t.employeeName}</td>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        {t.status === "RESOLVED" && (
                          <span style={{ background: t.customerNotified ? "#f0fdf4" : "#fff5f5", color: t.customerNotified ? "#16a34a" : "#dc2626", border: `1px solid ${t.customerNotified ? "#86efac" : "#fecaca"}`, borderRadius: 20, padding: "0.18rem 0.6rem", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {t.customerNotified ? "✅ أُبلِغ" : "⏳ لم يُبلَّغ"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", fontSize: "0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>{formatDate(t.updatedAt)}</td>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <button onClick={() => router.push(`/support/tickets/${t.id}`)} style={{ background: "linear-gradient(135deg,#702dff,#9044ff)", border: "none", borderRadius: 8, padding: "0.4rem 0.75rem", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 700 }}>
                            <Eye style={{ width: 13, height: 13 }} /> فتح
                          </button>
                          <button onClick={() => handleDeleteTicket(t.id)} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.4rem 0.6rem", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}>
                            <X style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-employee breakdown */}
        {employees.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h2 style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 800, fontSize: "1rem", color: "#090040", marginBottom: "0.85rem" }}>📊 التذاكر المفتوحة لكل موظف</h2>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {employees.map(emp => {
                const empTickets = tickets.filter(t => t.employeeName === emp.name);
                const open = empTickets.filter(t => !["CLOSED", "CANCELLED"].includes(t.status)).length;
                return (
                  <div key={emp.id} style={{ ...card, padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 200 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>👤</div>
                    <div>
                      <div style={{ fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#090040" }}>{emp.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                        <span style={{ color: PURPLE, fontWeight: 700 }}>{open}</span> مفتوحة من أصل {empTickets.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        </> /* end tickets tab */}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe, getCustomers, createCustomer, deleteCustomer,
  adjustCredits, getAllOrders, syncSheets, createProduct,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  Users, ShoppingBag, RefreshCw, Plus, Trash2,
  Loader2, ChevronUp, ChevronDown, Package, AlertCircle, Check,
} from "lucide-react";

interface User { id: string; name: string; email: string; credits: number; createdAt: string; }
interface Order { id: string; createdAt: string; creditsCost: number; user: { name: string; email: string }; product: { name: string }; licenseKey: { key: string }; }

type Tab = "customers" | "orders" | "products";

export default function AdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create customer form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Create product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [creatingProd, setCreatingProd] = useState(false);

  // Credit adjustment
  const [creditUserId, setCreditUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

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
      const [custRes, ordersRes] = await Promise.all([getCustomers(), getAllOrders()]);
      setCustomers(custRes.data);
      setOrders(ordersRes.data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncSheets();
      setSyncMsg(`✓ Imported ${res.data.imported} keys, skipped ${res.data.skipped}`);
    } catch (err: any) {
      setSyncMsg("✗ " + (err.response?.data?.error || "Sync failed"));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createCustomer({ name: newName, email: newEmail, password: newPassword });
      setNewName(""); setNewEmail(""); setNewPassword("");
      setShowCreateForm(false);
      const res = await getCustomers();
      setCustomers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create customer");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditUserId) return;
    setAdjusting(true);
    setError(null);
    try {
      const amount = parseFloat(creditAmount);
      await adjustCredits(creditUserId, amount, creditNote || undefined);
      setCreditUserId(null);
      setCreditAmount("");
      setCreditNote("");
      const res = await getCustomers();
      setCustomers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to adjust credits");
    } finally {
      setAdjusting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProd(true);
    setError(null);
    try {
      await createProduct({ name: prodName, description: prodDesc || undefined, priceInCredits: parseFloat(prodPrice) });
      setProdName(""); setProdDesc(""); setProdPrice("");
      setShowProductForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create product");
    } finally {
      setCreatingProd(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const tabs = [
    { key: "customers", label: "Customers", icon: Users },
    { key: "orders", label: "All Orders", icon: ShoppingBag },
    { key: "products", label: "Products", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={admin?.name || "Admin"} isAdmin />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-0.5">{customers.length} customers · {orders.length} orders</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing..." : "Sync Google Sheets"}
          </button>
        </div>

        {/* Sync message */}
        {syncMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 ${syncMsg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {syncMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === key ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Customers Tab ── */}
        {tab === "customers" && (
          <div className="space-y-4">
            {/* Create customer */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
                  <Plus className="w-4 h-4" />
                  Create new customer account
                </div>
                {showCreateForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showCreateForm && (
                <form onSubmit={handleCreateCustomer} className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                  <input
                    value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name" required
                    className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email" required
                    className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password (min 6 chars)" required minLength={6}
                    className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="submit" disabled={creating}
                    className="sm:col-span-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {creating ? "Creating..." : "Create account"}
                  </button>
                </form>
              )}
            </div>

            {/* Customers list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Credits</th>
                    <th className="text-right px-5 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-10 text-gray-400">No customers yet</td></tr>
                  )}
                  {customers.map((c) => (
                    <>
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{c.name}</td>
                        <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{c.email}</td>
                        <td className="px-5 py-3.5">
                          <span className="bg-amber-50 text-amber-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-amber-100">
                            {c.credits} cr
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setCreditUserId(creditUserId === c.id ? null : c.id)}
                              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium px-3 py-1.5 rounded-lg transition"
                            >
                              Credits
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c.id)}
                              className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Inline credit adjustment */}
                      {creditUserId === c.id && (
                        <tr key={`credit-${c.id}`} className="bg-indigo-50">
                          <td colSpan={4} className="px-5 py-3">
                            <form onSubmit={handleAdjustCredits} className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-indigo-700 font-medium">Adjust credits for {c.name}:</span>
                              <input
                                type="number" step="0.01"
                                value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)}
                                placeholder="e.g. 10 or -5" required
                                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                              <input
                                value={creditNote} onChange={(e) => setCreditNote(e.target.value)}
                                placeholder="Note (optional)"
                                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-sm flex-1 min-w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                              <button
                                type="submit" disabled={adjusting}
                                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                              >
                                {adjusting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Apply
                              </button>
                              <button type="button" onClick={() => setCreditUserId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                            </form>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Orders Tab ── */}
        {tab === "orders" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Product</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium hidden md:table-cell">Key</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Credits</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No orders yet</td></tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{o.user.name}</div>
                      <div className="text-gray-400 text-xs">{o.user.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{o.product.name}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                        {o.licenseKey.key}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-amber-600 font-semibold">{o.creditsCost}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs hidden sm:table-cell">
                      {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Products Tab ── */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowProductForm(!showProductForm)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
                  <Plus className="w-4 h-4" />
                  Add new product
                </div>
                {showProductForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showProductForm && (
                <form onSubmit={handleCreateProduct} className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                  <input
                    value={prodName} onChange={(e) => setProdName(e.target.value)}
                    placeholder="Product name (e.g. Windows 11 Pro)" required
                    className="sm:col-span-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    type="number" step="0.01" min="0.01"
                    value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="Price in credits" required
                    className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="sm:col-span-3 px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="submit" disabled={creatingProd}
                    className="sm:col-span-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
                  >
                    {creatingProd && <Loader2 className="w-4 h-4 animate-spin" />}
                    {creatingProd ? "Creating..." : "Create product"}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm text-indigo-700">
              <strong>Tip:</strong> Products are created automatically when you sync Google Sheets — one product per unique name in column B. You can also create them manually above and set the price in credits. After syncing, keys are linked to products by matching the name exactly.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getProducts, buyProduct, getMyOrders } from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  ShoppingCart,
  ClipboardList,
  Copy,
  Check,
  Loader2,
  PackageOpen,
  AlertCircle,
} from "lucide-react";

interface User { id: string; name: string; email: string; role: string; credits: number; }
interface Product { id: string; name: string; description?: string; priceInCredits: number; availableKeys: number; imageUrl?: string; }
interface Order { id: string; createdAt: string; creditsCost: number; product: { name: string; imageUrl?: string }; licenseKey: { key: string }; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [buying, setBuying] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meRes, productsRes, ordersRes] = await Promise.all([
        getMe(), getProducts(), getMyOrders(),
      ]);
      if (meRes.data.role === "ADMIN") { router.push("/admin"); return; }
      setUser(meRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (productId: string) => {
    setBuying(productId);
    setBuyError(null);
    try {
      await buyProduct(productId);
      // Refresh user credits and orders
      const [meRes, ordersRes] = await Promise.all([getMe(), getMyOrders()]);
      setUser(meRes.data);
      setOrders(ordersRes.data);
      setTab("orders");
    } catch (err: any) {
      setBuyError(err.response?.data?.error || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={user.name} credits={user.credits} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            You have <span className="font-semibold text-amber-600">{user.credits} credits</span> to spend
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {[
            { key: "shop", label: "Shop", icon: ShoppingCart },
            { key: "orders", label: "My Orders", icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as "shop" | "orders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === key
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Buy error */}
        {buyError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {buyError}
          </div>
        )}

        {/* Shop tab */}
        {tab === "shop" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No products available yet.</p>
              </div>
            )}
            {products.map((p) => {
              const canBuy = user.credits >= p.priceInCredits && p.availableKeys > 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-gray-900">{p.name}</h2>
                      {p.description && (
                        <p className="text-gray-400 text-xs mt-1">{p.description}</p>
                      )}
                    </div>
                    <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">
                      {p.priceInCredits} cr
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className={`text-xs font-medium ${p.availableKeys > 0 ? "text-green-600" : "text-red-500"}`}>
                      {p.availableKeys > 0 ? `${p.availableKeys} in stock` : "Out of stock"}
                    </span>
                    <button
                      onClick={() => handleBuy(p.id)}
                      disabled={!canBuy || buying === p.id}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                      {buying === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {buying === p.id ? "Buying..." : "Buy now"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Orders tab */}
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No orders yet. Buy a product to get started!</p>
              </div>
            )}
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{order.product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {" · "}
                    <span className="text-amber-600 font-medium">{order.creditsCost} credits</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 min-w-0">
                  <code className="text-sm font-mono text-gray-700 truncate flex-1">
                    {order.licenseKey.key}
                  </code>
                  <button
                    onClick={() => copyKey(order.licenseKey.key)}
                    className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition"
                    title="Copy key"
                  >
                    {copiedKey === order.licenseKey.key ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

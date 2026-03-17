import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login if token expires
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });

export const getMe = () => api.get("/api/auth/me");

// ── Products ─────────────────────────────────────────────────────────────────
export const getProducts = () => api.get("/api/products");

// ── Orders ───────────────────────────────────────────────────────────────────
export const buyProduct = (productId: string) =>
  api.post("/api/orders", { productId });

export const getMyOrders = () => api.get("/api/orders");

// ── Admin ────────────────────────────────────────────────────────────────────
export const getCustomers = () => api.get("/api/admin/customers");

export const createCustomer = (data: {
  name: string;
  email: string;
  password: string;
}) => api.post("/api/admin/customers", data);

export const deleteCustomer = (id: string) =>
  api.delete(`/api/admin/customers/${id}`);

export const adjustCredits = (userId: string, amount: number, note?: string) =>
  api.post("/api/admin/credits", { userId, amount, note });

export const getAllOrders = () => api.get("/api/admin/orders");

export const getCreditLogs = (userId: string) =>
  api.get(`/api/admin/credit-logs/${userId}`);

export const createProduct = (data: {
  name: string;
  description?: string;
  priceInCredits: number;
}) => api.post("/api/admin/products", data);

export const syncSheets = () => api.post("/api/admin/sync-sheets");

export default api;

export const addKeys = (productId: string, keys: string) =>
  api.post("/api/admin/keys", { productId, keys });

// ── Manual Orders ─────────────────────────────────────────────────────────────
export const buyManualProduct = (productId: string, emails: string[]) =>
  api.post("/api/manual-orders", { productId, emails });

export const getMyManualOrders = () => api.get("/api/manual-orders/my");

export const getAllManualOrders = () => api.get("/api/manual-orders/admin/all");

export const updateManualOrder = (
  id: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED",
  resultDetails?: string,
  rejectReason?: string
) => api.patch(`/api/manual-orders/admin/${id}`, { status, resultDetails, rejectReason });

export const toggleManualProduct = (id: string) =>
  api.patch(`/api/admin/products/${id}/toggle-manual`);

export const updateProductPrice = (id: string, priceInCredits: number) =>
  api.patch(`/api/admin/products/${id}/price`, { priceInCredits });

export const addManualStock = (id: string, amount: number) =>
  api.patch(`/api/admin/products/${id}/manual-stock`, { amount });
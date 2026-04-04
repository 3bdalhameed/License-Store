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

// Redirect to login if token expires (skip support routes — they have their own auth)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || "";
    if (err.response?.status === 401 && !url.startsWith("/api/support/")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });

export const register = (name: string, email: string, password: string, phone?: string, storeLink?: string) =>
  api.post("/api/auth/register", { name, email, password, phone, storeLink });

export const getMe = () => api.get("/api/auth/me");

export const forgotPassword = (email: string) =>
  api.post("/api/auth/forgot-password", { email });

export const resetPassword = (token: string, password: string) =>
  api.post("/api/auth/reset-password", { token, password });

export const refreshToken = () => api.post("/api/auth/refresh");

// ── Products ─────────────────────────────────────────────────────────────────
export const getProducts = () => api.get("/api/products");

// ── Orders ───────────────────────────────────────────────────────────────────
export const buyProduct = (productId: string, quantity = 1) =>
  api.post("/api/orders", { productId, quantity });

export const getMyOrders = () => api.get("/api/orders");

export const getMyCreditLogs = () => api.get("/api/orders/my-credits");

// ── Admin ────────────────────────────────────────────────────────────────────
export const getAdminStats = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return api.get(`/api/admin/stats${qs ? `?${qs}` : ""}`);
};

export const getPendingRegistrations = () => api.get("/api/admin/pending-registrations");

export const approveRegistration = (id: string) =>
  api.post(`/api/admin/pending-registrations/${id}/approve`);

export const rejectRegistration = (id: string, reason?: string) =>
  api.post(`/api/admin/pending-registrations/${id}/reject`, { reason });

export const getCustomers = () => api.get("/api/admin/customers");

export const createCustomer = (data: {
  name: string;
  email: string;
  password: string;
}) => api.post("/api/admin/customers", data);

export const deleteCustomer = (id: string) =>
  api.delete(`/api/admin/customers/${id}`);

export const updateCustomer = (id: string, data: { name?: string; email?: string; password?: string; allowDebt?: boolean }) =>
  api.patch(`/api/admin/customers/${id}`, data);

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

export const updateProductInstructions = (id: string, activationInstructions: string) =>
  api.patch(`/api/admin/products/${id}/instructions`, { activationInstructions });

export const syncSheets = () => api.post("/api/admin/sync-sheets");

export default api;

export const addKeys = (productId: string, keys: string) =>
  api.post("/api/admin/keys", { productId, keys });

// ── Manual Orders ─────────────────────────────────────────────────────────────
export const buyManualProduct = (productId: string, emails: string[], note?: string, quantity?: number) =>
  api.post("/api/manual-orders", { productId, emails, note, quantity });

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

export const reorderProducts = (items: { id: string; sortOrder: number }[]) =>
  api.put("/api/admin/products/reorder", items);

// ── Categories ─────────────────────────────────────────────────────────────────
export const getCategories = () => api.get("/api/admin/categories");

export const createCategory = (name: string) =>
  api.post("/api/admin/categories", { name });

export const deleteCategory = (id: string) =>
  api.delete(`/api/admin/categories/${id}`);

export const updateProductCategory = (id: string, categoryId: string | null) =>
  api.patch(`/api/admin/products/${id}/category`, { categoryId });

export const reorderCategories = (items: { id: string; sortOrder: number }[]) =>
  api.put("/api/admin/categories/reorder", items);

export const toggleRequiresEmail = (id: string) =>
  api.patch(`/api/admin/products/${id}/toggle-requires-email`);

export const toggleProductActive = (id: string) =>
  api.patch(`/api/admin/products/${id}/toggle-active`);

export const updateProduct = (id: string, data: { name?: string; description?: string }) =>
  api.patch(`/api/admin/products/${id}`, data);

export const deleteProduct = (id: string) =>
  api.delete(`/api/admin/products/${id}`);

// ── Support (separate axios instance using support token or admin token) ──────
const getSupportAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("support_token") || localStorage.getItem("token");
};

const apiSupport = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

apiSupport.interceptors.request.use((config) => {
  const token = getSupportAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiSupport.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("support_token");
      localStorage.removeItem("support_session");
      window.location.href = "/support/login";
    }
    return Promise.reject(err);
  }
);

// ── Support Employees ────────────────────────────────────────────────────────
export const supportLogin = (email: string, password: string) =>
  api.post("/api/support/login", { email, password });

export const getSupportEmployees = () => api.get("/api/support/employees");

export const createSupportEmployee = (name: string, email: string, password: string) =>
  api.post("/api/support/employees", { name, email, password });

export const updateSupportEmployee = (id: string, data: { password?: string; telegramChatId?: string }) =>
  api.patch(`/api/support/employees/${id}`, data);

export const deleteSupportEmployee = (id: string) =>
  api.delete(`/api/support/employees/${id}`);

// ── Support Tickets ───────────────────────────────────────────────────────────
export const getSupportTickets = () =>
  apiSupport.get("/api/support/tickets");

export const createSupportTicket = (data: {
  requestNumber: string;
  activationEmail: string;
  productType: string;
  description: string;
  category: string;
  priority: string;
  customerContact?: string;
  referenceNumber?: string;
  attachments?: any[];
  mediaLinks?: string[];
  assignedTo?: string;
}) => apiSupport.post("/api/support/tickets", data);

export const getSupportTicket = (id: string) =>
  apiSupport.get(`/api/support/tickets/${id}`);

export const updateSupportTicketStatus = (id: string, status: string, note?: string) =>
  apiSupport.patch(`/api/support/tickets/${id}/status`, { status, note });

export const addSupportComment = (id: string, comment: {
  content: string;
  isAdminNote?: boolean;
  isInfoRequest?: boolean;
}) => apiSupport.post(`/api/support/tickets/${id}/comments`, comment);

export const markSupportTicketNotified = (id: string) =>
  apiSupport.patch(`/api/support/tickets/${id}/notify`);

export const deleteSupportTicketApi = (id: string) =>
  apiSupport.delete(`/api/support/tickets/${id}`);

export const assignSupportTicket = (id: string, assignedTo: string | null) =>
  apiSupport.patch(`/api/support/tickets/${id}/assign`, { assignedTo });

// ── Telegram settings (use main admin token) ──────────────────────────────────
export const getTelegramSettings = () =>
  api.get("/api/support/settings/telegram");

export const saveTelegramSettings = (botToken: string, adminChatId: string) =>
  api.patch("/api/support/settings/telegram", { botToken, adminChatId });

export const testTelegramSettings = (botToken: string, chatId: string) =>
  api.post("/api/support/settings/telegram/test", { botToken, chatId });

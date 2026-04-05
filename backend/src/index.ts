import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import manualOrderRoutes from "./routes/manualOrders";
import supportRoutes from "./routes/support";
import { syncKeysFromSheet } from "./services/sheetsSync";
import { AuthRequest, requireAuth } from "./middleware/auth";
import { requireAdmin } from "./middleware/adminOnly";
import { Response } from "express";
import { prisma } from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/manual-orders", manualOrderRoutes);
app.use("/api/support", supportRoutes);

app.post(
  "/api/admin/sync-sheets",
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await syncKeysFromSheet();
      return res.json({ message: "Sync complete", imported: result.imported, skipped: result.skipped });
    } catch (err) {
      console.error("Sheets sync error:", err);
      return res.status(500).json({ error: "Sync failed" });
    }
  }
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Auto-delete orders older than 30 days ──
async function cleanupOldOrders() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const [o, m] = await Promise.all([
      prisma.order.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.manualOrder.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    ]);
    if (o.count + m.count > 0)
      console.log(`🗑 Deleted ${o.count} orders + ${m.count} manual orders older than 30 days`);
  } catch (err) {
    console.error("Order cleanup error:", err);
  }
}
// Run once after 1 hour on startup (not immediately, to avoid deleting on every nodemon restart)
setTimeout(cleanupOldOrders, 60 * 60 * 1000);
setInterval(cleanupOldOrders, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
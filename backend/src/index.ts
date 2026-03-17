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
import { syncKeysFromSheet } from "./services/sheetsSync";
import { AuthRequest, requireAuth } from "./middleware/auth";
import { requireAdmin } from "./middleware/adminOnly";
import { Response } from "express";

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
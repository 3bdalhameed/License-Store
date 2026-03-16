import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminOnly";
import { addKeysToSheet } from "../services/sheetsSync";

const router = Router();
router.use(requireAuth, requireAdmin);

const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

const adjustCreditsSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  note: z.string().optional(),
});

// POST /api/admin/customers — create a new customer account
router.post("/customers", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, password } = createCustomerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: "CUSTOMER" },
      select: { id: true, email: true, name: true, role: true, credits: true, createdAt: true },
    });
    return res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/customers
router.get("/customers", async (_req: AuthRequest, res: Response) => {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, email: true, name: true, credits: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(customers);
});

// POST /api/admin/credits
router.post("/credits", async (req: AuthRequest, res: Response) => {
  try {
    const { userId, amount, note } = adjustCreditsSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const newBalance = user.credits + amount;
    if (newBalance < 0) return res.status(400).json({ error: "Insufficient credits" });
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: newBalance },
        select: { id: true, email: true, name: true, credits: true },
      }),
      prisma.creditLog.create({
        data: { userId, amount, type: amount >= 0 ? "ADD" : "DEDUCT", note },
      }),
    ]);
    return res.json(updatedUser);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/orders
router.get("/orders", async (_req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
      licenseKey: { select: { key: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
});

// GET /api/admin/credit-logs/:userId
router.get("/credit-logs/:userId", async (req: AuthRequest, res: Response) => {
  const logs = await prisma.creditLog.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(logs);
});

// POST /api/admin/products — create a product
router.post("/products", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      priceInCredits: z.number().positive(),
      imageUrl: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const product = await prisma.product.create({ data });
    return res.status(201).json(product);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/keys — add keys manually + write to Google Sheet
router.post("/keys", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      productId: z.string(),
      keys: z.string().min(1), // newline-separated keys
    });
    const { productId, keys } = schema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const keyList = keys
      .split("\n")
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);

    if (keyList.length === 0) return res.status(400).json({ error: "No valid keys found" });

    let added = 0;
    let skipped = 0;
    const addedKeys: string[] = [];

    for (const key of keyList) {
      const existing = await prisma.licenseKey.findUnique({ where: { key } });
      if (existing) { skipped++; continue; }
      await prisma.licenseKey.create({
        data: { key, productId: product.id, status: "UNUSED" },
      });
      addedKeys.push(key);
      added++;
    }

    // Write new keys to Google Sheet
    if (addedKeys.length > 0) {
      try {
        await addKeysToSheet(addedKeys, product.name);
      } catch (sheetErr) {
        console.error("Sheet write failed (non-fatal):", sheetErr);
      }
    }

    return res.json({ added, skipped });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/customers/:id
router.delete("/customers/:id", async (req: AuthRequest, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

// PATCH /api/admin/products/:id/toggle-manual — toggle manual activation
router.patch("/products/:id/toggle-manual", async (req: AuthRequest, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } }) as any;
  if (!product) return res.status(404).json({ error: "Product not found" });
  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: { isManual: !product.isManual } as any,
  });
  return res.json(updated);
});

// PATCH /api/admin/products/:id/price — update product price
router.patch("/products/:id/price", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({ priceInCredits: z.number().positive() });
    const { priceInCredits } = schema.parse(req.body);
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { priceInCredits },
    });
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/products/:id/manual-stock — add stock for manual products
router.patch("/products/:id/manual-stock", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({ amount: z.number().int().min(1) });
    const { amount } = schema.parse(req.body);
    const updated = await (prisma.product as any).update({
      where: { id: req.params.id },
      data: { manualStock: { increment: amount } },
    });
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
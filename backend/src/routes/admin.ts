import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminOnly";
import { addKeysToSheet } from "../services/sheetsSync";
import { sendRegistrationApprovedEmail, sendRegistrationRejectedEmail } from "../services/email";

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

// GET /api/admin/stats?from=2024-01-01&to=2024-12-31
router.get("/stats", async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    },
  } : {};

  const [totalCustomers, totalOrders, totalManualOrders, pendingManualOrders, totalProducts, totalRevenue, manualRevenue] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count({ where: dateFilter }),
    prisma.manualOrder.count({ where: dateFilter }),
    prisma.manualOrder.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.aggregate({ _sum: { creditsCost: true }, where: dateFilter }),
    prisma.manualOrder.aggregate({ _sum: { creditsCost: true }, where: { status: "COMPLETED", ...dateFilter } }),
  ]);
  return res.json({
    totalCustomers,
    totalOrders: totalOrders + totalManualOrders,
    pendingManualOrders,
    totalProducts,
    totalRevenue: (totalRevenue._sum.creditsCost || 0) + (manualRevenue._sum.creditsCost || 0),
  });
});

// GET /api/admin/pending-registrations
router.get("/pending-registrations", async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { status: "PENDING", role: "CUSTOMER" },
    select: { id: true, email: true, name: true, phone: true, storeLink: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return res.json(users);
});

// POST /api/admin/pending-registrations/:id/approve
router.post("/pending-registrations/:id/approve", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  await prisma.user.update({ where: { id: req.params.id }, data: { status: "ACTIVE" } });
  sendRegistrationApprovedEmail(user.email, user.name).catch(console.error);
  return res.json({ success: true });
});

// POST /api/admin/pending-registrations/:id/reject
router.post("/pending-registrations/:id/reject", async (req: AuthRequest, res: Response) => {
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  await prisma.user.update({ where: { id: req.params.id }, data: { status: "REJECTED" } });
  sendRegistrationRejectedEmail(user.email, user.name, reason).catch(console.error);
  return res.json({ success: true });
});

// POST /api/admin/customers — create a new customer account (auto-approved)
router.post("/customers", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, password } = createCustomerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: "CUSTOMER", status: "ACTIVE" },
      select: { id: true, email: true, name: true, role: true, credits: true, createdAt: true },
    });
    return res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/customers
router.get("/customers", async (_req: AuthRequest, res: Response) => {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER", status: "ACTIVE" },
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
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
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

// PUT /api/admin/products/reorder — update sort order
router.put("/products/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const items = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body);
    await Promise.all(items.map(({ id, sortOrder }) =>
      prisma.product.update({ where: { id }, data: { sortOrder } })
    ));
    return res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/products — create a product
router.post("/products", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      activationInstructions: z.string().optional(),
      priceInCredits: z.number().positive(),
      imageUrl: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const product = await prisma.product.create({ data });
    return res.status(201).json(product);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/products/:id/instructions — set activation instructions
router.patch("/products/:id/instructions", async (req: AuthRequest, res: Response) => {
  try {
    const { activationInstructions } = z.object({ activationInstructions: z.string() }).parse(req.body);
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { activationInstructions },
    });
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/keys — add keys manually + write to Google Sheet
router.post("/keys", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      productId: z.string(),
      keys: z.string().min(1),
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

    if (addedKeys.length > 0) {
      try {
        await addKeysToSheet(addedKeys, product.name);
      } catch (sheetErr) {
        console.error("Sheet write failed (non-fatal):", sheetErr);
      }
    }

    return res.json({ added, skipped });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/customers/:id
router.delete("/customers/:id", async (req: AuthRequest, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

// PATCH /api/admin/products/:id/toggle-manual
router.patch("/products/:id/toggle-manual", async (req: AuthRequest, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } }) as any;
  if (!product) return res.status(404).json({ error: "Product not found" });
  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: { isManual: !product.isManual } as any,
  });
  return res.json(updated);
});

// PATCH /api/admin/products/:id/price
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
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/products/:id/manual-stock
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
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/products/:id/category
router.patch("/products/:id/category", async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = z.object({ categoryId: z.string().nullable() }).parse(req.body);
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { categoryId },
    });
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/categories
router.get("/categories", async (_req: AuthRequest, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return res.json(categories);
});

// POST /api/admin/categories
router.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: "Category already exists" });
    const category = await prisma.category.create({ data: { name } });
    return res.status(201).json(category);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/categories/:id
router.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  // Unlink products first
  await prisma.product.updateMany({
    where: { categoryId: req.params.id },
    data: { categoryId: null },
  });
  await prisma.category.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

export default router;

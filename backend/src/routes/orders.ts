import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// POST /api/orders — buy a product using credits
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(20).optional().default(1),
    });
    const { productId, quantity } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const DEBT_LIMIT = -20;
    const totalCost = product.priceInCredits * quantity;
    const balanceAfter = user.credits - totalCost;
    if (balanceAfter < DEBT_LIMIT) {
      return res.status(400).json({
        error: "رصيدك غير كافٍ",
        required: totalCost,
        available: user.credits,
        debtLimit: DEBT_LIMIT,
      });
    }
    const isNegativeBalance = balanceAfter < 0;

    const licenseKeys = await prisma.licenseKey.findMany({
      where: { productId, status: "UNUSED" },
      take: quantity,
    });
    if (licenseKeys.length < quantity) {
      return res.status(400).json({
        error: licenseKeys.length === 0
          ? "No keys available for this product"
          : `يتوفر ${licenseKeys.length} مفتاح فقط`,
      });
    }

    const orders = await prisma.$transaction(async (tx) => {
      const createdOrders = [];
      for (const key of licenseKeys) {
        const counter = await tx.counter.upsert({
          where: { id: "order" },
          update: { value: { increment: 1 } },
          create: { id: "order", value: 1 },
        });
        const newOrder = await tx.order.create({
          data: {
            userId: user.id,
            productId: product.id,
            licenseKeyId: key.id,
            creditsCost: product.priceInCredits,
            globalOrderNumber: counter.value,
          },
          include: {
            product: { select: { name: true } },
            licenseKey: { select: { key: true } },
          },
        });
        await tx.licenseKey.update({
          where: { id: key.id },
          data: { status: "SOLD" },
        });
        createdOrders.push(newOrder);
      }
      await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: totalCost } },
      });
      await tx.creditLog.create({
        data: {
          userId: user.id,
          amount: -totalCost,
          type: "DEDUCT",
          note: quantity > 1 ? `Purchased ${quantity}x ${product.name}` : `Purchased: ${product.name}`,
        },
      });
      return createdOrders;
    });

    return res.status(201).json({
      orders,
      warning: isNegativeBalance ? `رصيدك أصبح سلبياً (${balanceAfter.toFixed(1)})، يرجى إعادة الشحن` : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/orders — current user's order history
router.get("/", async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: {
      product: { select: { name: true, imageUrl: true } },
      licenseKey: { select: { key: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
});

// GET /api/orders/my-credits — current user's credit log
router.get("/my-credits", async (req: AuthRequest, res: Response) => {
  const logs = await prisma.creditLog.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json(logs);
});

export default router;

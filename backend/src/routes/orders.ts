import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// POST /api/orders — buy a product using credits
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({ productId: z.string() });
    const { productId } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Check credits — allow balance to go down to -20 (debt limit)
    const DEBT_LIMIT = -20;
    const balanceAfter = user.credits - product.priceInCredits;
    if (balanceAfter < DEBT_LIMIT) {
      return res.status(400).json({
        error: "رصيدك غير كافٍ",
        required: product.priceInCredits,
        available: user.credits,
        debtLimit: DEBT_LIMIT,
      });
    }
    const isNegativeBalance = balanceAfter < 0;

    // Find an unused key for this product
    const licenseKey = await prisma.licenseKey.findFirst({
      where: { productId, status: "UNUSED" },
    });
    if (!licenseKey) {
      return res.status(400).json({ error: "No keys available for this product" });
    }

    // Atomic transaction: deduct credits, mark key sold, create order
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId: user.id,
          productId: product.id,
          licenseKeyId: licenseKey.id,
          creditsCost: product.priceInCredits,
        },
        include: {
          product: { select: { name: true } },
          licenseKey: { select: { key: true } },
        },
      }),
      prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: { status: "SOLD" },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: product.priceInCredits } },
      }),
      prisma.creditLog.create({
        data: {
          userId: user.id,
          amount: -product.priceInCredits,
          type: "DEDUCT",
          note: `Purchased: ${product.name}`,
        },
      }),
    ]);

    return res.status(201).json({
      ...order,
      warning: isNegativeBalance ? `رصيدك أصبح سلبياً (${balanceAfter.toFixed(1)})، يرجى إعادة الشحن` : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
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
    orderBy: { orderNumber: "desc" },
  });
  return res.json(orders);
});

export default router;
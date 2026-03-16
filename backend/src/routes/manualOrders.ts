import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminOnly";
import {
  sendOrderReceivedEmail,
  sendOrderCompletedEmail,
} from "../services/email";
import { sendTelegramMessage } from "../services/Telegram";

const router = Router();

// ── Customer: buy a manual product ───────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      productId: z.string(),
      emails: z.array(z.string().email()).min(1).max(10),
    });
    const { productId, emails } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const product: any = await prisma.product.findUnique({
      where: { id: productId, isActive: true, isManual: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    if ((product.manualStock ?? 0) < 1) {
      return res.status(400).json({ error: "لا يوجد مخزون متاح لهذا المنتج" });
    }

    if (user.credits < product.priceInCredits) {
      return res.status(400).json({
        error: "رصيد غير كافٍ",
        required: product.priceInCredits,
        available: user.credits,
      });
    }

    // Atomic: deduct credits + create manual order
    const [manualOrder] = await prisma.$transaction([
      prisma.manualOrder.create({
        data: {
          userId: user.id,
          productId: product.id,
          creditsCost: product.priceInCredits,
          emails: emails.join(","),
          status: "PENDING",
        },
        include: {
          product: { select: { name: true } },
        },
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
          note: `Manual order: ${product.name}`,
        },
      }),
      (prisma.product as any).update({
        where: { id: product.id },
        data: { manualStock: { decrement: 1 } },
      }),
    ]);

    // Send confirmation email to the customer account email
    try {
      await sendOrderReceivedEmail(
        user.email,
        user.name,
        product.name,
        emails
      );
    } catch (emailErr) {
      console.error("Confirmation email failed (non-fatal):", emailErr);
    }

    // Telegram notification to admin
    try {
      await sendTelegramMessage(
        `🛒 <b>طلب تفعيل يدوي جديد!</b>\n\n` +
        `👤 العميل: <b>${user.name}</b> (${user.email})\n` +
        `📦 المنتج: <b>${product.name}</b>\n` +
        `📧 الإيميلات: <b>${emails.join(", ")}</b>\n` +
        `💰 الرصيد المخصوم: <b>${product.priceInCredits}</b>\n\n` +
        `⚡ يرجى التفعيل في أقرب وقت ممكن`
      );
    } catch (telegramErr) {
      console.error("Telegram notification failed (non-fatal):", telegramErr);
    }

    return res.status(201).json(manualOrder);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: "Server error" });
  }
});

// ── Customer: get my manual orders ───────────────────────────────────────────
router.get("/my", requireAuth, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.manualOrder.findMany({
    where: { userId: req.user!.id },
    include: { product: { select: { name: true, imageUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
});

// ── Admin: get all manual orders ─────────────────────────────────────────────
router.get(
  "/admin/all",
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    const orders = await prisma.manualOrder.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders);
  }
);

// ── Admin: update status + complete with details ──────────────────────────────
router.patch(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const schema = z.object({
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
        resultDetails: z.string().optional(),
      });
      const { status, resultDetails } = schema.parse(req.body);

      const order = await prisma.manualOrder.findUnique({
        where: { id: req.params.id },
        include: {
          user: { select: { email: true, name: true } },
          product: { select: { name: true } },
        },
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      const updated = await prisma.manualOrder.update({
        where: { id: req.params.id },
        data: { status, resultDetails: resultDetails || order.resultDetails },
      });

      // Send completion email when marked COMPLETED
      if (status === "COMPLETED" && resultDetails) {
        try {
          await sendOrderCompletedEmail(
            order.user.email,
            order.user.name,
            order.product.name,
            resultDetails
          );
        } catch (emailErr) {
          console.error("Completion email failed (non-fatal):", emailErr);
        }
      }

      return res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ error: err.errors });
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
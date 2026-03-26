import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminOnly";
import {
  sendOrderReceivedEmail,
  sendOrderCompletedEmail,
  sendOrderRejectedEmail,
  sendOrderInProgressEmail,
} from "../services/email";
import { sendTelegramMessage } from "../services/Telegram";

const router = Router();

// ── Customer: buy a manual product ───────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      productId: z.string(),
      emails: z.array(z.string()).max(10).default([]),
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

    // Validate emails only when product requires them
    if (product.requiresEmail !== false) {
      if (emails.length === 0) return res.status(400).json({ error: "أدخل بريداً إلكترونياً واحداً على الأقل" });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = emails.find((e: string) => !emailRegex.test(e));
      if (invalid) return res.status(400).json({ error: "بريد إلكتروني غير صحيح" });
    }

    // Total cost = price × emails (or price × 1 if no email required)
    const emailCount = (product.requiresEmail !== false) ? emails.length : 1;
    const totalCost = product.priceInCredits * emailCount;
    const DEBT_LIMIT = -20;
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

    // Atomic: deduct credits + create manual order + assign global order number
    const manualOrder = await prisma.$transaction(async (tx) => {
      const counter = await tx.counter.upsert({
        where: { id: "order" },
        update: { value: { increment: 1 } },
        create: { id: "order", value: 1 },
      });

      const order = await tx.manualOrder.create({
        data: {
          userId: user.id,
          productId: product.id,
          creditsCost: totalCost,
          emails: emails.join(","),
          status: "PENDING",
          globalOrderNumber: counter.value,
        },
        include: {
          product: { select: { name: true } },
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: totalCost } },
      });
      await tx.creditLog.create({
        data: {
          userId: user.id,
          amount: -totalCost,
          type: "DEDUCT",
          note: product.requiresEmail !== false
            ? `Manual order (${emails.length} emails): ${product.name}`
            : `Manual order: ${product.name}`,
        },
      });
      await (tx.product as any).update({
        where: { id: product.id },
        data: { manualStock: { decrement: 1 } },
      });

      return order;
    });

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
        (product.requiresEmail !== false ? `📧 الإيميلات: <b>${emails.join(", ")}</b>\n` : "") +
        `💰 الرصيد المخصوم: <b>${totalCost}</b>\n\n` +
        `⚡ يرجى التفعيل في أقرب وقت ممكن`
      );
    } catch (telegramErr) {
      console.error("Telegram notification failed (non-fatal):", telegramErr);
    }

    return res.status(201).json({
      ...manualOrder,
      warning: isNegativeBalance ? `رصيدك أصبح سلبياً (${balanceAfter.toFixed(1)})، يرجى إعادة الشحن` : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
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
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
        resultDetails: z.string().optional(),
        rejectReason: z.string().optional(),
      });
      const { status, resultDetails, rejectReason } = schema.parse(req.body);

      const order = await prisma.manualOrder.findUnique({
        where: { id: req.params.id },
        include: {
          user: { select: { email: true, name: true } },
          product: { select: { name: true } },
        },
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      // If rejecting — refund credits to customer
      if (status === "REJECTED" && (order.status as any) !== "REJECTED") {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: order.userId },
            data: { credits: { increment: order.creditsCost } },
          }),
          prisma.creditLog.create({
            data: {
              userId: order.userId,
              amount: order.creditsCost,
              type: "ADD",
              note: `Refund: rejected order for ${order.product.name}`,
            },
          }),
        ]);
      }

      const updated = await (prisma.manualOrder as any).update({
        where: { id: req.params.id },
        data: {
          status,
          resultDetails: status === "REJECTED"
            ? (rejectReason || "تم رفض الطلب")
            : (resultDetails || order.resultDetails),
        },
      });

      // Send rejection email
      if (status === "REJECTED") {
        try {
          await sendOrderRejectedEmail(
            order.user.email,
            order.user.name,
            order.product.name,
            rejectReason || "لم يتم ذكر سبب",
            order.creditsCost
          );
        } catch (emailErr) {
          console.error("Rejection email failed (non-fatal):", emailErr);
        }
      }

      // Send in-progress email when marked IN_PROGRESS
      if (status === "IN_PROGRESS") {
        try {
          await sendOrderInProgressEmail(
            order.user.email,
            order.user.name,
            order.product.name
          );
        } catch (emailErr) {
          console.error("In-progress email failed (non-fatal):", emailErr);
        }
      }

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
        return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
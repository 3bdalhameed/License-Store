import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminOnly";
import {
  notifyNewTicket, notifyStatusChanged, notifyInfoRequested,
  saveTgConfig, getTgConfig, sendTgMessage,
} from "../services/supportTelegram";
import { uploadImageToDrive } from "../services/googleDrive";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// ── Support auth middleware ────────────────────────────────────────────────────
interface SupportAuthRequest extends Request {
  supportUser?: { id: string; name: string; role: "ADMIN" | "EMPLOYEE" };
}

const requireSupportAuth = async (
  req: SupportAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Support employee JWT (contains supportRole field)
    if (decoded.supportRole) {
      req.supportUser = { id: decoded.id, name: decoded.name, role: decoded.supportRole };
      return next();
    }

    // Main store admin JWT (contains role: "ADMIN")
    if (decoded.role === "ADMIN") {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { name: true },
      });
      req.supportUser = { id: decoded.id, name: user?.name || "الإدارة", role: "ADMIN" };
      return next();
    }

    return res.status(403).json({ error: "غير مصرح" });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function nextCounter(id: string): Promise<number> {
  const c = await prisma.$transaction(async (tx) => {
    return tx.counter.upsert({
      where: { id },
      create: { id, value: 1 },
      update: { value: { increment: 1 } },
    });
  });
  return c.value;
}

function formatTicket(t: any) {
  return {
    id: t.id,
    requestNumber: t.requestNumber,
    activationEmail: t.activationEmail,
    productType: t.productType,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    customerNotified: t.customerNotified,
    customerNotifiedBy: t.customerNotifiedBy ?? undefined,
    customerNotifiedAt: t.customerNotifiedAt?.toISOString() ?? undefined,
    customerContact: t.customerContact ?? undefined,
    employeeId: t.employeeId,
    employeeName: t.employeeName,
    assignedTo: t.assignedTo ?? undefined,
    internalNotes: t.internalNotes ?? undefined,
    referenceNumber: t.referenceNumber ?? undefined,
    accountPassword: t.accountPassword ?? undefined,
    attachments: t.attachments ?? [],
    mediaLinks: t.mediaLinks ?? [],
    comments: t.comments ?? [],
    activityLog: t.activityLog ?? [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  UNDER_REVIEW: "قيد المراجعة",
  ADDITIONAL_INFO_REQUIRED: "يحتاج معلومات إضافية",
  IN_PROGRESS: "جارٍ المعالجة",
  RESOLVED: "تم الحل",
  CLOSED: "مغلق",
  CANCELLED: "ملغي",
};

// ── POST /api/support/login ───────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = z.object({
      email:    z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const emp = await prisma.supportEmployee.findUnique({ where: { email } });
    if (!emp) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    const valid = await bcrypt.compare(password, emp.password);
    if (!valid) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    const token = jwt.sign(
      { id: emp.id, name: emp.name, supportRole: "EMPLOYEE" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ id: emp.id, name: emp.name, email: emp.email, token });
  } catch {
    return res.status(400).json({ error: "بيانات غير صالحة" });
  }
});

// ── GET /api/support/employees ────────────────────────────────────────────────
router.get("/employees", requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const employees = await prisma.supportEmployee.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, telegramChatId: true, createdAt: true },
  });
  return res.json(employees);
});

// ── POST /api/support/employees ───────────────────────────────────────────────
router.post("/employees", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = z.object({
      name:     z.string().min(2),
      email:    z.string().email(),
      password: z.string().min(6),
    }).parse(req.body);

    const exists = await prisma.supportEmployee.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });

    const hashed = await bcrypt.hash(password, 10);
    const emp = await prisma.supportEmployee.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, telegramChatId: true, createdAt: true },
    });
    return res.status(201).json(emp);
  } catch {
    return res.status(400).json({ error: "بيانات غير صالحة" });
  }
});

// ── PATCH /api/support/employees/:id ─────────────────────────────────────────
router.patch("/employees/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { password, telegramChatId } = z.object({
      password:       z.string().min(6).optional(),
      telegramChatId: z.string().optional(),
    }).parse(req.body);

    const data: Record<string, string | null> = {};
    if (password) data.password = await bcrypt.hash(password, 10);
    if (telegramChatId !== undefined) data.telegramChatId = telegramChatId || null;

    const emp = await prisma.supportEmployee.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, telegramChatId: true, createdAt: true },
    });
    console.log(`[Employee] updated id=${emp.id} telegramChatId=${emp.telegramChatId}`);
    return res.json(emp);
  } catch {
    return res.status(400).json({ error: "فشل التحديث" });
  }
});

// ── DELETE /api/support/employees/:id ────────────────────────────────────────
router.delete("/employees/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.supportEmployee.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ error: "الموظف غير موجود" });
  }
});

// ── GET /api/support/settings/telegram ───────────────────────────────────────
router.get("/settings/telegram", requireAuth, requireAdmin, async (_req, res: Response) => {
  const config = await getTgConfig();
  return res.json(config);
});

// ── PATCH /api/support/settings/telegram ──────────────────────────────────────
router.patch("/settings/telegram", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { botToken, adminChatId } = z.object({
    botToken:    z.string(),
    adminChatId: z.string(),
  }).parse(req.body);
  await saveTgConfig(botToken, adminChatId);
  return res.json({ ok: true });
});

// ── POST /api/support/settings/telegram/test ──────────────────────────────────
router.post("/settings/telegram/test", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { botToken, chatId } = z.object({
    botToken: z.string(),
    chatId:   z.string(),
  }).parse(req.body);
  const result = await sendTgMessage(botToken, chatId, "✅ <b>اتصال ناجح!</b>\nنظام دعم العملاء متصل بالتليجرام بنجاح 🎫");
  return res.json(result);
});

// ── GET /api/support/public/:id  (no auth — customer tracking) ───────────────
router.get("/public/:id", async (req: Request, res: Response) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: req.params.id },
  });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const comments = ((ticket.comments as any[]) || [])
    .filter((c: any) => !c.isAdminNote && !c.isInfoRequest)
    .map((c: any) => ({
      id:         c.id,
      authorName: c.authorName,
      authorRole: c.authorRole,
      content:    c.content,
      createdAt:  c.createdAt,
    }));

  const activityLog = ((ticket.activityLog as any[]) || [])
    .filter((a: any) => !a.action.includes("ملاحظة داخلية") && !a.action.includes("معلومات إضافية"))
    .map((a: any) => ({
      id:          a.id,
      action:      a.action,
      performedBy: a.performedBy,
      details:     a.details,
      createdAt:   a.createdAt,
    }));

  return res.json({
    id:               ticket.id,
    requestNumber:    ticket.requestNumber,
    productType:      ticket.productType,
    category:         ticket.category,
    status:           ticket.status,
    priority:         ticket.priority,
    customerNotified: ticket.customerNotified,
    createdAt:        ticket.createdAt.toISOString(),
    updatedAt:        ticket.updatedAt.toISOString(),
    comments,
    activityLog,
  });
});

// ── POST /api/support/upload-image ───────────────────────────────────────────
router.post("/upload-image", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  try {
    const { filename, mimeType, data } = z.object({
      filename: z.string().min(1),
      mimeType: z.string().startsWith("image/"),
      data:     z.string().min(1),
    }).parse(req.body);

    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      return res.status(503).json({ error: "Google Drive غير مهيأ — أضف GOOGLE_DRIVE_FOLDER_ID في .env" });
    }

    const result = await uploadImageToDrive(filename, mimeType, data);
    return res.json(result);
  } catch (err: any) {
    console.error("[Drive] upload error:", err?.message || err);
    return res.status(500).json({ error: "فشل رفع الصورة إلى Google Drive" });
  }
});

// ── GET /api/support/tickets ──────────────────────────────────────────────────
router.get("/tickets", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;
  const where = {}; // all employees can see all tickets
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return res.json(tickets.map(formatTicket));
});

// ── POST /api/support/tickets ─────────────────────────────────────────────────
router.post("/tickets", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;
  const { requestNumber, activationEmail, productType, description, category, priority, customerContact, referenceNumber, attachments, mediaLinks, assignedTo, accountPassword } = req.body;

  if (!requestNumber?.trim())
    return res.status(400).json({ error: "رقم الطلب مطلوب" });

const n    = await nextCounter("support_ticket");
  const year = new Date().getFullYear();
  const id   = `TKT-${year}-${String(n).padStart(4, "0")}`;
  const now = new Date().toISOString();

  const ticket = await prisma.supportTicket.create({
    data: {
      id,
      requestNumber: requestNumber.trim(),
      activationEmail,
      productType,
      description,
      category:        category  || "ACTIVATION",
      priority:        priority  || "NORMAL",
      status:          "NEW",
      customerNotified: false,
      customerContact:  customerContact  || null,
      referenceNumber:  referenceNumber  || null,
      assignedTo:       assignedTo       || null,
      employeeId:   user.id,
      employeeName: user.name,
      attachments:  attachments  || [],
      mediaLinks:   mediaLinks   || [],
      comments:     [],
      activityLog:  [{
        id: uid(),
        action: "تم إنشاء التذكرة",
        performedBy: user.name,
        performedByRole: "employee",
        createdAt: now,
      }],
    },
  });

  // Set accountPassword via raw SQL (Prisma client not yet regenerated for this column)
  if (accountPassword?.trim()) {
    await prisma.$executeRawUnsafe(
      `UPDATE support_tickets SET "accountPassword" = $1 WHERE id = $2`,
      accountPassword.trim(), id
    );
  }

  notifyNewTicket(ticket).catch(e => console.error("[Telegram] notifyNewTicket error:", e));
  return res.status(201).json(formatTicket({ ...ticket, accountPassword: accountPassword?.trim() || null }));
});

// ── GET /api/support/tickets/:id ──────────────────────────────────────────────
router.get("/tickets/:id", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
  const raw = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "accountPassword" FROM support_tickets WHERE id = $1`,
    req.params.id
  );
  return res.json(formatTicket({ ...ticket, accountPassword: raw[0]?.accountPassword ?? null }));
});

// ── PATCH /api/support/tickets/:id/status ─────────────────────────────────────
router.patch("/tickets/:id/status", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;
  const { status, note } = req.body;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const now = new Date().toISOString();
  const oldLog = (ticket.activityLog as any[]) || [];
  const entry = {
    id: uid(),
    action: `تغيير الحالة: "${STATUS_LABELS[ticket.status] || ticket.status}" → "${STATUS_LABELS[status] || status}"`,
    performedBy: user.name,
    performedByRole: user.role === "ADMIN" ? "admin" : "employee",
    ...(note ? { details: note } : {}),
    createdAt: now,
  };

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status, activityLog: [...oldLog, entry], updatedAt: new Date() },
  });

  notifyStatusChanged(updated, status, user.name).catch(e => console.error("[Telegram] notifyStatusChanged error:", e));
  return res.json(formatTicket(updated));
});

// ── PATCH /api/support/tickets/:id/assign ─────────────────────────────────────
router.patch("/tickets/:id/assign", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  if (req.supportUser!.role !== "ADMIN")
    return res.status(403).json({ error: "غير مصرح" });

  const { assignedTo } = req.body;
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const now = new Date().toISOString();
  const oldLog = (ticket.activityLog as any[]) || [];

  // Resolve employee name for log
  let empName = "—";
  if (assignedTo) {
    const emp = await prisma.supportEmployee.findUnique({ where: { id: assignedTo }, select: { name: true } });
    empName = emp?.name || assignedTo;
  }

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: {
      assignedTo: assignedTo || null,
      activityLog: [...oldLog, {
        id: uid(),
        action: assignedTo ? `تم تعيين الموظف: ${empName}` : "تم إلغاء تعيين الموظف",
        performedBy: req.supportUser!.name,
        performedByRole: "admin",
        createdAt: now,
      }],
      updatedAt: new Date(),
    },
  });

  return res.json(formatTicket(updated));
});

// ── POST /api/support/tickets/:id/comments ────────────────────────────────────
router.post("/tickets/:id/comments", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;
  const { content, isAdminNote, isInfoRequest } = req.body;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const now = new Date().toISOString();
  const comment = {
    id: uid(),
    authorId:   user.id,
    authorName: user.name,
    authorRole: user.role === "ADMIN" ? "admin" : "employee",
    content,
    isAdminNote:   isAdminNote   || false,
    isInfoRequest: isInfoRequest || false,
    createdAt: now,
  };

  const logEntry = {
    id: uid(),
    action: isInfoRequest ? "طُلبت معلومات إضافية"
          : isAdminNote   ? "أضاف ملاحظة داخلية"
          :                 "أضاف تعليقاً",
    performedBy:     user.name,
    performedByRole: user.role === "ADMIN" ? "admin" : "employee",
    details: content.length > 100 ? content.slice(0, 100) + "…" : content,
    createdAt: now,
  };

  const oldComments = (ticket.comments   as any[]) || [];
  const oldLog      = (ticket.activityLog as any[]) || [];

  const updateData: any = {
    comments:    [...oldComments, comment],
    activityLog: [...oldLog, logEntry],
    updatedAt:   new Date(),
  };
  if (isInfoRequest) {
    updateData.status = "ADDITIONAL_INFO_REQUIRED";
  } else if (
    !isAdminNote &&
    user.role !== "ADMIN" &&
    ticket.status === "ADDITIONAL_INFO_REQUIRED"
  ) {
    // Employee submitted info → move back to under review
    updateData.status = "UNDER_REVIEW";
    updateData.activityLog = [
      ...oldLog,
      logEntry,
      {
        id: uid(),
        action: `تغيير الحالة: "يحتاج معلومات إضافية" → "قيد المراجعة" (تلقائي بعد رد الموظف)`,
        performedBy: user.name,
        performedByRole: "employee",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: updateData,
  });

  if (isInfoRequest) notifyInfoRequested(updated, content).catch(e => console.error("[Telegram] notifyInfoRequested error:", e));
  return res.json(formatTicket(updated));
});

// ── PATCH /api/support/tickets/:id/notify ─────────────────────────────────────
router.patch("/tickets/:id/notify", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const now = new Date();
  const nowIso = now.toISOString();
  const oldLog = (ticket.activityLog as any[]) || [];

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: {
      customerNotified:   true,
      customerNotifiedBy: user.name,
      customerNotifiedAt: now,
      activityLog: [...oldLog, {
        id: uid(),
        action: "✅ تم إبلاغ العميل",
        performedBy:     user.name,
        performedByRole: user.role === "ADMIN" ? "admin" : "employee",
        createdAt: nowIso,
      }],
      updatedAt: now,
    },
  });

  return res.json(formatTicket(updated));
});

// ── DELETE /api/support/tickets/:id ──────────────────────────────────────────
router.delete("/tickets/:id", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  if (req.supportUser!.role !== "ADMIN")
    return res.status(403).json({ error: "غير مصرح" });

  try {
    await prisma.supportTicket.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ error: "التذكرة غير موجودة" });
  }
});

export default router;

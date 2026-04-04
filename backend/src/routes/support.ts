import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminOnly";

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

// ── GET /api/support/tickets ──────────────────────────────────────────────────
router.get("/tickets", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;
  const where = user.role === "ADMIN" ? {} : { employeeId: user.id };
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return res.json(tickets.map(formatTicket));
});

// ── POST /api/support/tickets ─────────────────────────────────────────────────
router.post("/tickets", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const user = req.supportUser!;
  const { requestNumber, activationEmail, productType, description, category, priority, customerContact, referenceNumber, attachments, mediaLinks } = req.body;

  if (!requestNumber?.trim())
    return res.status(400).json({ error: "رقم الطلب مطلوب" });

  const existing = await prisma.supportTicket.findUnique({ where: { requestNumber: requestNumber.trim() } });
  if (existing) return res.status(409).json({ error: "رقم الطلب مستخدم بالفعل" });

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

  return res.status(201).json(formatTicket(ticket));
});

// ── GET /api/support/tickets/:id ──────────────────────────────────────────────
router.get("/tickets/:id", requireSupportAuth, async (req: SupportAuthRequest, res: Response) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });
  return res.json(formatTicket(ticket));
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
  if (isInfoRequest) updateData.status = "ADDITIONAL_INFO_REQUIRED";

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: updateData,
  });

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

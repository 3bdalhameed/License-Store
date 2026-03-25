import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendPasswordResetEmail } from "../services/email";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  phone: z.string().min(7).optional(),
  storeLink: z.string().url().optional().or(z.literal("")).transform(v => v || undefined),
});

// POST /api/auth/register — public self-registration (requires admin approval)
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, name, password, phone, storeLink } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, name, password: hashed, role: "CUSTOMER", status: "PENDING", phone: phone || null, storeLink: storeLink || null },
    });

    return res.status(201).json({ message: "تم إرسال طلب التسجيل. سيتم مراجعته من قِبل الإدارة." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    if (user.status === "PENDING") {
      return res.status(403).json({ error: "حسابك قيد المراجعة. سيتم إخطارك بالبريد الإلكتروني عند القبول." });
    }
    if (user.status === "REJECTED") {
      return res.status(403).json({ error: "تم رفض طلب التسجيل. يرجى التواصل مع الدعم." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        credits: user.credits,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, credits: true, status: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user || user.status !== "ACTIVE") {
      return res.json({ message: "إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, user.name, resetLink);

    return res.json({ message: "إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = z.object({
      token: z.string(),
      password: z.string().min(6),
    }).parse(req.body);

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "الرابط غير صالح أو منتهي الصلاحية." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    ]);

    return res.json({ message: "تم تغيير كلمة المرور بنجاح." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0]?.message || "بيانات غير صحيحة" });
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

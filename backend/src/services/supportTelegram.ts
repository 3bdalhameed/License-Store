import { prisma } from "../lib/prisma";

// ── Config ────────────────────────────────────────────────────────────────────

export async function getTgConfig(): Promise<{ botToken: string; adminChatId: string }> {
  try {
    const s = await prisma.supportSettings.upsert({
      where: { id: "default" },
      create: { id: "default", botToken: "", adminChatId: "" },
      update: {},
    });
    return { botToken: s.botToken, adminChatId: s.adminChatId };
  } catch {
    return { botToken: "", adminChatId: "" };
  }
}

export async function saveTgConfig(botToken: string, adminChatId: string): Promise<void> {
  await prisma.supportSettings.upsert({
    where: { id: "default" },
    create: { id: "default", botToken, adminChatId },
    update: { botToken, adminChatId },
  });
}

// ── Core send ─────────────────────────────────────────────────────────────────

export async function sendTgMessage(
  botToken: string, chatId: string, text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!botToken?.trim() || !chatId?.trim()) {
    console.log("[Telegram] skipped — missing botToken or chatId");
    return { ok: false, error: "missing config" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json() as any;
    if (res.ok) {
      console.log(`[Telegram] ✓ sent to chatId=${chatId}`);
      return { ok: true };
    }
    console.error(`[Telegram] ✗ error: ${data.description}`);
    return { ok: false, error: data.description || "Telegram error" };
  } catch (e: any) {
    console.error(`[Telegram] ✗ network error: ${e?.message}`);
    return { ok: false, error: e?.message || "network error" };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | Date): string {
  return new Date(iso).toLocaleString("ar-EG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PRIORITY_AR: Record<string, string> = {
  NORMAL: "عادي", HIGH: "عالٍ ⚠️", URGENT: "عاجل 🔴",
};
const CATEGORY_AR: Record<string, string> = {
  ACTIVATION: "🔑 تفعيل", LOGIN: "🔐 دخول", INVITATION: "✉️ دعوة",
  EXPIRED_SUBSCRIPTION: "📅 اشتراك منتهٍ", TECHNICAL: "⚙️ تقني", OTHER: "📋 أخرى",
};

// ── Notifications ─────────────────────────────────────────────────────────────

export async function notifyNewTicket(ticket: {
  id: string; requestNumber: string; activationEmail: string;
  productType: string; employeeName: string; category: string;
  priority: string; description: string; createdAt: Date;
}): Promise<void> {
  const { botToken, adminChatId } = await getTgConfig();
  if (!botToken || !adminChatId) return;

  const text = [
    `🆕 <b>تذكرة دعم جديدة</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎫 <b>${ticket.id}</b>`,
    `📝 رقم الطلب: <code>${ticket.requestNumber}</code>`,
    `📧 الإيميل: <code>${ticket.activationEmail}</code>`,
    `📦 المنتج: ${ticket.productType}`,
    `👤 الموظف: ${ticket.employeeName}`,
    `🏷️ التصنيف: ${CATEGORY_AR[ticket.category] ?? ticket.category}`,
    `⚡ الأولوية: ${PRIORITY_AR[ticket.priority] ?? ticket.priority}`,
    ``,
    `📋 الوصف:`,
    ticket.description.length > 200
      ? ticket.description.slice(0, 200) + "…"
      : ticket.description,
    ``,
    `🕒 ${fmt(ticket.createdAt)}`,
  ].join("\n");

  void sendTgMessage(botToken, adminChatId, text);
}

export async function notifyTicketResolved(ticket: {
  id: string; requestNumber: string; activationEmail: string;
  productType: string; employeeId: string; updatedAt: Date;
}): Promise<void> {
  const { botToken } = await getTgConfig();
  if (!botToken) { console.log("[Telegram] notifyResolved skipped — no botToken"); return; }

  const emp = await prisma.supportEmployee.findUnique({
    where: { id: ticket.employeeId },
    select: { telegramChatId: true, name: true },
  });
  console.log(`[Telegram] notifyResolved — employeeId=${ticket.employeeId} emp=${JSON.stringify(emp)}`);
  if (!emp?.telegramChatId) { console.log("[Telegram] notifyResolved skipped — employee has no telegramChatId"); return; }

  const text = [
    `✅ <b>تم حل التذكرة</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎫 <b>${ticket.id}</b>`,
    `📝 رقم الطلب: <code>${ticket.requestNumber}</code>`,
    `📧 الإيميل: <code>${ticket.activationEmail}</code>`,
    `📦 المنتج: ${ticket.productType}`,
    ``,
    `⚠️ <b>يرجى إبلاغ العميل بحل مشكلته.</b>`,
    `🕒 ${fmt(ticket.updatedAt)}`,
  ].join("\n");

  void sendTgMessage(botToken, emp.telegramChatId, text);
}

export async function notifyInfoRequested(ticket: {
  id: string; requestNumber: string; activationEmail: string;
  employeeId: string; updatedAt: Date;
}, requestText: string): Promise<void> {
  const { botToken } = await getTgConfig();
  if (!botToken) return;

  const emp = await prisma.supportEmployee.findUnique({
    where: { id: ticket.employeeId },
    select: { telegramChatId: true },
  });
  if (!emp?.telegramChatId) return;

  const text = [
    `❓ <b>طُلبت معلومات إضافية</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎫 <b>${ticket.id}</b>`,
    `📝 رقم الطلب: <code>${ticket.requestNumber}</code>`,
    `📧 الإيميل: <code>${ticket.activationEmail}</code>`,
    ``,
    `📋 <b>المطلوب منك:</b>`,
    requestText,
    ``,
    `🕒 ${fmt(ticket.updatedAt)}`,
  ].join("\n");

  void sendTgMessage(botToken, emp.telegramChatId, text);
}

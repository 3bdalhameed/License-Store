// Real Telegram Bot API integration for the support system.
// Bot token + admin chat ID are stored in localStorage so the admin
// can configure them from the dashboard without touching the code.

import type { Ticket } from "./types";

const CONFIG_KEY = "support_telegram_config_v1";

export interface TelegramConfig {
  botToken:    string;
  adminChatId: string;
}

// ── Config helpers ────────────────────────────────────────────────────────────

export function getTelegramConfig(): TelegramConfig {
  if (typeof window === "undefined") return { botToken: "", adminChatId: "" };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { botToken: "", adminChatId: "" };
    return { botToken: "", adminChatId: "", ...JSON.parse(raw) };
  } catch { return { botToken: "", adminChatId: "" }; }
}

export function setTelegramConfig(patch: Partial<TelegramConfig>): void {
  if (typeof window === "undefined") return;
  const current = getTelegramConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...patch }));
}

// ── Core send ─────────────────────────────────────────────────────────────────

async function sendMessage(
  botToken: string, chatId: string, text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!botToken?.trim() || !chatId?.trim()) return { ok: false, error: "missing config" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: data.description || "Telegram error" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network error" };
  }
}

// ── Date helper ───────────────────────────────────────────────────────────────

function fmt(iso: string): string {
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

// ── Notification: admin — new ticket ─────────────────────────────────────────

export function notifyAdminNewTicket(ticket: Ticket): void {
  const { botToken, adminChatId } = getTelegramConfig();
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

  void sendMessage(botToken, adminChatId, text);
}

// ── Notification: employee — ticket resolved ──────────────────────────────────

export function notifyEmployeeResolved(
  ticket: Ticket, employeeChatId: string
): void {
  const { botToken } = getTelegramConfig();
  if (!botToken || !employeeChatId) return;

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

  void sendMessage(botToken, employeeChatId, text);
}

// ── Notification: employee — additional info requested ────────────────────────

export function notifyEmployeeInfoRequested(
  ticket: Ticket, employeeChatId: string, requestText: string
): void {
  const { botToken } = getTelegramConfig();
  if (!botToken || !employeeChatId) return;

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

  void sendMessage(botToken, employeeChatId, text);
}

// ── Test connection ────────────────────────────────────────────────────────────

export async function testTelegramConnection(
  botToken: string, chatId: string
): Promise<{ ok: boolean; error?: string }> {
  return sendMessage(
    botToken, chatId,
    "✅ <b>اتصال ناجح!</b>\nنظام دعم العملاء متصل بالتليجرام بنجاح 🎫",
  );
}

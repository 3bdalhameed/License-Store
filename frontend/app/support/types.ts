export type TicketStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFO_REQUIRED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

export type TicketCategory =
  | "ACTIVATION"
  | "LOGIN"
  | "INVITATION"
  | "EXPIRED_SUBSCRIPTION"
  | "TECHNICAL"
  | "OTHER";

export type TicketPriority = "NORMAL" | "HIGH" | "URGENT";

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "employee";
  content: string;
  isAdminNote: boolean;
  isInfoRequest: boolean;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: "admin" | "employee";
  details?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
}

export interface Ticket {
  id: string;
  requestNumber: string;
  activationEmail: string;
  productType: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerNotified: boolean;
  customerNotifiedBy?: string;
  customerNotifiedAt?: string;
  customerContact?: string;
  employeeId: string;
  employeeName: string;
  assignedTo?: string;
  internalNotes?: string;
  referenceNumber?: string;
  attachments: Attachment[];
  mediaLinks?: string[];
  comments: TicketComment[];
  activityLog: ActivityLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  NEW:                      { label: "جديد",                   color: "#2563eb", bg: "#eff6ff", border: "#93c5fd",  icon: "🔵" },
  UNDER_REVIEW:             { label: "قيد المراجعة",           color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",  icon: "🔍" },
  ADDITIONAL_INFO_REQUIRED: { label: "يحتاج معلومات إضافية",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d",  icon: "❓" },
  IN_PROGRESS:              { label: "جارٍ المعالجة",          color: "#ea580c", bg: "#fff7ed", border: "#fdba74",  icon: "⚙️" },
  RESOLVED:                 { label: "تم الحل",                color: "#16a34a", bg: "#f0fdf4", border: "#86efac",  icon: "✅" },
  CLOSED:                   { label: "مغلق",                   color: "#4b5563", bg: "#f9fafb", border: "#d1d5db",  icon: "🔒" },
  CANCELLED:                { label: "ملغي",                   color: "#9ca3af", bg: "#f3f4f6", border: "#e5e7eb",  icon: "❌" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string; border: string }> = {
  NORMAL: { label: "عادي",  color: "#4b5563", bg: "#f9fafb", border: "#d1d5db" },
  HIGH:   { label: "عالٍ",  color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  URGENT: { label: "عاجل",  color: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: string }> = {
  ACTIVATION:           { label: "مشكلة تفعيل",          icon: "🔑" },
  LOGIN:                { label: "مشكلة تسجيل دخول",     icon: "🔐" },
  INVITATION:           { label: "مشكلة دعوة",           icon: "✉️" },
  EXPIRED_SUBSCRIPTION: { label: "اشتراك منتهٍ",          icon: "📅" },
  TECHNICAL:            { label: "مشكلة تقنية",          icon: "⚙️" },
  OTHER:                { label: "أخرى",                  icon: "📋" },
};

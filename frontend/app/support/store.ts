import { Ticket, TicketComment, ActivityLogEntry, TicketStatus } from "./types";
import {
  notifyAdminNewTicket,
  notifyEmployeeResolved,
  notifyEmployeeInfoRequested,
} from "./telegram";
import { getEmployeeChatId } from "./employees-store";

const STORAGE_KEY   = "support_tickets_v1";
const COUNTER_KEY   = "support_counter_v1";
const REQ_COUNTER_KEY = "support_req_counter_v1";
const INIT_KEY      = "support_initialized_v1";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getCounter(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10);
}

function nextCounter(): number {
  const n = getCounter() + 1;
  if (typeof window !== "undefined") localStorage.setItem(COUNTER_KEY, String(n));
  return n;
}

export function generateTicketId(): string {
  return `TKT-${new Date().getFullYear()}-${String(nextCounter()).padStart(4, "0")}`;
}

export function generateRequestNumber(): string {
  if (typeof window === "undefined") return "REQ-0001";
  const n = parseInt(localStorage.getItem(REQ_COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(REQ_COUNTER_KEY, String(n));
  return `REQ-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
}

export function getTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    if (!localStorage.getItem(INIT_KEY)) {
      const mock = buildMockData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
      localStorage.setItem(COUNTER_KEY, String(mock.length));
      localStorage.setItem(INIT_KEY, "1");
      return mock;
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function save(tickets: Ticket[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function getTicketById(id: string): Ticket | null {
  return getTickets().find(t => t.id === id) ?? null;
}

export function createTicket(
  data: Omit<Ticket, "id" | "comments" | "activityLog" | "createdAt" | "updatedAt">
): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    ...data,
    id: generateTicketId(),
    comments: [],
    activityLog: [{
      id: uid(), action: "تم إنشاء التذكرة",
      performedBy: data.employeeName, performedByRole: "employee", createdAt: now,
    }],
    createdAt: now, updatedAt: now,
  };
  const all = getTickets();
  all.unshift(ticket);
  save(all);
  notifyAdminNewTicket(ticket);
  return ticket;
}

export function updateTicketStatus(
  id: string, status: TicketStatus,
  by: string, byRole: "admin" | "employee", note?: string
): Ticket | null {
  const all = getTickets();
  const i = all.findIndex(t => t.id === id);
  if (i === -1) return null;
  const now = new Date().toISOString();
  const old = all[i];
  const labels: Record<TicketStatus, string> = {
    NEW: "جديد", UNDER_REVIEW: "قيد المراجعة",
    ADDITIONAL_INFO_REQUIRED: "يحتاج معلومات إضافية",
    IN_PROGRESS: "جارٍ المعالجة", RESOLVED: "تم الحل",
    CLOSED: "مغلق", CANCELLED: "ملغي",
  };
  all[i] = {
    ...old, status, updatedAt: now,
    activityLog: [...old.activityLog, {
      id: uid(),
      action: `تغيير الحالة: "${labels[old.status]}" → "${labels[status]}"`,
      performedBy: by, performedByRole: byRole, details: note, createdAt: now,
    }],
  };
  save(all);
  if (status === "RESOLVED") {
    const chatId = getEmployeeChatId(all[i].employeeName);
    notifyEmployeeResolved(all[i], chatId);
  }
  return all[i];
}

export function addComment(
  id: string, c: Omit<TicketComment, "id" | "createdAt">
): Ticket | null {
  const all = getTickets();
  const i = all.findIndex(t => t.id === id);
  if (i === -1) return null;
  const now = new Date().toISOString();
  const comment: TicketComment = { ...c, id: uid(), createdAt: now };
  const logEntry: ActivityLogEntry = {
    id: uid(),
    action: c.isInfoRequest ? "طُلبت معلومات إضافية"
      : c.isAdminNote ? "أضاف ملاحظة داخلية" : "أضاف تعليقاً",
    performedBy: c.authorName, performedByRole: c.authorRole,
    details: c.content.length > 100 ? c.content.slice(0, 100) + "…" : c.content,
    createdAt: now,
  };
  all[i] = {
    ...all[i],
    comments: [...all[i].comments, comment],
    activityLog: [...all[i].activityLog, logEntry],
    status: c.isInfoRequest ? "ADDITIONAL_INFO_REQUIRED" : all[i].status,
    updatedAt: now,
  };
  save(all);
  if (c.isInfoRequest) {
    const chatId = getEmployeeChatId(all[i].employeeName);
    notifyEmployeeInfoRequested(all[i], chatId, c.content);
  }
  return all[i];
}

export function markCustomerNotified(id: string, by: string): Ticket | null {
  const all = getTickets();
  const i = all.findIndex(t => t.id === id);
  if (i === -1) return null;
  const now = new Date().toISOString();
  all[i] = {
    ...all[i],
    customerNotified: true, customerNotifiedBy: by, customerNotifiedAt: now, updatedAt: now,
    activityLog: [...all[i].activityLog, {
      id: uid(), action: "✅ تم إبلاغ العميل",
      performedBy: by, performedByRole: "employee", createdAt: now,
    }],
  };
  save(all);
  // no Telegram notification needed for customer-notified action
  return all[i];
}

export function updateTicket(id: string, patch: Partial<Ticket>): Ticket | null {
  const all = getTickets();
  const i = all.findIndex(t => t.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  save(all);
  return all[i];
}

export function deleteTicket(id: string): boolean {
  const all = getTickets();
  const filtered = all.filter(t => t.id !== id);
  if (filtered.length === all.length) return false;
  save(filtered);
  return true;
}


// ── Mock data ─────────────────────────────────────────────────────────────────
function ago(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function buildMockData(): Ticket[] {
  return [
    {
      id: "TKT-2025-0001", requestNumber: "REQ-4421",
      activationEmail: "ahmed.ali@gmail.com", productType: "Microsoft Office 365",
      description: "العميل لا يستطيع تفعيل الاشتراك، تظهر له رسالة خطأ (0x80070005) عند إدخال مفتاح التفعيل على جهاز Windows 11.",
      category: "ACTIVATION", priority: "HIGH", status: "RESOLVED",
      customerNotified: false, customerContact: "+966501234567",
      employeeId: "emp-1", employeeName: "سارة الموظفة",
      referenceNumber: "REF-MS-001",
      attachments: [], internalNotes: "تم التحقق من المفتاح، المشكلة في الإعدادات الإقليمية.",
      comments: [
        { id: "c1", authorId: "adm1", authorName: "الإدارة", authorRole: "admin",
          content: "تم التحقق من المفتاح، يبدو أن هناك مشكلة في التفعيل الإقليمي. سيتم إرسال مفتاح بديل.",
          isAdminNote: true, isInfoRequest: false, createdAt: ago(18) },
        { id: "c2", authorId: "adm1", authorName: "الإدارة", authorRole: "admin",
          content: "تم إرسال المفتاح البديل وحل المشكلة بنجاح.",
          isAdminNote: true, isInfoRequest: false, createdAt: ago(10) },
      ],
      activityLog: [
        { id: "a1", action: "تم إنشاء التذكرة", performedBy: "سارة الموظفة", performedByRole: "employee", createdAt: ago(48) },
        { id: "a2", action: "تغيير الحالة: \"جديد\" → \"قيد المراجعة\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(36) },
        { id: "a3", action: "أضاف ملاحظة داخلية", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(18) },
        { id: "a4", action: "تغيير الحالة: \"قيد المراجعة\" → \"تم الحل\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(10) },
      ],
      createdAt: ago(48), updatedAt: ago(10),
    },
    {
      id: "TKT-2025-0002", requestNumber: "REQ-4435",
      activationEmail: "fatima.k@outlook.com", productType: "Adobe Creative Cloud",
      description: "العميلة لا تستطيع تسجيل الدخول بعد تغيير كلمة المرور، الموقع يعيدها لصفحة تسجيل الدخول باستمرار.",
      category: "LOGIN", priority: "URGENT", status: "ADDITIONAL_INFO_REQUIRED",
      customerNotified: false, customerContact: "+96655987654",
      employeeId: "emp-2", employeeName: "محمد الدعم",
      attachments: [],
      comments: [
        { id: "c3", authorId: "adm1", authorName: "الإدارة", authorRole: "admin",
          content: "نحتاج: ١) لقطة شاشة واضحة لرسالة الخطأ، ٢) تأكيد الإيميل المستخدم بالضبط، ٣) اسم المتصفح وإصداره.",
          isAdminNote: false, isInfoRequest: true, createdAt: ago(3) },
      ],
      activityLog: [
        { id: "a5", action: "تم إنشاء التذكرة", performedBy: "محمد الدعم", performedByRole: "employee", createdAt: ago(12) },
        { id: "a6", action: "تغيير الحالة: \"جديد\" → \"قيد المراجعة\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(6) },
        { id: "a7", action: "طُلبت معلومات إضافية", performedBy: "الإدارة", performedByRole: "admin", details: "لقطة شاشة + إيميل", createdAt: ago(3) },
      ],
      createdAt: ago(12), updatedAt: ago(3),
    },
    {
      id: "TKT-2025-0003", requestNumber: "REQ-4412",
      activationEmail: "khalid.m@company.sa", productType: "Windows 11 Pro",
      description: "العميل اشترى Windows 11 Pro منذ أسبوع لكن لم يستلم مفتاح التفعيل حتى الآن.",
      category: "ACTIVATION", priority: "URGENT", status: "IN_PROGRESS",
      customerNotified: false, customerContact: "+966500112233",
      employeeId: "emp-1", employeeName: "سارة الموظفة",
      attachments: [],
      comments: [],
      activityLog: [
        { id: "a8", action: "تم إنشاء التذكرة", performedBy: "سارة الموظفة", performedByRole: "employee", createdAt: ago(168) },
        { id: "a9", action: "تغيير الحالة: \"جديد\" → \"جارٍ المعالجة\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(144) },
      ],
      createdAt: ago(168), updatedAt: ago(144),
    },
    {
      id: "TKT-2025-0004", requestNumber: "REQ-4440",
      activationEmail: "nora.h@hotmail.com", productType: "Spotify Premium",
      description: "اشتراك Spotify انتهى ولم يتجدد تلقائياً رغم توفر الرصيد.",
      category: "EXPIRED_SUBSCRIPTION", priority: "NORMAL", status: "NEW",
      customerNotified: false, customerContact: "+96611223344",
      employeeId: "emp-2", employeeName: "محمد الدعم",
      attachments: [],
      comments: [],
      activityLog: [
        { id: "a10", action: "تم إنشاء التذكرة", performedBy: "محمد الدعم", performedByRole: "employee", createdAt: ago(1) },
      ],
      createdAt: ago(1), updatedAt: ago(1),
    },
    {
      id: "TKT-2025-0005", requestNumber: "REQ-4398",
      activationEmail: "omar.k@yahoo.com", productType: "Netflix Premium",
      description: "دعوة الاشتراك العائلي لم تصل للعميل رغم مرور 24 ساعة.",
      category: "INVITATION", priority: "HIGH", status: "RESOLVED",
      customerNotified: true, customerNotifiedBy: "سارة الموظفة", customerNotifiedAt: ago(8),
      customerContact: "+96655443322",
      employeeId: "emp-1", employeeName: "سارة الموظفة",
      attachments: [],
      comments: [
        { id: "c4", authorId: "adm1", authorName: "الإدارة", authorRole: "admin",
          content: "تم إعادة إرسال الدعوة على الإيميل الصحيح، تأكد أن العميل يفحص مجلد Spam.",
          isAdminNote: true, isInfoRequest: false, createdAt: ago(24) },
      ],
      activityLog: [
        { id: "a11", action: "تم إنشاء التذكرة", performedBy: "سارة الموظفة", performedByRole: "employee", createdAt: ago(72) },
        { id: "a12", action: "تغيير الحالة: \"جديد\" → \"تم الحل\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(24) },
        { id: "a13", action: "✅ تم إبلاغ العميل", performedBy: "سارة الموظفة", performedByRole: "employee", createdAt: ago(8) },
      ],
      createdAt: ago(72), updatedAt: ago(8),
    },
    {
      id: "TKT-2025-0006", requestNumber: "REQ-4380",
      activationEmail: "layla.s@gmail.com", productType: "Canva Pro",
      description: "المستخدمة تعاني من مشكلة في رفع الملفات، يظهر خطأ 500.",
      category: "TECHNICAL", priority: "NORMAL", status: "CLOSED",
      customerNotified: true, customerNotifiedBy: "محمد الدعم", customerNotifiedAt: ago(120),
      employeeId: "emp-2", employeeName: "محمد الدعم",
      attachments: [],
      comments: [],
      activityLog: [
        { id: "a14", action: "تم إنشاء التذكرة", performedBy: "محمد الدعم", performedByRole: "employee", createdAt: ago(240) },
        { id: "a15", action: "تغيير الحالة: \"تم الحل\" → \"مغلق\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(144) },
        { id: "a16", action: "✅ تم إبلاغ العميل", performedBy: "محمد الدعم", performedByRole: "employee", createdAt: ago(120) },
      ],
      createdAt: ago(240), updatedAt: ago(120),
    },
    {
      id: "TKT-2025-0007", requestNumber: "REQ-4441",
      activationEmail: "hassan.m@mail.com", productType: "Microsoft Office 365",
      description: "العميل يريد نقل الاشتراك لجهاز آخر، يظهر خطأ بأن الحد الأقصى للأجهزة قد تم الوصول إليه.",
      category: "TECHNICAL", priority: "NORMAL", status: "UNDER_REVIEW",
      customerNotified: false, customerContact: "+96677889900",
      employeeId: "emp-1", employeeName: "سارة الموظفة",
      attachments: [],
      comments: [],
      activityLog: [
        { id: "a17", action: "تم إنشاء التذكرة", performedBy: "سارة الموظفة", performedByRole: "employee", createdAt: ago(5) },
        { id: "a18", action: "تغيير الحالة: \"جديد\" → \"قيد المراجعة\"", performedBy: "الإدارة", performedByRole: "admin", createdAt: ago(3) },
      ],
      createdAt: ago(5), updatedAt: ago(3),
    },
    {
      id: "TKT-2025-0008", requestNumber: "REQ-4442",
      activationEmail: "rania.f@company.com", productType: "Google Workspace",
      description: "لم تصل رسالة الدعوة لإيميل العمل الخاص بالعميلة رغم مرور يومين.",
      category: "INVITATION", priority: "HIGH", status: "NEW",
      customerNotified: false, customerContact: "+96644556677",
      employeeId: "emp-2", employeeName: "محمد الدعم",
      attachments: [],
      comments: [],
      activityLog: [
        { id: "a19", action: "تم إنشاء التذكرة", performedBy: "محمد الدعم", performedByRole: "employee", createdAt: ago(0.5) },
      ],
      createdAt: ago(0.5), updatedAt: ago(0.5),
    },
  ];
}

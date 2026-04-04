// Support employee accounts — created & managed by the admin.
// Stored entirely in localStorage (no backend needed for the support system).

export interface SupportEmployee {
  id:             string;
  name:           string;
  email:          string;
  password:       string;        // plain text — acceptable for a local-only mock system
  telegramChatId?: string;       // employee's Telegram chat ID for notifications
  createdAt:      string;
}

const KEY    = "support_employees_v2";
const KEY_V1 = "support_employees_v1";

function uid() {
  return "emp-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Normalise a raw record so it always has an `email` field.
// Old records stored `username` instead — keep supporting them.
function normalise(raw: Record<string, string>): SupportEmployee {
  return {
    id:             raw.id             || uid(),
    name:           raw.name           || "",
    email:          raw.email          || raw.username || "",
    password:       raw.password       || "",
    telegramChatId: raw.telegramChatId || undefined,
    createdAt:      raw.createdAt      || new Date().toISOString(),
  };
}

function load(): SupportEmployee[] {
  if (typeof window === "undefined") return [];
  try {
    const v2raw = localStorage.getItem(KEY);
    if (v2raw) {
      return (JSON.parse(v2raw) as Record<string, string>[]).map(normalise);
    }
    // First run with v2 key — migrate old v1 data if it exists
    const v1raw = localStorage.getItem(KEY_V1);
    if (v1raw) {
      const migrated = (JSON.parse(v1raw) as Record<string, string>[]).map(normalise);
      save(migrated);
      return migrated;
    }
    return [];
  } catch { return []; }
}

function save(list: SupportEmployee[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(KEY, JSON.stringify(list));
}

export function getEmployees(): SupportEmployee[] {
  return load();
}

export function createEmployee(
  name: string, email: string, password: string
): SupportEmployee | { error: string } {
  const all = load();
  if (all.some(e => (e.email || "").toLowerCase() === email.toLowerCase()))
    return { error: "البريد الإلكتروني مستخدم بالفعل" };
  const emp: SupportEmployee = { id: uid(), name, email, password, createdAt: new Date().toISOString() };
  all.push(emp);
  save(all);
  return emp;
}

export function deleteEmployee(id: string): boolean {
  const all = load();
  const next = all.filter(e => e.id !== id);
  if (next.length === all.length) return false;
  save(next);
  return true;
}

export function updateEmployee(
  id: string,
  patch: Partial<Pick<SupportEmployee, "name" | "password" | "telegramChatId">>
): SupportEmployee | null {
  const all = load();
  const i = all.findIndex(e => e.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...patch };
  save(all);
  return all[i];
}

/** Returns the employee if credentials match, or null. */
export function findByCredentials(
  email: string, password: string
): SupportEmployee | null {
  return load().find(
    e => (e.email || "").toLowerCase() === email.toLowerCase() && e.password === password
  ) ?? null;
}

/** Look up an employee's Telegram chat ID by their display name. */
export function getEmployeeChatId(employeeName: string): string {
  return load().find(e => e.name === employeeName)?.telegramChatId ?? "";
}

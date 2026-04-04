// Support-system session — separate from the main store session.
// Stored under "support_session" key so it doesn't collide with "user".

export interface SupportUser {
  id:   string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
}

const SESSION_KEY = "support_session";
const TOKEN_KEY   = "support_token";

export function getSupportToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSupportToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getSupportUser(): SupportUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as SupportUser;
    if (u?.id && u?.name && (u.role === "ADMIN" || u.role === "EMPLOYEE")) return u;
    return null;
  } catch {
    return null;
  }
}

export function setSupportUser(user: SupportUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSupportSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

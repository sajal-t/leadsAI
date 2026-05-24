export function savePending(key: string, data: Record<string, string>): void {
  sessionStorage.setItem(key, JSON.stringify(data));
}

export function readPending(key: string): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPending(key: string): void {
  sessionStorage.removeItem(key);
}

export const SIGNUP_PENDING_KEY = "leadforge_signup_pending";
export const LOGIN_OTP_PENDING_KEY = "leadforge_login_otp_pending";

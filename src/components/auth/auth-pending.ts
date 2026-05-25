function writePending(key: string, raw: string): void {
  try {
    sessionStorage.setItem(key, raw);
  } catch {
    /* private mode / blocked */
  }
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* blocked */
  }
}

export function savePending(key: string, data: Record<string, string>): void {
  if (typeof window === "undefined") return;
  writePending(key, JSON.stringify(data));
}

export function readPending(key: string): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  const raw =
    (() => {
      try {
        return sessionStorage.getItem(key) ?? localStorage.getItem(key);
      } catch {
        return null;
      }
    })() ?? null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPending(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const SIGNUP_PENDING_KEY = "leadforge_signup_pending";
export const LOGIN_OTP_PENDING_KEY = "leadforge_login_otp_pending";

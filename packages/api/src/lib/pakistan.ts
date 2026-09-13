/** Normalize CNIC to 13 digits (strips dashes/spaces). Returns null if invalid length. */
export function normalizeCnic(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 13) return null;
  return digits;
}

export function isValidCnic(input: string): boolean {
  return normalizeCnic(input) !== null;
}

/** Format stored CNIC for display: xxxxx-xxxxxxx-x */
export function formatCnic(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 13) return digits;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/**
 * Normalize Pakistan mobile to +92XXXXXXXXXX (12 digits after +).
 * Accepts 03XXXXXXXXX, 3XXXXXXXXX, +923XXXXXXXXX, 0092...
 */
export function normalizePakistanPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (digits.startsWith("92") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+92${digits}`;
  }
  return null;
}

export function isValidPakistanPhone(input: string): boolean {
  return normalizePakistanPhone(input) !== null;
}

/** Display stored +92XXXXXXXXXX as 03XX-XXXXXXX */
export function formatPakistanPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) {
    return `0${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return e164;
}

/** Mask while typing: 03XX-XXXXXXX */
export function maskPakistanPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "").slice(0, 12);
  if (digits.startsWith("92")) digits = `0${digits.slice(2)}`;
  digits = digits.slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Mask CNIC while typing: xxxxx-xxxxxxx-x */
export function maskCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Validate calendar date of birth as YYYY-MM-DD.
 * Rejects impossible dates, future dates, and ages over 120.
 */
export function parseIsoDateOfBirth(input: string, now = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() > todayUtc) return null;
  const oldest = Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() < oldest) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export const CNIC_ALREADY_REGISTERED =
  "This CNIC is already in the system. Log in or contact your clinic.";

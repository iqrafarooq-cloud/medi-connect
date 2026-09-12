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

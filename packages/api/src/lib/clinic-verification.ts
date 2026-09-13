export const SUPPORT_EMAIL = "info@mediconnect.com";

export const CLINIC_STATUS = {
  PENDING: "pending_verification",
  ACTIVE: "active",
  REJECTED: "rejected",
} as const;

export type ClinicVerificationStatus =
  (typeof CLINIC_STATUS)[keyof typeof CLINIC_STATUS];

export function isAdminEmail(email: string, adminEmail: string): boolean {
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

export type LoginGateResult =
  | { allow: true }
  | {
      allow: false;
      reason: "admin" | "pending" | "rejected" | "no_clinic";
      message: string;
    };

export function clinicLoginGate(params: {
  email: string;
  adminEmail: string;
  clinicStatus: string | null;
}): LoginGateResult {
  if (isAdminEmail(params.email, params.adminEmail)) {
    return {
      allow: false,
      reason: "admin",
      message: "Use the admin portal at /admin/login instead.",
    };
  }

  if (!params.clinicStatus) {
    return {
      allow: false,
      reason: "no_clinic",
      message: "Complete clinic registration before signing in.",
    };
  }

  if (params.clinicStatus === CLINIC_STATUS.PENDING) {
    return {
      allow: false,
      reason: "pending",
      message:
        "Your clinic registration is awaiting admin verification. You can sign in after approval.",
    };
  }

  if (params.clinicStatus === CLINIC_STATUS.REJECTED) {
    return {
      allow: false,
      reason: "rejected",
      message: `Admin has rejected your verification. Please contact MediConnect at ${SUPPORT_EMAIL}.`,
    };
  }

  if (params.clinicStatus === CLINIC_STATUS.ACTIVE) {
    return { allow: true };
  }

  return {
    allow: false,
    reason: "no_clinic",
    message: "Complete clinic registration before signing in.",
  };
}

export function registrationBlockedMessage(
  status: string | null,
): string | null {
  if (
    status === CLINIC_STATUS.PENDING ||
    status === CLINIC_STATUS.REJECTED
  ) {
    return `This clinic is already registered but not approved by the admin. For more information, contact MediConnect at ${SUPPORT_EMAIL}.`;
  }
  return null;
}

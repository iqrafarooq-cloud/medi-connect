export function getErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    for (const issue of error) {
      const message = getErrorMessage(issue);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; data?: { message?: unknown } };
    if (typeof maybeError.message === "string" && maybeError.message.length > 0) {
      return maybeError.message;
    }
    if (typeof maybeError.data?.message === "string" && maybeError.data.message.length > 0) {
      return maybeError.data.message;
    }
  }

  return null;
}

export function getRpcErrorMessage(error: unknown, fallback: string): string {
  return getErrorMessage(error) ?? fallback;
}

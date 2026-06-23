// Non-2xx bodies still carry the { error } envelope field; surface it if present.
export function errMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "error" in error) {
    const e = (error as { error?: unknown }).error;
    if (typeof e === "string") return e;
  }
  return fallback;
}

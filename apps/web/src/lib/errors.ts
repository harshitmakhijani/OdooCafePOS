/**
 * Extract a human-readable message from an unknown thrown value (typically an
 * Axios error wrapping the API's `{ error: { message } }` envelope, PRD §16.4).
 * Lets call sites use `catch (err)` (err: unknown) instead of `catch (err: any)`.
 */
interface ApiErrorShape {
  response?: { data?: { error?: { message?: string }; message?: string } };
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorShape;
  return e?.response?.data?.error?.message ?? e?.response?.data?.message ?? fallback;
}

import { timingSafeEqual } from "node:crypto";

/** Constant-time string comparison, so secrets can't be guessed via response timing. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * True when the request carries `Authorization: Bearer <ADMIN_TOKEN>`.
 * Fails closed: if ADMIN_TOKEN isn't configured, nothing is authorized.
 */
export function isAdmin(authorization: string | null): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return safeEqual(authorization, `Bearer ${token}`);
}

/**
 * True when the request carries the shared Vapi secret in `x-vapi-secret`.
 * Fails closed: if VAPI_WEBHOOK_SECRET isn't configured, every call is rejected.
 */
export function isVapi(secretHeader: string | null): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(secretHeader, secret);
}

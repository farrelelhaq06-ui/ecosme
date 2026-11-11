import type { Role } from "@/lib/domain/types";

/**
 * Signed session token (HMAC-SHA256) using Web Crypto so it works in both
 * the Proxy and server components. Format: base64url(payload).base64url(sig)
 */

export const SESSION_COOKIE = "ecosme_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
  org: string;
  exp: number; // epoch seconds
}

export const ROLE_HOME: Record<Role, string> = {
  ikm: "/app/overview",
  bank: "/bank/overview",
  admin: "/admin/overview",
};

export const ROLE_PREFIX: Record<Role, string> = {
  ikm: "/app",
  bank: "/bank",
  admin: "/admin",
};

function secret(): string {
  return process.env.SESSION_SECRET || "ecosme-dev-only-secret-change-me-in-production";
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig) as BufferSource, enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    if (!["ikm", "bank", "admin"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

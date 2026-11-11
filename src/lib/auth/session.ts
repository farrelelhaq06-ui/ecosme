import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/domain/types";
import { ROLE_HOME, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "@/lib/auth/token";

export type { SessionPayload };

/** Demo accounts. Fictional people and organizations. */
export const DEMO_ACCOUNTS: Record<Role, Omit<SessionPayload, "exp">> = {
  ikm: { sub: "usr-ikm-001", name: "Rina Wulandari", email: "rina@demo.ecosme.id", role: "ikm", org: "CV Maju Logam Presisi" },
  bank: { sub: "usr-bank-001", name: "Andi Pratama", email: "andi@bankmitra.demo", role: "bank", org: "Bank Mitra (Demo)" },
  admin: { sub: "usr-adm-001", name: "Sari Nugroho", email: "sari@ecosme.id", role: "admin", org: "EcoSME" },
};

export async function createSession(user: Omit<SessionPayload, "exp">): Promise<void> {
  const token = await signSession({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * Data-access-layer guard. Call in layouts, pages, server actions and route
 * handlers — the Proxy check alone is not sufficient authorization.
 */
export async function requireRole(role: Role): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== role) redirect(ROLE_HOME[s.role]);
  return s;
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, DEMO_ACCOUNTS, destroySession, getSession } from "@/lib/auth/session";
import { ROLE_HOME, ROLE_PREFIX } from "@/lib/auth/token";
import type { Role } from "@/lib/domain/types";
import { audit, store } from "@/lib/store/platform-store";

/** Shared demo password, shown on the login page. */
const DEMO_PASSWORD = "ecosme-demo";

export interface FormState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function safeNext(next: unknown, role: Role): string {
  if (typeof next === "string" && next.startsWith(ROLE_PREFIX[role] + "/") && !next.startsWith("//")) return next;
  return ROLE_HOME[role];
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors };
  }
  const account = Object.values(DEMO_ACCOUNTS).find((a) => a.email === parsed.data.email);
  const registered = store().users.find((u) => u.email === parsed.data.email && u.status === "active");
  if (!account && !registered) return { ok: false, message: "Email atau kata sandi salah." };
  if (parsed.data.password !== DEMO_PASSWORD) return { ok: false, message: "Email atau kata sandi salah." };

  const user = account ?? {
    sub: registered!.id,
    name: registered!.name,
    email: registered!.email,
    role: registered!.role,
    org: registered!.organization,
  };
  if (store().users.find((u) => u.email === user.email)?.status === "suspended") {
    return { ok: false, message: "Akun ini ditangguhkan. Hubungi administrator." };
  }
  await createSession(user);
  audit(user.name, user.role, "Masuk ke platform", user.org);
  redirect(safeNext(formData.get("next"), user.role));
}

export async function demoLoginAction(formData: FormData): Promise<void> {
  const role = formData.get("role");
  if (role !== "ikm" && role !== "bank" && role !== "admin") redirect("/login");
  const user = DEMO_ACCOUNTS[role];
  await createSession(user);
  audit(user.name, user.role, "Masuk ke platform (akun demo)", user.org);
  redirect(safeNext(formData.get("next"), role));
}

const registerSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(80),
  business: z.string().trim().min(3, "Nama usaha minimal 3 karakter").max(120),
  sector: z.string().trim().min(1, "Pilih sektor industri"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|0)8[0-9]{7,12}$/, "Gunakan format nomor Indonesia, mis. 0812xxxxxxx"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  terms: z.literal("on", { message: "Anda perlu menyetujui syarat & kebijakan privasi" }),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors, message: "Periksa kembali isian formulir." };
  }
  const s = store();
  if (s.users.some((u) => u.email === parsed.data.email) || Object.values(DEMO_ACCOUNTS).some((a) => a.email === parsed.data.email)) {
    return { ok: false, fieldErrors: { email: "Email sudah terdaftar" } };
  }
  const id = `usr-ikm-${s.users.length + 100}`;
  s.users.push({
    id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: "ikm",
    organization: parsed.data.business,
    status: "active",
    lastActive: new Date().toISOString(),
  });
  audit(parsed.data.name, "ikm", "Mendaftar akun baru (mode demo)", parsed.data.business);
  await createSession({ sub: id, name: parsed.data.name, email: parsed.data.email, role: "ikm", org: parsed.data.business });
  redirect("/app/overview?welcome=1");
}

export async function logoutAction(): Promise<void> {
  const s = await getSession();
  if (s) audit(s.name, s.role, "Keluar dari platform", s.org);
  await destroySession();
  redirect("/login");
}

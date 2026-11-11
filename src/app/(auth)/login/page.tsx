import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/token";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk", description: "Masuk ke EcoSME sebagai IKM, mitra keuangan, atau admin." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, session] = await Promise.all([searchParams, getSession()]);
  if (session) redirect(ROLE_HOME[session.role]);
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Masuk ke EcoSME</h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Daftar gratis
        </Link>
      </p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
    </>
  );
}

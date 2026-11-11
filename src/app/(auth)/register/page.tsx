import type { Metadata } from "next";
import Link from "next/link";
import { PRICING_PLANS } from "@/lib/config";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar", description: "Daftarkan usaha Anda di EcoSME untuk mulai memantau energi." };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const chosen = PRICING_PLANS.find((p) => p.id === plan);
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Mulai monitoring energi</h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Masuk
        </Link>
      </p>
      {chosen && (
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-[13px] text-forest ring-1 ring-brand-200">
          Paket dipilih: <strong>{chosen.name}</strong> (harga usulan/demo)
        </p>
      )}
      <div className="mt-8">
        <RegisterForm plan={plan} />
      </div>
    </>
  );
}

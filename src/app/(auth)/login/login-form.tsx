"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { demoLoginAction, loginAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Memproses…" : children}
    </Button>
  );
}

function RoleButton({ role, icon, title, desc }: { role: string; icon: React.ReactNode; title: string; desc: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("role") === role;
  return (
    <button
      type="submit"
      name="role"
      value={role}
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">{mine ? <Loader2 className="animate-spin" /> : icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] text-muted">{desc}</span>
      </span>
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, { ok: false });
  return (
    <div className="space-y-8">
      <form action={demoLoginAction} className="space-y-2.5" aria-label="Masuk dengan akun demo">
        {next && <input type="hidden" name="next" value={next} />}
        <p className="text-[13px] font-semibold text-ink">Masuk cepat dengan akun demo</p>
        <RoleButton role="ikm" icon={<Building2 />} title="Pemilik IKM · Rina Wulandari" desc="CV Maju Logam Presisi (fiktif): monitoring, M&V, pembiayaan" />
        <RoleButton role="bank" icon={<Landmark />} title="Analis Bank · Andi Pratama" desc="Bank Mitra (Demo): pipeline & peninjauan pengajuan" />
        <RoleButton role="admin" icon={<ShieldCheck />} title="Admin Platform · Sari Nugroho" desc="Pengguna, perangkat, kualitas data, metodologi" />
      </form>

      <div className="relative text-center text-[12px] text-muted">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
        <span className="relative bg-white px-3">atau masuk dengan email</span>
      </div>

      <form action={action} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.message && <Callout tone="danger">{state.message}</Callout>}
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="nama@usaha.co.id" aria-invalid={!!state.fieldErrors?.email} required />
        </Field>
        <Field label="Kata sandi" htmlFor="password" error={state.fieldErrors?.password} hint="Akun demo memakai kata sandi: ecosme-demo">
          <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!state.fieldErrors?.password} required />
        </Field>
        <Submit>Masuk</Submit>
      </form>
    </div>
  );
}

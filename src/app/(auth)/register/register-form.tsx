"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { registerAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";

const SECTORS = ["Fabrikasi logam", "Tekstil & garmen", "Makanan & minuman", "Furnitur & kayu", "Plastik & karet", "Keramik & bahan bangunan", "Lainnya"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Membuat akun…" : "Buat akun"}
    </Button>
  );
}

export function RegisterForm({ plan }: { plan?: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, { ok: false });
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {plan && <input type="hidden" name="plan" value={plan} />}
      {state.message && !state.ok && <Callout tone="danger">{state.message}</Callout>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="name" error={e.name}>
          <Input id="name" name="name" autoComplete="name" aria-invalid={!!e.name} required />
        </Field>
        <Field label="Nomor WhatsApp" htmlFor="phone" error={e.phone}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0812xxxxxxx" aria-invalid={!!e.phone} required />
        </Field>
      </div>
      <Field label="Nama usaha" htmlFor="business" error={e.business}>
        <Input id="business" name="business" autoComplete="organization" placeholder="CV / UD / PT …" aria-invalid={!!e.business} required />
      </Field>
      <Field label="Sektor industri" htmlFor="sector" error={e.sector}>
        <Select id="sector" name="sector" defaultValue="" aria-invalid={!!e.sector} required>
          <option value="" disabled>
            Pilih sektor
          </option>
          {SECTORS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Email kerja" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!e.email} required />
      </Field>
      <Field label="Kata sandi" htmlFor="password" error={e.password} hint="Minimal 8 karakter">
        <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!e.password} required />
      </Field>
      <div>
        <label className="flex items-start gap-2.5 text-[13px] text-muted">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 rounded accent-brand-600" aria-invalid={!!e.terms} />
          <span>
            Saya menyetujui <a href="/terms" className="font-semibold text-brand-700 hover:underline" target="_blank">Syarat Layanan</a> dan{" "}
            <a href="/privacy" className="font-semibold text-brand-700 hover:underline" target="_blank">Kebijakan Privasi</a>.
          </span>
        </label>
        {e.terms && <p className="mt-1 text-[12px] font-medium text-danger">{e.terms}</p>}
      </div>
      <Submit />
      <p className="text-[12px] text-muted">Mode demo: akun disimpan di memori server dan akan hilang saat server dimulai ulang. Kata sandi tidak disimpan.</p>
    </form>
  );
}

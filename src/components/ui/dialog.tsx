"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Accessible modal built on the native <dialog> element (focus trap, Esc to
 * close and inert background are provided by the browser).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-2xl border border-line bg-white p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-navy/40 backdrop:backdrop-blur-[2px] open:animate-rise`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          {description && <div className="mt-1 text-[13px] text-muted">{description}</div>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup dialog">
          <X />
        </Button>
      </div>
      {children && <div className="px-6 pt-4">{children}</div>}
      {footer && <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-6 py-4">{footer}</div>}
      {!footer && <div className="h-6" />}
    </dialog>
  );
}

/** Confirmation dialog for destructive or consequential actions. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  destructive = false,
  pending = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Batal
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
            {pending ? "Memproses…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {destructive && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-50 text-danger">
            <AlertTriangle className="size-4" aria-hidden />
          </span>
        )}
        <div className="text-[13.5px] leading-6 text-muted">{description}</div>
      </div>
    </Dialog>
  );
}

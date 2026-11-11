import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dark";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:translate-y-px [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white shadow-sm shadow-brand-700/20 hover:bg-brand-600",
  secondary: "bg-brand-100 text-forest hover:bg-brand-200",
  outline: "border border-line-strong bg-white text-ink hover:bg-canvas hover:border-subtle",
  ghost: "text-muted hover:bg-black/[0.04] hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger-700",
  dark: "bg-forest text-white hover:bg-forest-800",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
  icon: "size-9 [&_svg]:size-[18px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

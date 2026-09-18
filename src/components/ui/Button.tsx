import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-orange-600 text-white hover:shadow-brand hover:-translate-y-0.5 active:translate-y-0",
  ghost:
    "bg-transparent border border-ink-600 text-paper hover:bg-ink-800",
  danger:
    "bg-transparent border border-red-900 text-red-400 hover:bg-red-950/40",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full font-display font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

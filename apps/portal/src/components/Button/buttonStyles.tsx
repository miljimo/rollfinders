import { clsx } from "clsx";
import type { ButtonSize, ButtonVariant } from "./types";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md text-center font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  neutral: "bg-stone-950 text-white hover:bg-stone-800",
  secondary: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  subtle: "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 py-3 text-sm",
  sm: "min-h-9 px-2 py-1 text-xs",
  icon: "size-10 p-0 text-sm",
};

const disabledClasses = "cursor-not-allowed opacity-60 hover:bg-current";
const disabledVariantClasses: Record<ButtonVariant, string> = {
  primary: "hover:bg-teal-700",
  neutral: "hover:bg-stone-950",
  secondary: "hover:bg-white",
  danger: "hover:bg-white",
  subtle: "hover:bg-transparent",
};

export function buttonClassName({
  className,
  disabled,
  size = "md",
  variant = "neutral",
}: {
  className?: string;
  disabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled && disabledClasses,
    disabled && disabledVariantClasses[variant],
    className,
  );
}


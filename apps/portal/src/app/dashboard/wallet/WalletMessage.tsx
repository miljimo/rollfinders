import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

export function WalletMessage({ className = "", message, tone }: { className?: string; message: string; tone: "error" | "success" | "warning" }) {
  const toneClassName = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-teal-200 bg-teal-50 text-teal-900",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? Info : TriangleAlert;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-4 text-sm font-bold ${toneClassName} ${className}`}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}


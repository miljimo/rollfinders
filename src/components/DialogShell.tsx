import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/Button";

export function DialogShell({
  children,
  closeHref,
  description,
  maxWidthClass = "max-w-4xl",
  title,
}: {
  children: React.ReactNode;
  closeHref: string;
  description: string;
  maxWidthClass?: string;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 sm:py-12" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
      <Link href={closeHref} className="fixed inset-0" aria-label={`Close ${title} dialog`} />
      <section className={`relative z-[71] w-full rounded-lg bg-white p-5 shadow-2xl sm:p-6 ${maxWidthClass}`}>
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="admin-dialog-title" className="text-3xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          <Button href={closeHref} size="icon" variant="secondary" className="shrink-0 border-stone-200 text-slate-600" aria-label={`Close ${title} dialog`}>
            <X size={20} aria-hidden />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

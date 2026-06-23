import type { ReactNode } from "react";

export function Differentiator({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-stone-200 bg-[#f8faf7] p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">{icon}</div>
      <div>
        <h2 className="text-sm font-black text-stone-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
      </div>
    </div>
  );
}

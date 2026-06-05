"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export function ActionMenu({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={22} aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
      {open ? (
        <div onClick={() => setOpen(false)} className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-xl" role="menu">
          {children}
        </div>
      ) : null}
    </div>
  );
}

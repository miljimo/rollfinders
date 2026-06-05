"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export function ActionMenu({
  buttonClassName = "inline-flex size-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-50",
  children,
  label,
  menuClassName = "absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-xl",
  trigger,
}: {
  buttonClassName?: string;
  children: React.ReactNode;
  label: string;
  menuClassName?: string;
  trigger?: React.ReactNode;
}) {
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
        className={buttonClassName}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger ?? <MoreVertical size={22} aria-hidden />}
        <span className="sr-only">{label}</span>
      </button>
      {open ? (
        <div onClick={() => setOpen(false)} className={menuClassName} role="menu">
          {children}
        </div>
      ) : null}
    </div>
  );
}

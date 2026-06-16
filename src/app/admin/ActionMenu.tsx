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
  const [menuPosition, setMenuPosition] = useState<{ maxHeight: number; right: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 8;
      setMenuPosition({
        maxHeight: Math.max(160, window.innerHeight - top - 16),
        right: Math.max(8, window.innerWidth - rect.right),
        top,
      });
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    updateMenuPosition();
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        ref={buttonRef}
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
        <div
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a")) {
              setOpen(false);
            }
          }}
          className={menuClassName}
          role="menu"
          style={menuPosition ? {
            maxHeight: menuPosition.maxHeight,
            overflowY: "auto",
            position: "fixed",
            right: menuPosition.right,
            top: menuPosition.top,
            zIndex: 100,
          } : undefined}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

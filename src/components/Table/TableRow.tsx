"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { clsx } from "clsx";

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, summary, [role='button'], [data-row-action]"));
}

export function TableRow({ children, className, href, linked = false }: { children: ReactNode; className?: string; href?: string; linked?: boolean }) {
  const clickable = Boolean(href || linked);

  function goToHref() {
    if (!href) return;
    window.location.href = href;
  }

  function navigate(event: MouseEvent<HTMLTableRowElement>) {
    if (!href || isInteractiveElement(event.target)) return;
    goToHref();
  }

  function navigateFromKeyboard(event: KeyboardEvent<HTMLTableRowElement>) {
    if (!href || isInteractiveElement(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToHref();
  }

  return (
    <tr
      className={clsx("border-t border-stone-100", clickable && "cursor-pointer transition hover:bg-stone-50", className)}
      onClick={navigate}
      onKeyDown={navigateFromKeyboard}
      tabIndex={href ? 0 : undefined}
    >
      {children}
    </tr>
  );
}

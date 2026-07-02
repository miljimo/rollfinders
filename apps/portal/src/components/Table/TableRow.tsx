"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { clsx } from "clsx";

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, summary, [role='button'], [data-row-action]"));
}

export function TableRow({ children, className, doubleClickHref, href, linked = false }: { children: ReactNode; className?: string; doubleClickHref?: string; href?: string; linked?: boolean }) {
  const clickable = Boolean(href || doubleClickHref || linked);

  function goToHref() {
    if (!href) return;
    window.location.href = href;
  }

  function goToDoubleClickHref() {
    if (!doubleClickHref) return;
    window.location.href = doubleClickHref;
  }

  function navigate(event: MouseEvent<HTMLTableRowElement>) {
    if (!href || isInteractiveElement(event.target)) return;
    goToHref();
  }

  function navigateOnDoubleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (!doubleClickHref || isInteractiveElement(event.target)) return;
    goToDoubleClickHref();
  }

  function navigateFromKeyboard(event: KeyboardEvent<HTMLTableRowElement>) {
    const keyboardHref = href ?? doubleClickHref;
    if (!keyboardHref || isInteractiveElement(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    window.location.href = keyboardHref;
  }

  return (
    <tr
      className={clsx("border-t border-stone-100", clickable && "cursor-pointer transition hover:bg-stone-50", className)}
      onClick={navigate}
      onDoubleClick={navigateOnDoubleClick}
      onKeyDown={navigateFromKeyboard}
      tabIndex={href || doubleClickHref ? 0 : undefined}
      title={href ? "Click to view details" : doubleClickHref ? "Double click to view details" : undefined}
    >
      {children}
    </tr>
  );
}

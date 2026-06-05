# PRD: PageShell Component

Source: `src/components/shell.tsx`

## Purpose

Provide the authenticated application page frame with header, main content, and footer.

## Requirements

IF a page renders inside `PageShell`  
WHEN the component renders  
THEN it SHALL render `SiteHeader`, `<main>`, and `SiteFooter` in that order.

IF child content is passed to `PageShell`  
WHEN the component renders  
THEN the content SHALL render inside `<main className="flex-1">`.

IF `PageShell` is used on protected or public app pages  
WHEN auth state changes  
THEN `SiteHeader` SHALL handle role-aware navigation without the page duplicating header logic.

## Done When

* Header, main, and footer render consistently.
* Children render once inside main.
* Existing pages using `PageShell` keep their layout.

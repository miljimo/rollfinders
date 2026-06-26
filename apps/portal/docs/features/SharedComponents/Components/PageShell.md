# PRD: PageShell Component

## Implementation Metadata

- Source: `src/components/PageShell.tsx`
- Status: Ready for development
- Related components: `SiteHeader`, `SiteFooter`

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

IF a page supplies child content  
WHEN rendered inside the shell  
THEN the shell SHALL not add page-specific business UI around that content.

## Done When

* Header, main, and footer render consistently.
* Children render once inside main.
* Existing pages using `PageShell` keep their layout.

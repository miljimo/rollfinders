# PRD: StaticPageShell Component

## Implementation Metadata

- Source: `src/components/StaticPageShell.tsx`
- Status: Ready for development
- Related components: `StaticSiteHeader`, `SiteFooter`

## Purpose

Provide a public page frame that does not require session lookup.

## Requirements

IF a static public page uses `StaticPageShell`  
WHEN the page renders  
THEN it SHALL render `StaticSiteHeader`, `<main>`, and `SiteFooter`.

IF the user is logged out  
WHEN a static page renders  
THEN the page SHALL remain accessible without authentication.

IF child content is supplied  
WHEN the component renders  
THEN the content SHALL render inside `<main className="flex-1">`.

IF used by legal or marketing/static content pages  
WHEN rendered  
THEN the shell SHALL avoid session lookup and admin navigation dependencies.

## Done When

* Public static pages render without auth dependency.
* Footer business links remain visible.
* Layout matches the standard app shell.

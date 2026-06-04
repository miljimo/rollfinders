# PRD: SiteFooter Component

Source: `src/components/shell.tsx`

## Purpose

Render footer copy and public business/legal navigation.

## Requirements

IF the footer renders  
WHEN the page is public or authenticated  
THEN it SHALL show the RollFinders summary copy.

IF the footer renders  
WHEN links are visible  
THEN it SHALL show About, Contact, Privacy Policy, and Terms of Service.

IF the viewport is mobile  
WHEN footer links wrap  
THEN the layout SHALL remain readable and not overlap.

## Done When

* Footer links route to existing static pages.
* Footer is responsive.
* Footer does not require authentication.

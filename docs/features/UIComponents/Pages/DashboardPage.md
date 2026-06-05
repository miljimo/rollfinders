# PRD: User Dashboard Page

Route: `/dashboard`

Source: `src/app/dashboard/page.tsx`

## Purpose

Provide standard user dashboard overview.

## Requirements

IF authenticated user opens dashboard  
WHEN dashboard data loads  
THEN page SHALL show role-appropriate summary and navigation.

IF unauthenticated user opens dashboard  
WHEN authorization runs  
THEN user SHALL be redirected to login.

IF user role has admin dashboard instead  
WHEN routing occurs  
THEN navigation SHALL follow existing role rules.

## Done When

* Standard user dashboard is protected.
* Page links work.
* Layout is responsive.

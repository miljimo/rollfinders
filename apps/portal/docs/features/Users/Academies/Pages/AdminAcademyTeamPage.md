# PRD: Admin Academy Team Page

Route: `/admin/academies/[id]/team`

Source: `src/app/admin/academies/[id]/team/page.tsx`

## Purpose

Manage or view academy team members and invitations.

## Requirements

IF a user with team access opens the page  
WHEN academy exists  
THEN team members and invitations SHALL be shown.

IF user has owner/platform permission  
WHEN page renders  
THEN invite/cancel/resend/remove/transfer controls SHALL appear as allowed.

IF user lacks access  
WHEN route resolves  
THEN access SHALL be rejected or redirected.

## Done When

* Existing academy access helpers are respected.
* Invitation states are visible.
* Team management actions do not show for unauthorized users.

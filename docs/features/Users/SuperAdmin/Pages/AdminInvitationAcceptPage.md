# PRD: Admin Invitation Accept Page

Route: `/admin/invitations/[token]`

Source: `src/app/admin/invitations/[token]/page.tsx`

## Purpose

Allow invited users to accept academy admin invitations.

## Requirements

IF an invited user opens a valid invitation URL  
WHEN the page renders  
THEN it SHALL show invitation context and acceptance action.

IF the token is invalid, expired, or belongs to another email  
WHEN validation runs  
THEN the page SHALL show or redirect to an appropriate error state.

IF user is not logged in  
WHEN acceptance requires auth  
THEN user SHALL be sent to login.

## Done When

* Valid invitation can be accepted.
* Invalid states are handled.
* User lands in relevant admin academy area after acceptance.

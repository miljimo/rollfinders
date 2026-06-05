# PRD: TableStatusBadge Component

## Implementation Metadata

- Source: `src/components/Table/TableStatusBadge.tsx`
- Status: Ready for development
- Related shared primitive: `Badge`
- Parent PRD: `docs/features/UIComponents/Badge.md`

## Purpose

Render consistent status badges for table values.

This component is a compatibility wrapper for table consumers. New non-table usage should import the shared `Badge` component directly.

## Requirements

IF a status value is supplied  
WHEN the badge renders  
THEN it SHALL display a readable status label.

IF status is active/success-like  
WHEN rendered  
THEN it SHALL use success styling.

IF status is disabled/error-like  
WHEN rendered  
THEN it SHALL use warning/error styling.

IF status is unknown  
WHEN rendered  
THEN it SHALL use neutral styling.

IF the shared `Badge` component exists  
WHEN `TableStatusBadge` renders  
THEN it SHALL delegate label normalization, tone selection, and styling to `Badge`.

IF existing table tests import `TableStatusBadge`  
WHEN the shared `Badge` migration is implemented  
THEN those imports SHALL remain valid.

## Done When

* Badge supports current role/status/email/verification states.
* Badge text remains readable.
* Wrapper compatibility is preserved while table callers migrate.

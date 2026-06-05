# PRD: TableStatusBadge Component

Source: `src/components/Table/TableStatusBadge.tsx`

## Purpose

Render consistent status badges for table values.

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

## Done When

* Badge supports current role/status/email/verification states.
* Badge text remains readable.

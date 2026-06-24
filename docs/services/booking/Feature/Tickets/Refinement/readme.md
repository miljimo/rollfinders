# Booking Service Refinement Tickets

Tickets are ordered by dependency and MVP priority.

Source PRD: `docs/services/booking/proposal.md`

## Platform Foundation

- [001 - Booking Service Skeleton](ticket001BookingServiceSkeleton.md) - P0 - App runtime
- [002 - Booking OpenAPI Contract](ticket002BookingOpenApiContract.md) - P0 - OpenAPI

## Persistence

- [003 - Booking Database Schema](ticket003BookingDatabaseSchema.md) - P0 - Database schema
- [004 - Booking State Machine](ticket004BookingStateMachine.md) - P0 - Domain lifecycle
- [005 - Booking Data Access Functions](ticket005BookingDataAccessFunctions.md) - P0 - Data access

## Booking APIs

- [006 - Core Booking Endpoints](ticket006CoreBookingEndpoints.md) - P0 - Create, read, list, cancel, confirm
- [007 - Booking Payment Link Endpoint](ticket007BookingPaymentLinkEndpoint.md) - P0 - Payment association
- [008 - Participant Attendance Endpoints](ticket008ParticipantAttendanceEndpoints.md) - P1 - Participants and check-in

## RollFinders Integration

- [009 - RollFinders Booking Client](ticket009RollFindersBookingClient.md) - P0 - Next.js service client
- [010 - Free Event Booking Integration](ticket010FreeEventBookingIntegration.md) - P0 - Free booking persistence
- [011 - Paid Booking Checkout Integration](ticket011PaidBookingCheckoutIntegration.md) - P0 - Booking-first checkout
- [012 - Payment Status Booking Confirmation](ticket012PaymentStatusBookingConfirmation.md) - P0 - Trusted confirmation

## Admin And Quality

- [013 - Admin Booking Dashboard](ticket013AdminBookingDashboard.md) - P1 - Academy/admin visibility
- [014 - Booking Regression Suite](ticket014BookingRegressionSuite.md) - P0 - Tests and release gates

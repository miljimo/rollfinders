# Booking Service MVP Refinement Tickets

Source PRD: `services/booking/docs/proposal.md`

Tickets are ordered by dependency and MVP priority. Each ticket includes a suggested implementation branch name.

## Platform Foundation

- [001 - Bootstrap Go API Service](Ticket001BootstrapGoApiService.md) - P0 - Branch `feature/booking-001-bootstrap-go-api-service`
- [002 - Containerize Service And Compose Integration](Ticket002ContainerizeServiceAndComposeIntegration.md) - P0 - Branch `feature/booking-002-container-compose`
- [003 - Define Configuration And Environment Contract](Ticket003DefineConfigurationAndEnvironmentContract.md) - P0 - Branch `feature/booking-003-configuration-contract`

## API Contract

- [004 - Define OpenAPI MVP Contract](Ticket004DefineOpenApiMvpContract.md) - P0 - Branch `feature/booking-004-openapi-contract`
- [005 - Implement Shared Error And Request Model](Ticket005ImplementSharedErrorAndRequestModel.md) - P0 - Branch `feature/booking-005-error-request-model`
- [006 - Implement API Authentication Middleware](Ticket006ImplementApiAuthenticationMiddleware.md) - P0 - Branch `feature/booking-006-api-auth`

## Persistence

- [007 - Create Database Migration Framework](Ticket007CreateDatabaseMigrationFramework.md) - P0 - Branch `feature/booking-007-migration-framework`
- [008 - Create Core Booking Schema](Ticket008CreateCoreBookingSchema.md) - P0 - Branch `feature/booking-008-core-schema`
- [009 - Implement Data Access Functions](Ticket009ImplementDataAccessFunctions.md) - P0 - Branch `feature/booking-009-data-access`

## Booking Core

- [010 - Implement Booking Lifecycle State Machine](Ticket010ImplementBookingLifecycleStateMachine.md) - P0 - Branch `feature/booking-010-lifecycle-state-machine`
- [011 - Implement Participant Lifecycle](Ticket011ImplementParticipantLifecycle.md) - P0 - Branch `feature/booking-011-participant-lifecycle`
- [012 - Implement Booking Reference Generation](Ticket012ImplementBookingReferenceGeneration.md) - P0 - Branch `feature/booking-012-booking-reference`
- [013 - Implement Idempotency Layer](Ticket013ImplementIdempotencyLayer.md) - P0 - Branch `feature/booking-013-idempotency`

## Booking APIs

- [014 - Implement Create Booking Endpoint](Ticket014ImplementCreateBookingEndpoint.md) - P0 - Branch `feature/booking-014-create-booking`
- [015 - Implement Get Booking Endpoint](Ticket015ImplementGetBookingEndpoint.md) - P0 - Branch `feature/booking-015-get-booking`
- [016 - Implement List Bookings Endpoint](Ticket016ImplementListBookingsEndpoint.md) - P0 - Branch `feature/booking-016-list-bookings`
- [017 - Implement Cancel Booking Endpoint](Ticket017ImplementCancelBookingEndpoint.md) - P0 - Branch `feature/booking-017-cancel-booking`
- [018 - Implement Confirm And Complete Booking Endpoints](Ticket018ImplementConfirmAndCompleteBookingEndpoints.md) - P1 - Branch `feature/booking-018-confirm-complete`
- [019 - Implement Participant Management Endpoints](Ticket019ImplementParticipantManagementEndpoints.md) - P0 - Branch `feature/booking-019-participant-endpoints`
- [020 - Implement Attendance Tracking Endpoints](Ticket020ImplementAttendanceTrackingEndpoints.md) - P1 - Branch `feature/booking-020-attendance-endpoints`

## Integrations

- [021 - Implement User Service Validation Adapter](Ticket021ImplementUserServiceValidationAdapter.md) - P1 - Branch `feature/booking-021-user-service-adapter`
- [022 - Implement Organisation Service Validation Adapter](Ticket022ImplementOrganisationServiceValidationAdapter.md) - P1 - Branch `feature/booking-022-organisation-service-adapter`
- [023 - Implement Payment Service Linkage Adapter](Ticket023ImplementPaymentServiceLinkageAdapter.md) - P1 - Branch `feature/booking-023-payment-service-linkage`

## Events And Operations

- [024 - Implement Status History And Audit Trail](Ticket024ImplementStatusHistoryAndAuditTrail.md) - P0 - Branch `feature/booking-024-status-history`
- [025 - Implement Outbox Events](Ticket025ImplementOutboxEvents.md) - P1 - Branch `feature/booking-025-outbox-events`
- [026 - Implement Observability And Metrics](Ticket026ImplementObservabilityAndMetrics.md) - P1 - Branch `feature/booking-026-observability`

## Quality And Delivery

- [027 - Add Domain Unit Tests](Ticket027AddDomainUnitTests.md) - P0 - Branch `feature/booking-027-domain-unit-tests`
- [028 - Add API Integration And Contract Tests](Ticket028AddApiIntegrationAndContractTests.md) - P1 - Branch `feature/booking-028-api-integration-tests`
- [029 - Create CI Pipeline](Ticket029CreateCiPipeline.md) - P1 - Branch `feature/booking-029-ci-pipeline`
- [030 - Write Quickstart And Operations Docs](Ticket030WriteQuickstartAndOperationsDocs.md) - P1 - Branch `feature/booking-030-docs`

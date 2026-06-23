# Academy Service Refinement Tickets

Tickets are ordered by dependency and MVP priority.

Source PRD: `services/academy/docs/product.md`

## Foundation

- [001 - Finalise Academy Service Boundaries](Ticket001FinaliseAcademyServiceBoundaries.md) - P0 - Product and domain contract
- [002 - Add Academy Permissions To Authorisation Catalog](Ticket002AddAcademyPermissionsToAuthorisationCatalog.md) - P0 - Permission catalog
- [003 - Bootstrap Academy Go API Service](Ticket003BootstrapAcademyGoApiService.md) - P0 - Runtime foundation
- [004 - Define Academy OpenAPI Contract](Ticket004DefineAcademyOpenApiContract.md) - P0 - API contract

## Persistence

- [005 - Create Academy Procedure First Migration Framework](Ticket005CreateAcademyProcedureFirstMigrationFramework.md) - P0 - SQL structure
- [006 - Implement Academy Core Schema](Ticket006ImplementAcademyCoreSchema.md) - P0 - Tables and indexes
- [007 - Implement Academy SQL Functions And Procedures](Ticket007ImplementAcademySqlFunctionsAndProcedures.md) - P0 - Database first data operations
- [008 - Implement Academy Data Access Layer](Ticket008ImplementAcademyDataAccessLayer.md) - P0 - Go data access functions

## APIs

- [009 - Implement Academy Lifecycle And Profile Endpoints](Ticket009ImplementAcademyLifecycleAndProfileEndpoints.md) - P0 - Core academy APIs
- [010 - Implement Academy Claims And Verification Endpoints](Ticket010ImplementAcademyClaimsAndVerificationEndpoints.md) - P0 - Claim and review flows
- [011 - Implement Academy Membership And Invitation Endpoints](Ticket011ImplementAcademyMembershipAndInvitationEndpoints.md) - P0 - Domain mapping and invitations
- [012 - Implement Claim Reminder And Audit Endpoints](Ticket012ImplementClaimReminderAndAuditEndpoints.md) - P1 - Operations and audit
- [013 - Implement Payment Capability Proxy Endpoints](Ticket013ImplementPaymentCapabilityProxyEndpoints.md) - P1 - Payments integration facade

## RollFinders Integration

- [014 - Backfill Existing Academy Data](Ticket014BackfillExistingAcademyData.md) - P0 - Migration/backfill
- [015 - Add RollFinders Academy Client](Ticket015AddRollFindersAcademyClient.md) - P0 - Next.js service client
- [016 - Cut Over RollFinders Academy Read Paths](Ticket016CutOverRollFindersAcademyReadPaths.md) - P1 - Read integration
- [017 - Cut Over RollFinders Academy Write Paths](Ticket017CutOverRollFindersAcademyWritePaths.md) - P1 - Write integration

## Quality

- [018 - Add Academy Regression And Contract Suite](Ticket018AddAcademyRegressionAndContractSuite.md) - P0 - Tests and release gates

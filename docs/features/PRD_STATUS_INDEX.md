# PRD Status Index

Last reviewed: 2026-06-21

This index tracks PRD implementation state after comparing the current source code, tests, Prisma schema, and feature docs against the MVP PRD.

Status meanings:

* `Done`: implemented or operationally completed. Follow-up hardening can still exist, but the core PRD behavior is present.
* `Partial`: meaningful implementation exists, but one or more required PRD outcomes are still missing.
* `Not done`: proposal, strategy, or requirement work without a matching implementation in the current code.
* `Docs/reference`: descriptive docs, component file docs, API docs, or business docs that do not represent a discrete implementation ticket by themselves.

## MVP Comparison

| MVP area | Current status | Current implementation | Left to implement |
| --- | --- | --- | --- |
| Academy Directory | Done | Public browse/search/profile routes exist in `src/app/academies`, academy search is implemented in `src/lib/data.ts`, profiles show address, borough, website, email, phone, BJJ attributes, upcoming open mats, and directions. | Preserve behavior and keep data current. |
| Open Mat Radar | Done with one content gap | Public list/detail routes exist in `src/app/open-mats`, recurring occurrences are expanded in `src/lib/open-mat-occurrences.ts`, filters/search/directions/detail pages exist. | Add direct contact email/phone display to open mat detail, using event contact fields if added or academy contact fallback. |
| Search | Done, acceptance unverified | Academy and open mat server-side search support academy, borough, postcode, gi/no-gi, beginner, and competition terms. | Add automated or documented performance checks for the 2 second acceptance target. |
| Interactive Map | Partial | `/map` exists, `getMapItems` loads academies with upcoming events, and `AcademyMap` renders a Google static map from academy coordinates with a listing rail fallback. | Add selectable data-driven marker detail, expose upcoming open mat state in marker/detail UI, and track marker clicks once analytics exists. |
| Academy Claiming | Done with follow-ups | Public claim action/form/API, duplicate pending claim checks, admin claim list/detail, approve/reject actions, user linking/creation, academy membership grant, audit logs, approval password email, rejection email, and claim invitation emails exist. | Add requester submission confirmation email, claim funnel analytics, public rate limiting, and database-level duplicate pending claim constraint where supported. |
| Admin Dashboard | Done | Unified `/dashboard` serves standard, academy admin, platform admin, and super admin dashboards; legacy `/admin` redirects. Metrics, module navigation, academy/open mat/user/claim/email operations surfaces exist. | Preserve role boundaries and continue targeted tests for admin flows. |
| Academy Management | Done | Admin academy list, filters, pagination, create/edit/detail, verification status, featured state, delete controls, team pages, invitations, resend/cancel/remove/transfer actions exist. | Add team-action audit logging and owner notifications if required by the multi-admin PRD. |
| Academy Verification | Partial | `AcademyVerificationStatus` exists and admin academy forms can save `PENDING`, `VERIFIED`, and `REJECTED`; public trust display derives from verified/managed state. | Add dedicated verification audit metadata for previous status, next status, actor, academy, and timestamp. |
| Pending Academies | Partial | Pending counts, status badges, filters, and academy management visibility exist. | Add/verify dashboard metric drilldown for pending academies if still required by the PRD. |
| User Management | Done | `/admin/users` and APIs support search/filter/pagination, create/edit/disable/enable/delete/password reset email, protected account safeguards, and audit logs. | Keep protected-account safeguards covered by tests. |
| User Profile / Self Dashboard | Partial | Standard dashboard profile/settings/change-password/edit-profile views exist; admin user detail pages and simple profile-style account views exist. | Proposal docs for the broader profile strategy remain not done unless intentionally descoped. |
| Analytics | Done with follow-ups | First-party analytics storage, event contracts, public ingestion API, best-effort server/client tracking, daily aggregation job, Super Admin reporting API, and founder dashboard panel exist. | Add long-term retention policy, richer drilldowns, and operational scheduling for daily aggregation if required. |
| Email Delivery | Done | Reliable outbound email queue, job route, password reset, academy claim invitation, claim approval/reset, and rejection emails exist. | User onboarding credential content/delivery PRDs remain under review unless their exact copy/delivery requirements are accepted as covered by password reset flow. |
| Deployment / AWS | Done with operations follow-ups | Terraform modules, environment configs, bootstrap/deploy/promotion/locking scripts, health route, deployment docs, and resource inventory exist. | Validation, seed/migration, destruction, cost, and state-layer PRDs remain under review where operational acceptance is not fully proven. |
| Reusable UI Components | Mostly done | Button, Table, StatIndicator, StatsPanel, QuickActionPanel, SidePanelControl, shared dashboard/public components, and tests exist. | Badge, form field system, filter form, page header, panel surface, metric card, list panel, domain cards, and dashboard top header remain docs/reference or reusable-system follow-ups unless adopted as canonical shared primitives. |

## Service PRD Status

| Service area | Current status | Current implementation | Left to implement |
| --- | --- | --- | --- |
| Payment Service MVP | Partial | `services/payments` runs as its own Go service/container, uses the shared RollFinders database server, has database-first migrations, API auth, checkout creation, callbacks, payment history, refunds, idempotency, health/readiness, local compose support, and RollFinders dashboard integration. Payment Service is provider/payment-state owner, not wallet ledger or payout-balance owner. | Complete provider-account APIs, connected-account payment creation, payment fact publication for wallet posting, webhook reconciliation, and generic non-RollFinders integration tests. Wallet ledger and payout-balance work belongs to Wallet/Transfer services. |
| RollFinders Payment UI | Partial | Admin/academy payment dashboard panels exist for overview, transactions, earnings, refunds, payouts, and settings. Stripe Connect setup UI exists for core/academy accounts. Dashboard-managed Stripe API key storage has been removed. | Move payout/balance views to Wallet Service balances and Transfer Service payout/withdrawal workflows, complete provider-backed refund/payout execution actions, and live provider webhook status reconciliation. |
| Academy Direct Payments | Partial | RollFinders stores connected Stripe account details against platform or academy ownership. Paid/donation checkout is hidden and server-rejected unless the academy account is connected, verified, charges-enabled, and payouts-enabled. Successful course checkout callbacks now mark bookings paid and post idempotent Wallet Service `BOOKING_PAYMENT` and `COMMISSION` effects using Pricing Policy Service. | Complete generic payee/payee-account migration, provider webhook reconciliation for missed callbacks, and the logged-in practitioner internal-wallet payment option. |
| Booking Service MVP | Partial | `services/booking` has Go service skeleton, health/readiness, database-first migrations, core booking tables, camelCase functions/procedures, package-level data access functions, lifecycle endpoints, participant/attendance endpoints, and admin dashboard navigation. | Wire RollFinders public free booking and paid booking-first checkout to Booking Service, add trusted payment confirmation, admin booking dashboard workflows, live database integration tests, and refund-aware state transitions. |

## Done

### Status-folder Done

* `Communications/Email/AcademyClaimEmails/Products/Completed/AcademyClaimInvitationEmailPrd.md`
* `Communications/Email/AcademyClaimEmails/Products/Completed/AcademyClaimInvitationHtmlTemplatePrd.md`
* `Deployment/Delivery/Completed/DeploymentLockingPrd.md`
* `Deployment/Delivery/Completed/EnvironmentPromotionPrd.md`
* `Deployment/Provisioning/Completed/AcmCertificateProvisioningPrd.md`
* `Deployment/Provisioning/Completed/AwsResourceCatalogPrd.md`
* `Deployment/Provisioning/Completed/EnvironmentResourcesPrd.md`
* `Deployment/Provisioning/Completed/Route53DomainBootstrapPrd.md`
* `Deployment/Provisioning/Completed/SesDomainVerificationPrd.md`
* `OpenMats/Products/Completed/RollFindersRecurringRollingsPrd.md`
* `Product/Products/Completed/StatIndicatorDataRequirements.md`
* `apps/portal/docs/features/SharedComponents/Completed/MobileFirstPublicNavigationPrd.md`
* `apps/portal/docs/features/SharedComponents/Completed/StatIndicator.md`
* `Users/Academies/Products/Completed/NewAcademyMultiStepExperiencePrd.md`
* `Users/Academies/Products/Completed/RollFinderAcademyClaimingPrd.md`
* `Users/Platform/Products/Completed/AdminDashboardStatIndicators.md`
* `Users/Standard/Products/Completed/UserProfileRedesignPrd.md`
* `AnalyticalEventTracking/Tickets/AnalyticsDatabaseFoundationTicket.md`
* `AnalyticalEventTracking/Tickets/AnalyticsDomainModelsTicket.md`
* `AnalyticalEventTracking/Tickets/AnalyticsEventServiceTicket.md`
* `AnalyticalEventTracking/Tickets/AnalyticsVisitorTrackingTicket.md`
* `AnalyticalEventTracking/Tickets/AcademySearchAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/OpenMatSearchAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/AcademyProfileAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/AcademyProfileAnalyticsUiTicket.md`
* `AnalyticalEventTracking/Tickets/OpenMatViewAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/CommercialIntentAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/ClaimFunnelAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/MarketplaceSupplyAnalyticsTicket.md`
* `AnalyticalEventTracking/Tickets/AnalyticsDailyAggregationTicket.md`
* `AnalyticalEventTracking/Tickets/FounderAnalyticsApiTicket.md`
* `AnalyticalEventTracking/Tickets/FounderAnalyticsDashboardTicket.md`
* `AnalyticalEventTracking/Tickets/AnalyticsTestingTicket.md`
* `AnalyticalEventTracking/Tickets/AnalyticsHardeningTicket.md`

### Implemented PRDs Not Yet Filed Under `Completed`

These have matching implementation in source and should be treated as done unless a maintainer wants stricter acceptance review before moving the files.

* `Communications/Email/Operations/APIs/AdminEmailProvisioningApi.md`
* `Communications/Email/Operations/APIs/JobsEmailDeliveryApi.md`
* `Communications/Email/UserAccountEmails/APIs/UserPasswordResetApi.md`
* `OpenMats/APIs/README.md`
* `OpenMats/Components/EventCard.md`
* `OpenMats/Components/OpenMatLocationFilterForm.md`
* `OpenMats/Components/UpcomingNearYouCard.md`
* `OpenMats/Pages/AdminOpenMatDetailPage.md`
* `OpenMats/Pages/AdminOpenMatNewPage.md`
* `OpenMats/Pages/AdminOpenMatsPage.md`
* `OpenMats/Pages/OpenMatDetailPage.md`
* `OpenMats/Pages/OpenMatsPage.md`
* `Platform/APIs/HealthApi.md`
* `Platform/Products/PublicBusinessInformation.md`
* `PublicSite/Pages/AboutPage.md`
* `PublicSite/Pages/ContactPage.md`
* `PublicSite/Pages/HomePage.md`
* `PublicSite/Pages/PrivacyPolicyPage.md`
* `PublicSite/Pages/TermsPage.md`
* `apps/portal/docs/features/SharedComponents/AutoCompleteTextField.md`
* `apps/portal/docs/features/SharedComponents/Button.md`
* `apps/portal/docs/features/SharedComponents/Components/LocationSearchForm.md`
* `apps/portal/docs/features/SharedComponents/Components/LogoutButton.md`
* `apps/portal/docs/features/SharedComponents/Components/NavLink.md`
* `apps/portal/docs/features/SharedComponents/Components/PageShell.md`
* `apps/portal/docs/features/SharedComponents/Components/SearchForm.md`
* `apps/portal/docs/features/SharedComponents/Components/SiteFooter.md`
* `apps/portal/docs/features/SharedComponents/Components/SiteHeader.md`
* `apps/portal/docs/features/SharedComponents/Components/StaticPageShell.md`
* `apps/portal/docs/features/SharedComponents/Components/StaticSiteHeader.md`
* `apps/portal/docs/features/SharedComponents/Components/TableActions.md`
* `apps/portal/docs/features/SharedComponents/Components/TableBody.md`
* `apps/portal/docs/features/SharedComponents/Components/TableCell.md`
* `apps/portal/docs/features/SharedComponents/Components/TableEmptyState.md`
* `apps/portal/docs/features/SharedComponents/Components/TableHeader.md`
* `apps/portal/docs/features/SharedComponents/Components/TableIndex.md`
* `apps/portal/docs/features/SharedComponents/Components/TableLoadingState.md`
* `apps/portal/docs/features/SharedComponents/Components/TablePagination.md`
* `apps/portal/docs/features/SharedComponents/Components/TableRow.md`
* `apps/portal/docs/features/SharedComponents/Components/TableStatusBadge.md`
* `apps/portal/docs/features/SharedComponents/Components/TableTypes.md`
* `apps/portal/docs/features/SharedComponents/Proposal/QuickActionPanelPrd.md`
* `apps/portal/docs/features/SharedComponents/Proposal/StatsPanelPrd.md`
* `apps/portal/docs/features/SharedComponents/Reviewing/SidePanelControlPrd.md`
* `apps/portal/docs/features/SharedComponents/Table.md`
* `Users/Academies/APIs/AdminAcademiesApi.md`
* `Users/Academies/APIs/AdminAcademyClaimApproveApi.md`
* `Users/Academies/APIs/AdminAcademyClaimDetailApi.md`
* `Users/Academies/APIs/AdminAcademyClaimRejectApi.md`
* `Users/Academies/APIs/AdminAcademyClaimsApi.md`
* `Users/Academies/APIs/AdminAcademyDetailApi.md`
* `Users/Academies/APIs/DashboardAcademyDetailApi.md`
* `Users/Academies/APIs/PublicAcademyClaimsApi.md`
* `Users/Academies/Components/AcademyCard.md`
* `Users/Academies/Components/AcademyListingCard.md`
* `Courses/Products/Reviewing/EventPermanentUriAndQrCodePrd.md`
* `PublicSite/Pages/PublicEventDetailsPagePrd.md`
* `Users/Academies/Pages/AcademiesPage.md`
* `Users/Academies/Pages/AcademyProfilePage.md`
* `Users/Academies/Pages/AdminAcademiesPage.md`
* `Users/Academies/Pages/AdminAcademyDetailPage.md`
* `Users/Academies/Pages/AdminAcademyNewPage.md`
* `Users/Academies/Pages/AdminAcademyTeamPage.md`
* `Users/Academies/Products/AcademyAdminWithDashboardRoles.md`
* `Users/Platform/APIs/AdminPlatformAdminsApi.md`
* `Users/Platform/APIs/AdminUserDetailApi.md`
* `Users/Platform/APIs/AdminUserPromoteApi.md`
* `Users/Platform/APIs/AdminUsersApi.md`
* `Users/Platform/Pages/AdminDashboardPage.md`
* `Users/Platform/Pages/AdminSettingsPage.md`
* `Users/Platform/Products/AdminDashboardRestructureWithPagination.md`
* `Users/Platform/Products/AdminPaymentsDashboardPrd.md`
* `Users/Platform/Products/EnhanceAdminPage.md`
* `Users/Platform/Products/PlatformAdminActivityTargetsAndRewards.md`
* `Users/Platform/Products/PlatformAdminDashboardRoles.md`
* `Users/Platform/Products/PlatformAdministrationAndModeration.md`
* `Users/Platform/Products/PlatformUserManagement.md`
* `Users/Shared/Products/UnifiedDashboardRoutePrd.md`
* `Users/Standard/APIs/AuthNextAuthApi.md`
* `Users/Standard/APIs/DashboardMembersApi.md`
* `Users/Standard/APIs/DashboardRollsApi.md`
* `Users/Standard/Components/LoginForm.md`
* `Users/Standard/Pages/DashboardMembersPage.md`
* `Users/Standard/Pages/DashboardPage.md`
* `Users/Standard/Pages/DashboardPasswordPage.md`
* `Users/Standard/Pages/LoginPage.md`
* `Users/Standard/Pages/ResetPasswordPage.md`
* `Users/Standard/Products/StandardUserDashboardRoles.md`
* `Users/Standard/Products/StandardUserSharedDashboardPrd.md`
* `Users/SuperAdmin/APIs/AdminUserDemoteApi.md`
* `Users/SuperAdmin/APIs/AdminUserDisableApi.md`
* `Users/SuperAdmin/APIs/AdminUserEnableApi.md`
* `Users/SuperAdmin/Pages/AdminInvitationAcceptPage.md`
* `Users/SuperAdmin/Pages/AdminUsersPage.md`
* `Users/SuperAdmin/Products/AdminUserManagement.md`
* `Users/SuperAdmin/Products/SuperUserDashboardRoles.md`
* `Users/SuperAdmin/Products/UserPermissionsAndRoles.md`

## Partial

These have implementation, but are not fully done against the written PRD or MVP acceptance criteria.

* `Communications/Email/Operations/Products/Reviewing/AdminEmailQueueOperationsPanelPrd.md` - email operations panel exists, but keep under review until queue operations UX and acceptance criteria are fully verified.
* `Communications/Email/UserAccountEmails/Products/Reviewing/UserOnboardingCredentialContentPrd.md` - password reset/setup email flow exists; exact onboarding credential content remains under review.
* `Communications/Email/UserAccountEmails/Products/Reviewing/UserOnboardingEmailDeliveryPrd.md` - reliable email delivery exists; onboarding-specific acceptance remains under review.
* `Deployment/Delivery/Reviewing/DeploymentValidationPrd.md` - deployment scripts and smoke hooks exist; validation acceptance is still under review.
* `Deployment/Delivery/Reviewing/PromoteDevToProductionReleaseTicket-20260607.md` - promotion tooling exists; ticket remains review/release-specific.
* `Deployment/Delivery/Reviewing/SeedDataAndMigrationsPrd.md` - Prisma migrations and seed data exist; operational acceptance remains under review.
* `Deployment/Operations/Reviewing/EnvironmentDestructionPrd.md` - destroy scripts exist; acceptance remains under review.
* `Deployment/Operations/Reviewing/ResourceInventoryAndCostPrd.md` - inventory/cost scripts and architecture inventory exist; acceptance remains under review.
* `Deployment/Provisioning/Reviewing/TerraformStateLayersPrd.md` - Terraform backend/state structure exists; PRD remains under review.
* `Platform/Pages/MapPage.md` - map page exists with static plotted academy markers and listing rail; selectable marker details/open-mat marker state remain missing.
* `Product/Products/Reviewing/RollFinderMissingMvpRequirementsPrd.md` - stale in places because academy claiming is now implemented; remaining MVP gaps are analytics, marker detail/open-mat map state, open mat contact display, search performance checks, and platform decision cleanup.
* `Product/Products/Reviewing/RollFinderMvpImplementationTicketsPrd.md` - implementation tickets should be refreshed against the 2026-06-07 status in this file.
* `Product/Products/Reviewing/RollFinderMvpPrd.md` - core MVP is largely implemented; analytics and full interactive marker behavior remain incomplete.
* `Product/Products/RollFinderMvpApiTaskRequirements.md` - most API/backend tasks are implemented; analytics, rate limiting, duplicate pending claim DB constraint, and search performance checks remain.
* `Product/Products/RollFinderMvpUiTaskRequirements.md` - most UI tasks are implemented; map marker detail/open-mat map state and direct open mat contact display remain.
* `apps/portal/docs/features/SharedComponents/Reviewing/ReusableUiComponentPrd.md` - many reusable components exist; not all proposed primitives are centralized as canonical components.
* `Users/Academies/Products/MultiAdminAcademyManagement.md` - team management exists; team-action audit logging and owner notifications are still missing.
* `Users/Academies/Products/Reviewing/academyManagementUiPrd.md` - guided academy edit UI exists in parts; pricing audience/member drop-in semantics still need implementation verification.
* `Users/Academies/Products/Reviewing/AcademyManagementGuidedUpdateAndDropInPricingPrd.md` - guided academy management exists, but pricing audience semantics, free member drop-in behavior, and internal/external roll visibility still need implementation verification.
* `Users/Academies/Products/Reviewing/AcademyVerificationPrd.md` - verification status exists; dedicated verification audit metadata is missing.
* `Users/Academies/Products/Reviewing/PendingAcademiesPrd.md` - pending academy visibility exists; dashboard metric drilldown remains to verify or implement.
* `Users/Profile/Products/Proposal/SelfProfileDashboardPrd.md` - standard dashboard profile/settings are implemented; broader proposal scope is not fully closed.
* `apps/backend_api/internal/services/users/docs/prds/Reviewing/GenericIdentityAccessManagementPrd.md` - Go user service now has generic IAM tables, procedure-backed writes, role/permission/user assignment storage, organization tables, and effective-permission evaluation; role/permission/organization REST endpoints and full auth lifecycle flows remain to complete.

## Not Done

These remain proposal/strategy work or have no implementation found.

* `Courses/Products/Reviewing/CourseOccurrencePaymentsPrd.md`
* `Product/Products/RollFinderMvpAnalyticsIfWhenThenRequirements.md`
* `apps/portal/docs/features/SharedComponents/Badge.md`
* `apps/portal/docs/features/SharedComponents/DashboardTopHeaderPanel.md`
* `apps/portal/docs/features/SharedComponents/DomainCards.md`
* `apps/portal/docs/features/SharedComponents/FilterForm.md`
* `apps/portal/docs/features/SharedComponents/FormFieldSystem.md`
* `apps/portal/docs/features/SharedComponents/ListPanel.md`
* `apps/portal/docs/features/SharedComponents/MetricCard.md`
* `apps/portal/docs/features/SharedComponents/PageHeader.md`
* `apps/portal/docs/features/SharedComponents/PanelSurface.md`
* `Users/Academies/Products/Reviewing/PublicAcademyRegistrationPrd.md`
* `Users/Profile/Components/Proposal/UserProfile.md`
* `Users/Profile/Products/Proposal/AdminUserProfileWorkflowPrd.md`
* `Users/Profile/Products/Proposal/UserProfileExperienceStrategyPrd.md`
* `apps/backend_api/internal/services/users/docs/prds/Reviewing/UserAndAuthGoServicePortPrd.md`
* `apps/backend_api/internal/services/users/docs/prds/Reviewing/UserAuthGoServiceApiPrd.md`
* `apps/backend_api/internal/services/users/docs/prds/Reviewing/UserManagementGoServiceApiPrd.md`

## Docs / Reference

These documents are retained as reference material and do not need a done/not-done implementation status.

* `Communications/Email/README.md`
* `Deployment/README.md`
* `Product/Products/FounderProductUpdate.md`
* `Product/Products/MvpImplementationAudit.md`
* `Product/Products/RollFinderBusinessMarketPlan.md`
* `README.md`
* `apps/portal/docs/features/SharedComponents/ApplicationUiAndPageRequirements.md`
* `apps/portal/docs/features/SharedComponents/CodeFileFormatPrd.md`
* `apps/portal/docs/features/SharedComponents/README.md`
* `Users/Platform/README.md`
* `Users/Shared/Products/UnifiedDashboardRouteQaReport.md`

## Remaining MVP Work

1. Add MVP analytics: provider configuration, page views, academy/open mat searches, detail views, direction clicks, map views, claim funnel events, and monthly reporting.
2. Finish map interactivity: selectable marker detail, upcoming open mat marker state, detail/directions actions from the marker detail, and marker click analytics.
3. Add direct open mat contact display on detail pages, using academy contact as fallback.
4. Add search performance acceptance checks for academy and open mat search against the 2 second target.
5. Add academy verification audit metadata for status changes.
6. Add academy claim hardening follow-ups: requester submission confirmation email, rate limiting, claim analytics, and a database-level duplicate pending claim guard where supported.
7. Refresh stale MVP docs that still describe academy claiming as missing and update platform decisions to NextAuth credentials plus AWS ECS/Terraform.

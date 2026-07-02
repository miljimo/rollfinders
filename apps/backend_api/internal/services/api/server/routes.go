package server

import (
	"net/http"
	"strings"
)

type RouteDefinitionWithPermission struct {
	Method                 string
	Path                   GatewayPath
	Permission             GatewayPermission
	ResourceType           GatewayResourceType
	ResourceIDParam        GatewayResourceIDParam
	SubscriptionFeatureKey GatewaySubscriptionFeatureKey
	Public                 bool
}

type ServiceDefinition struct {
	Name   GatewayService
	Routes []RouteDefinitionWithPermission
}

type GatewayRouteDefinition struct {
	RouteDefinitionWithPermission
	Service GatewayService
}

type routeMatch struct {
	Definition GatewayRouteDefinition
	Params     map[string]string
}

type PermissionDefinition struct {
	Code        string
	Name        string
	Description string
}

func routePermissionCatalog() []PermissionDefinition {
	seen := map[GatewayPermission]PermissionDefinition{}
	for _, route := range protectedRoutes() {
		if route.Permission == "" {
			continue
		}
		if _, ok := seen[route.Permission]; ok {
			continue
		}
		seen[route.Permission] = PermissionDefinition{
			Code:        string(route.Permission),
			Name:        permissionName(string(route.Permission)),
			Description: "Allows calling orchestrator route " + route.Method + " " + string(route.Path) + ".",
		}
	}
	catalog := make([]PermissionDefinition, 0, len(seen))
	for _, definition := range seen {
		catalog = append(catalog, definition)
	}
	return catalog
}

func protectedRoutes() []GatewayRouteDefinition {
	routes := gatewayRoutes()
	protected := make([]GatewayRouteDefinition, 0, len(routes))
	for _, route := range routes {
		if !route.Public {
			protected = append(protected, route)
		}
	}
	return protected
}

func serviceDefinitions() []ServiceDefinition {
	return []ServiceDefinition{
		{Name: AcademyService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: AcademiesPath, Public: true},
			{Method: http.MethodGet, Path: AcademyPath, Public: true},
			{Method: http.MethodPost, Path: AcademiesPath, Permission: PermissionAcademyCreate, SubscriptionFeatureKey: FeatureAcademyProfileManage},
			{Method: http.MethodPut, Path: AcademyPath, Permission: PermissionAcademyUpdate, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId, SubscriptionFeatureKey: FeatureAcademyProfileManage},
			{Method: http.MethodPatch, Path: AcademyPath, Permission: PermissionAcademyUpdate, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId, SubscriptionFeatureKey: FeatureAcademyProfileManage},
			{Method: http.MethodDelete, Path: AcademyPath, Permission: PermissionAcademyDelete, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId},
			{Method: http.MethodPost, Path: AcademiesAcademyIdSearchHide, Permission: PermissionAcademySearchHide, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId},
			{Method: http.MethodGet, Path: AcademiesAcademyIdMembers, Permission: PermissionAcademyMemberRead, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId},
			{Method: http.MethodPost, Path: AcademiesAcademyIdMembers, Permission: PermissionAcademyMemberAssign, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId, SubscriptionFeatureKey: FeatureAcademyTeamManage},
			{Method: http.MethodDelete, Path: AcademiesAcademyIdMembersUserId, Permission: PermissionAcademyMemberRemove, ResourceType: ResourceAcademy, ResourceIDParam: ParamAcademyId, SubscriptionFeatureKey: FeatureAcademyTeamManage},
			{Method: http.MethodGet, Path: Memberships, Permission: PermissionAcademyMembershipRead},
			{Method: http.MethodPost, Path: Memberships, Permission: PermissionAcademyMembershipAssign},
			{Method: http.MethodDelete, Path: MembershipsMembershipId, Permission: PermissionAcademyMembershipRemove, ResourceType: ResourceMembership, ResourceIDParam: ParamMembershipId},
		}},

		{Name: CourseService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: CoursesPath, Public: true},
			{Method: http.MethodGet, Path: CoursePath, Public: true},
			{Method: http.MethodGet, Path: CourseTypesPath, Public: true},
			{Method: http.MethodGet, Path: CourseTypePath, Public: true},
			{Method: http.MethodPost, Path: CoursesPath, Permission: PermissionCourseCreate, SubscriptionFeatureKey: FeatureCourseCreate},
			{Method: http.MethodPut, Path: CoursePath, Permission: PermissionCourseUpdate, ResourceType: ResourceCourse, ResourceIDParam: ParamCourseId, SubscriptionFeatureKey: FeatureCourseUpdate},
			{Method: http.MethodDelete, Path: CoursePath, Permission: PermissionCourseDelete, ResourceType: ResourceCourse, ResourceIDParam: ParamCourseId, SubscriptionFeatureKey: FeatureCourseDelete},
			{Method: http.MethodGet, Path: CoursesCourseIdActivities, Permission: PermissionCourseActivityRead, ResourceType: ResourceCourse, ResourceIDParam: ParamCourseId},
			{Method: http.MethodPost, Path: CoursesCourseIdActivities, Permission: PermissionCourseActivityCreate, ResourceType: ResourceCourse, ResourceIDParam: ParamCourseId, SubscriptionFeatureKey: FeatureCourseCreate},
			{Method: http.MethodPut, Path: ActivitiesActivityId, Permission: PermissionCourseActivityUpdate, ResourceType: ResourceActivity, ResourceIDParam: ParamActivityId, SubscriptionFeatureKey: FeatureCourseUpdate},
			{Method: http.MethodDelete, Path: ActivitiesActivityId, Permission: PermissionCourseActivityDelete, ResourceType: ResourceActivity, ResourceIDParam: ParamActivityId, SubscriptionFeatureKey: FeatureCourseDelete},
			{Method: http.MethodPost, Path: CourseTypesPath, Permission: PermissionCourseTypeCreate, SubscriptionFeatureKey: FeatureCourseCreate},
			{Method: http.MethodPut, Path: CourseTypePath, Permission: PermissionCourseTypeUpdate, ResourceType: ResourceCourseType, ResourceIDParam: ParamCourseTypeId, SubscriptionFeatureKey: FeatureCourseUpdate},
			{Method: http.MethodDelete, Path: CourseTypePath, Permission: PermissionCourseTypeDelete, ResourceType: ResourceCourseType, ResourceIDParam: ParamCourseTypeId, SubscriptionFeatureKey: FeatureCourseDelete},
		}},

		{Name: PaymentService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: CheckoutCallbackPath, Public: true},
			{Method: http.MethodGet, Path: CourseCheckoutCallbackPath, Public: true},
			{Method: http.MethodGet, Path: Payments, Permission: PermissionPaymentSearch},
			{Method: http.MethodPost, Path: Payments, Permission: PermissionPaymentCreate},
			{Method: http.MethodGet, Path: PaymentsPaymentId, Permission: PermissionPaymentRead, ResourceType: ResourcePayment, ResourceIDParam: ParamPaymentId},
			{Method: http.MethodPost, Path: PaymentsPaymentIdCapture, Permission: PermissionPaymentCapture, ResourceType: ResourcePayment, ResourceIDParam: ParamPaymentId},
			{Method: http.MethodPost, Path: PaymentsPaymentIdCancel, Permission: PermissionPaymentCancel, ResourceType: ResourcePayment, ResourceIDParam: ParamPaymentId},
			{Method: http.MethodGet, Path: PaymentsPaymentIdRefunds, Permission: PermissionPaymentRefundRead, ResourceType: ResourcePayment, ResourceIDParam: ParamPaymentId},
			{Method: http.MethodPost, Path: PaymentsPaymentIdRefunds, Permission: PermissionPaymentRefundCreate, ResourceType: ResourcePayment, ResourceIDParam: ParamPaymentId},
			{Method: http.MethodPost, Path: Clients, Permission: PermissionPaymentClientCreate},
			{Method: http.MethodPost, Path: Checkouts, Permission: PermissionPaymentCheckoutCreate},
			{Method: http.MethodPost, Path: CourseOccurrenceCheckouts, Permission: PermissionPaymentCheckoutCreate},
			{Method: http.MethodGet, Path: PaymentBillingSubscriptions, Permission: PermissionPaymentSubscriptionRead},
			{Method: http.MethodPost, Path: PaymentBillingSubscriptions, Permission: PermissionPaymentSubscriptionCreate},
			{Method: http.MethodGet, Path: PaymentBillingSubscriptionsId, Permission: PermissionPaymentSubscriptionRead, ResourceType: ResourcePaymentBillingSubscription, ResourceIDParam: ParamPaymentBillingSubscriptionId},
			{Method: http.MethodPost, Path: PaymentBillingSubscriptionsIdCancel, Permission: PermissionPaymentSubscriptionManage, ResourceType: ResourcePaymentBillingSubscription, ResourceIDParam: ParamPaymentBillingSubscriptionId},
			{Method: http.MethodPost, Path: PaymentBillingSubscriptionsIdResume, Permission: PermissionPaymentSubscriptionManage, ResourceType: ResourcePaymentBillingSubscription, ResourceIDParam: ParamPaymentBillingSubscriptionId},
			{Method: http.MethodGet, Path: PaymentBillingSubscriptionsIdPayments, Permission: PermissionPaymentSubscriptionRead, ResourceType: ResourcePaymentBillingSubscription, ResourceIDParam: ParamPaymentBillingSubscriptionId},
			{Method: http.MethodGet, Path: PaymentBillingSubscriptionsIdInvoices, Permission: PermissionPaymentSubscriptionRead, ResourceType: ResourcePaymentBillingSubscription, ResourceIDParam: ParamPaymentBillingSubscriptionId},
			{Method: http.MethodGet, Path: PayeesPayeeIdBalances, Permission: PermissionPaymentPayeeBalanceRead, ResourceType: ResourcePayee, ResourceIDParam: ParamPayeeId},
			{Method: http.MethodGet, Path: PayeesPayeeIdPayoutRequests, Permission: PermissionPayoutRequestRead, ResourceType: ResourcePayee, ResourceIDParam: ParamPayeeId},
			{Method: http.MethodPost, Path: PayeesPayeeIdPayoutRequests, Permission: PermissionPayoutRequestCreate, ResourceType: ResourcePayee, ResourceIDParam: ParamPayeeId},
			{Method: http.MethodGet, Path: PayoutRequests, Permission: PermissionPayoutRequestSearch},
			{Method: http.MethodGet, Path: PayoutRequestsPayoutRequestId, Permission: PermissionPayoutRequestRead, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodPost, Path: PayoutRequestsPayoutRequestIdApprove, Permission: PermissionPayoutRequestApprove, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodPost, Path: PayoutRequestsPayoutRequestIdReject, Permission: PermissionPayoutRequestReject, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodPost, Path: PayoutRequestsPayoutRequestIdHold, Permission: PermissionPayoutRequestHold, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodPost, Path: PayoutRequestsPayoutRequestIdRelease, Permission: PermissionPayoutRequestRelease, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodPost, Path: PayoutRequestsPayoutRequestIdMarkPaid, Permission: PermissionPayoutRequestMarkPaid, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodPost, Path: PayoutRequestsPayoutRequestIdCancel, Permission: PermissionPayoutRequestCancel, ResourceType: ResourcePayoutRequest, ResourceIDParam: ParamPayoutRequestId},
			{Method: http.MethodGet, Path: PaymentAccountsStripe, Permission: PermissionPaymentAccountRead},
			{Method: http.MethodPost, Path: PaymentAccountsStripeConnect, Permission: PermissionPaymentAccountConnect, SubscriptionFeatureKey: FeaturePaymentAcceptOnline},
			{Method: http.MethodPost, Path: PaymentAccountsStripeRefresh, Permission: PermissionPaymentAccountConnect, SubscriptionFeatureKey: FeaturePaymentAcceptOnline},
			{Method: http.MethodPost, Path: PaymentAccountsStripeDisconnect, Permission: PermissionPaymentAccountDisconnect, SubscriptionFeatureKey: FeaturePaymentAcceptOnline},
			{Method: http.MethodPost, Path: WebhooksProvider, Public: true},
		}},

		{Name: UserService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: Users, Permission: PermissionUserSearch},
			{Method: http.MethodPost, Path: Users, Permission: PermissionUserCreate},
			{Method: http.MethodGet, Path: UsersUserId, Permission: PermissionUserRead, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodPut, Path: UsersUserId, Permission: PermissionUserUpdate, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodDelete, Path: UsersUserId, Permission: PermissionUserDelete, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodPost, Path: UsersUserIdMutation, Permission: PermissionUserUpdate, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodGet, Path: AccountsAccountId, Permission: PermissionAccountRead, ResourceType: ResourceAccount, ResourceIDParam: ParamAccountId},
			{Method: http.MethodPatch, Path: AccountsAccountId, Permission: PermissionAccountUpdate, ResourceType: ResourceAccount, ResourceIDParam: ParamAccountId},
			{Method: http.MethodPost, Path: AuthRegister, Public: true},
			{Method: http.MethodPost, Path: AuthLogin, Public: true},
			{Method: http.MethodPost, Path: AuthLogout, Permission: PermissionAuthSessionDelete},
			{Method: http.MethodPost, Path: AuthRefresh, Public: true},
			{Method: http.MethodPost, Path: AuthChangePassword, Permission: PermissionAuthPasswordUpdate},
			{Method: http.MethodPost, Path: AuthForgotPassword, Public: true},
			{Method: http.MethodPost, Path: AuthResetPassword, Public: true},
			{Method: http.MethodGet, Path: AuthSessions, Permission: PermissionAuthSessionRead},
			{Method: http.MethodDelete, Path: AuthSessionsSessionId, Permission: PermissionAuthSessionDelete, ResourceType: ResourceSession, ResourceIDParam: ParamSessionId},
			{Method: http.MethodPost, Path: AuthMfaSetup, Permission: PermissionAuthMfaUpdate},
			{Method: http.MethodPost, Path: AuthMfaVerify, Permission: PermissionAuthMfaUpdate},
			{Method: http.MethodPost, Path: AuthCredentials, Public: true},
			{Method: http.MethodPost, Path: AuthPasswordResetRequest, Public: true},
			{Method: http.MethodPost, Path: AuthPasswordResetValidate, Public: true},
			{Method: http.MethodPost, Path: AuthPasswordResetConfirm, Public: true},
			{Method: http.MethodPost, Path: Organisations, Permission: PermissionOrganisationCreate},
			{Method: http.MethodPut, Path: OrganisationsOrganisationId, Permission: PermissionOrganisationUpdate, ResourceType: ResourceOrganisation, ResourceIDParam: ParamOrganisationId},
		}},

		{Name: OrganisationService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: Organisations, Permission: PermissionOrganisationSearch},
			{Method: http.MethodGet, Path: OrganisationsOrganisationId, Permission: PermissionOrganisationRead, ResourceType: ResourceOrganisation, ResourceIDParam: ParamOrganisationId},
			{Method: http.MethodGet, Path: Applications, Permission: PermissionOrganisationApplicationSearch},
			{Method: http.MethodGet, Path: ApplicationsApplicationId, Permission: PermissionOrganisationApplicationRead, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
			{Method: http.MethodGet, Path: ApplicationsApplicationIdServices, Permission: PermissionOrganisationApplicationRead, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
		}},

		{Name: SubscriptionService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: SubscriptionProducts, Permission: PermissionSubscriptionProductRead},
			{Method: http.MethodPost, Path: SubscriptionProducts, Permission: PermissionSubscriptionProductManage},
			{Method: http.MethodGet, Path: SubscriptionProduct, Permission: PermissionSubscriptionProductRead, ResourceType: ResourceProduct, ResourceIDParam: ParamProductKey},
			{Method: http.MethodPut, Path: SubscriptionProduct, Permission: PermissionSubscriptionProductManage, ResourceType: ResourceProduct, ResourceIDParam: ParamProductKey},
			{Method: http.MethodDelete, Path: SubscriptionProduct, Permission: PermissionSubscriptionProductManage, ResourceType: ResourceProduct, ResourceIDParam: ParamProductKey},
			{Method: http.MethodPost, Path: SubscriptionProductSuspend, Permission: PermissionSubscriptionProductManage, ResourceType: ResourceProduct, ResourceIDParam: ParamProductKey},
			{Method: http.MethodGet, Path: SubscriptionProductFeatures, Permission: PermissionSubscriptionProductRead},
			{Method: http.MethodPost, Path: SubscriptionProductFeatures, Permission: PermissionSubscriptionProductManage},
			{Method: http.MethodGet, Path: SubscriptionProductFeature, Permission: PermissionSubscriptionProductRead, ResourceType: ResourceFeature, ResourceIDParam: ParamFeatureKey},
			{Method: http.MethodPut, Path: SubscriptionProductFeature, Permission: PermissionSubscriptionProductManage, ResourceType: ResourceFeature, ResourceIDParam: ParamFeatureKey},
			{Method: http.MethodDelete, Path: SubscriptionProductFeature, Permission: PermissionSubscriptionProductManage, ResourceType: ResourceFeature, ResourceIDParam: ParamFeatureKey},
			{Method: http.MethodPost, Path: SubscriptionProductFeatureDisable, Permission: PermissionSubscriptionProductManage, ResourceType: ResourceFeature, ResourceIDParam: ParamFeatureKey},
			{Method: http.MethodGet, Path: SubscriptionPlans, Permission: PermissionSubscriptionPlanRead},
			{Method: http.MethodGet, Path: SubscriptionPlanBillingCycles, Permission: PermissionSubscriptionPlanRead},
			{Method: http.MethodPost, Path: SubscriptionPlans, Permission: PermissionSubscriptionPlanManage},
			{Method: http.MethodGet, Path: SubscriptionPlan, Permission: PermissionSubscriptionPlanRead, ResourceType: ResourcePlan, ResourceIDParam: ParamPlanKey},
			{Method: http.MethodPut, Path: SubscriptionPlan, Permission: PermissionSubscriptionPlanManage, ResourceType: ResourcePlan, ResourceIDParam: ParamPlanKey},
			{Method: http.MethodDelete, Path: SubscriptionPlan, Permission: PermissionSubscriptionPlanManage, ResourceType: ResourcePlan, ResourceIDParam: ParamPlanKey},
			{Method: http.MethodPost, Path: SubscriptionPlanSuspend, Permission: PermissionSubscriptionPlanManage, ResourceType: ResourcePlan, ResourceIDParam: ParamPlanKey},
			{Method: http.MethodPut, Path: SubscriptionPlanFeatures, Permission: PermissionSubscriptionPlanManage, ResourceType: ResourcePlan, ResourceIDParam: ParamPlanKey},
			{Method: http.MethodPut, Path: SubscriptionPlanProducts, Permission: PermissionSubscriptionPlanManage, ResourceType: ResourcePlan, ResourceIDParam: ParamPlanKey},
			{Method: http.MethodGet, Path: SubscriptionOwnerPolicies, Permission: PermissionSubscriptionPlanRead},
			{Method: http.MethodGet, Path: SubscriptionOwnerPolicy, Permission: PermissionSubscriptionPlanRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamOwnerType},
			{Method: http.MethodPut, Path: SubscriptionOwnerPolicy, Permission: PermissionSubscriptionPlanManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamOwnerType},
			{Method: http.MethodGet, Path: SubscriptionApplicationAvailableFeatures, Permission: PermissionSubscriptionAvailableFeaturesRead, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
			{Method: http.MethodGet, Path: SubscriptionApplicationSubscriptions, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
			{Method: http.MethodPost, Path: SubscriptionApplicationSubscriptions, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
			{Method: http.MethodGet, Path: SubscriptionApplicationSubscriptionCurrent, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
			{Method: http.MethodGet, Path: SubscriptionOwnerSubscriptions, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamOwnerId},
			{Method: http.MethodPost, Path: SubscriptionOwnerSubscriptions, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamOwnerId},
			{Method: http.MethodGet, Path: SubscriptionOwnerSubscriptionCurrent, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamOwnerId},
			{Method: http.MethodGet, Path: SubscriptionOwnerEntitlements, Permission: PermissionSubscriptionEntitlementRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamOwnerId},
			{Method: http.MethodPost, Path: SubscriptionPlanChangesApplyDue, Permission: PermissionSubscriptionSubscriptionManage},
			{Method: http.MethodPost, Path: SubscriptionPlanChangePaymentResult, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourcePlanChange, ResourceIDParam: ParamPlanChangeId},
			{Method: http.MethodGet, Path: SubscriptionRecord, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodPost, Path: SubscriptionRecordCancel, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodPost, Path: SubscriptionRecordReactivate, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodPost, Path: SubscriptionRecordChangePlan, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodPost, Path: SubscriptionRecordCheckout, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodGet, Path: SubscriptionRecordPlanChanges, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodPost, Path: SubscriptionRecordPlanChanges, Permission: PermissionSubscriptionSubscriptionManage, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodGet, Path: SubscriptionRecordBillingEvents, Permission: PermissionSubscriptionSubscriptionRead, ResourceType: ResourceSubscription, ResourceIDParam: ParamSubscriptionId},
			{Method: http.MethodGet, Path: SubscriptionApplicationEntitlements, Permission: PermissionSubscriptionEntitlementRead, ResourceType: ResourceApplication, ResourceIDParam: ParamApplicationId},
		}},

		{Name: BookingService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: Bookings, Permission: PermissionBookingRead},
			{Method: http.MethodPost, Path: Bookings, Permission: PermissionBookingCreate, SubscriptionFeatureKey: FeatureBookingCreate},
			{Method: http.MethodGet, Path: BookingsBookingId, Permission: PermissionBookingRead, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdCancel, Permission: PermissionBookingCancel, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdConfirm, Permission: PermissionBookingConfirm, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdComplete, Permission: PermissionBookingComplete, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdPaymentReceived, Permission: PermissionBookingPaymentRecord, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdPaymentLink, Permission: PermissionBookingPaymentLink, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodGet, Path: BookingsBookingIdParticipants, Permission: PermissionBookingParticipantRead, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdParticipants, Permission: PermissionBookingParticipantCreate, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
			{Method: http.MethodPost, Path: BookingsBookingIdParticipantsParticipantIdAttendance, Permission: PermissionBookingParticipantAttendanceRecord, ResourceType: ResourceBooking, ResourceIDParam: ParamBookingId},
		}},

		{Name: WalletService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: Wallets, Permission: PermissionWalletSearch},
			{Method: http.MethodPost, Path: Wallets, Permission: PermissionWalletCreate},
			{Method: http.MethodGet, Path: WalletsWalletId, Permission: PermissionWalletRead, ResourceType: ResourceWallet, ResourceIDParam: ParamWalletId},
			{Method: http.MethodGet, Path: WalletsWalletIdLinkedAccounts, Permission: PermissionWalletRead, ResourceType: ResourceWallet, ResourceIDParam: ParamWalletId},
			{Method: http.MethodPost, Path: WalletsWalletIdLinkedAccounts, Permission: PermissionWalletCreate, ResourceType: ResourceWallet, ResourceIDParam: ParamWalletId},
			{Method: http.MethodGet, Path: WalletsWalletIdBalance, Permission: PermissionWalletRead, ResourceType: ResourceWallet, ResourceIDParam: ParamWalletId},
			{Method: http.MethodGet, Path: WalletsWalletIdTransactions, Permission: PermissionWalletTransactionRead, ResourceType: ResourceWallet, ResourceIDParam: ParamWalletId},
			{Method: http.MethodPost, Path: WalletsTransfer, Permission: PermissionWalletTransfer},
			{Method: http.MethodPost, Path: WalletsReverse, Permission: PermissionWalletReverse},
			{Method: http.MethodPost, Path: WalletsAdjustment, Permission: PermissionWalletAdjustment},
			{Method: http.MethodGet, Path: WalletTransactions, Permission: PermissionWalletTransactionRead, ResourceType: ResourceTransaction, ResourceIDParam: ParamTransactionId},
		}},

		{Name: TransferService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodGet, Path: Transfers, Permission: PermissionWalletTransactionRead},
			{Method: http.MethodPost, Path: Transfers, Permission: PermissionTransferCreate},
		}},

		{Name: AuthorisationService, Routes: []RouteDefinitionWithPermission{
			{Method: http.MethodPost, Path: AuthorisationPermissions, Permission: PermissionAuthorisationPermissionCreate},
			{Method: http.MethodGet, Path: AuthorisationPermissions, Permission: PermissionAuthorisationPermissionRead},
			{Method: http.MethodGet, Path: AuthorisationPermissionsPermissionId, Permission: PermissionAuthorisationPermissionRead, ResourceType: ResourcePermission, ResourceIDParam: ParamPermissionId},
			{Method: http.MethodPut, Path: AuthorisationPermissionsPermissionId, Permission: PermissionAuthorisationPermissionUpdate, ResourceType: ResourcePermission, ResourceIDParam: ParamPermissionId},
			{Method: http.MethodPost, Path: AuthorisationResources, Permission: PermissionAuthorisationResourceCreate},
			{Method: http.MethodGet, Path: AuthorisationResources, Permission: PermissionAuthorisationResourceRead},
			{Method: http.MethodPost, Path: AuthorisationRoles, Permission: PermissionAuthorisationRoleCreate},
			{Method: http.MethodGet, Path: AuthorisationRoles, Permission: PermissionAuthorisationRoleRead},
			{Method: http.MethodGet, Path: AuthorisationRolesRoleId, Permission: PermissionAuthorisationRoleRead, ResourceType: ResourceRole, ResourceIDParam: ParamRoleId},
			{Method: http.MethodPut, Path: AuthorisationRolesRoleId, Permission: PermissionAuthorisationRoleUpdate, ResourceType: ResourceRole, ResourceIDParam: ParamRoleId},
			{Method: http.MethodPost, Path: AuthorisationRolesRoleIdPermissions, Permission: PermissionAuthorisationRolePermissionAssign, ResourceType: ResourceRole, ResourceIDParam: ParamRoleId},
			{Method: http.MethodGet, Path: AuthorisationRolesRoleIdPermissions, Permission: PermissionAuthorisationRolePermissionRead, ResourceType: ResourceRole, ResourceIDParam: ParamRoleId},
			{Method: http.MethodDelete, Path: AuthorisationRolesRoleIdPermissionsPermissionId, Permission: PermissionAuthorisationRolePermissionRemove, ResourceType: ResourceRole, ResourceIDParam: ParamRoleId},
			{Method: http.MethodPost, Path: AuthorisationUsersUserIdRoles, Permission: PermissionAuthorisationUserRoleAssign, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodGet, Path: AuthorisationUsersUserIdRoles, Permission: PermissionAuthorisationUserRoleRead, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodDelete, Path: AuthorisationUsersUserIdRolesAssignmentId, Permission: PermissionAuthorisationUserRoleRemove, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodPost, Path: AuthorisationUsersUserIdPermissions, Permission: PermissionAuthorisationUserPermissionAssign, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodGet, Path: AuthorisationUsersUserIdPermissions, Permission: PermissionAuthorisationUserPermissionRead, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodDelete, Path: AuthorisationUsersUserIdPermissionsAssignmentId, Permission: PermissionAuthorisationUserPermissionRemove, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodGet, Path: AuthorisationUsersUserIdEffectivePermissions, Permission: PermissionAuthorisationUserPermissionRead, ResourceType: ResourceUser, ResourceIDParam: ParamUserId},
			{Method: http.MethodPost, Path: AuthorisationAuthorise, Permission: PermissionAuthorisationAuthorize},
			{Method: http.MethodPost, Path: AuthorisationAuthorize, Permission: PermissionAuthorisationAuthorize},
		}},
	}
}

func gatewayRoutes() []GatewayRouteDefinition {
	services := serviceDefinitions()
	total := 0
	for _, service := range services {
		total += len(service.Routes)
	}
	routes := make([]GatewayRouteDefinition, 0, total)
	for _, service := range services {
		for _, route := range service.Routes {
			routes = append(routes, GatewayRouteDefinition{RouteDefinitionWithPermission: route, Service: service.Name})
		}
	}
	return routes
}
func permissionName(code string) string {
	words := strings.Fields(strings.ReplaceAll(code, ".", " "))
	for index, word := range words {
		if word == "" {
			continue
		}
		words[index] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
}

func resolveRoute(method string, path string) (routeMatch, bool) {
	for _, route := range gatewayRoutes() {
		if route.Method != method && !(method == http.MethodHead && route.Method == http.MethodGet) {
			continue
		}
		params, ok := matchRoutePath(string(route.Path), path)
		if ok {
			return routeMatch{Definition: route, Params: params}, true
		}
	}
	return routeMatch{}, false
}

func matchRoutePath(pattern string, path string) (map[string]string, bool) {
	patternParts := splitPath(pattern)
	pathParts := splitPath(path)
	if len(patternParts) != len(pathParts) {
		return nil, false
	}
	params := map[string]string{}
	for index, patternPart := range patternParts {
		pathPart := pathParts[index]
		if strings.HasPrefix(patternPart, "{") && strings.HasSuffix(patternPart, "}") {
			name := strings.TrimSuffix(strings.TrimPrefix(patternPart, "{"), "}")
			if name == "" || pathPart == "" {
				return nil, false
			}
			params[name] = pathPart
			continue
		}
		if patternPart != pathPart {
			return nil, false
		}
	}
	return params, true
}

func splitPath(path string) []string {
	path = strings.Trim(path, "/")
	if path == "" {
		return nil
	}
	return strings.Split(path, "/")
}

func proxyKeyForService(service GatewayService) string {
	switch service {
	case UserService:
		return "user"
	case AuthorisationService:
		return "authorisation"
	case AcademyService:
		return "academy"
	case OrganisationService:
		return "organisation"
	case CourseService:
		return "course"
	case BookingService:
		return "booking"
	case PaymentService:
		return "payment"
	case SubscriptionService:
		return "subscriptions"
	case WalletService:
		return "wallet"
	case TransferService:
		return "transfer"
	default:
		return ""
	}
}

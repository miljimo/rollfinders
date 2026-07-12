package routes

import (
	"crypto/md5"
	"fmt"
)

type GatewayService string
type GatewayTargetPath string
type GatewayPermissionName string
type GatewayResourceType string
type GatewayResourceIDParam string
type GatewaySubscriptionFeatureKey string
type GatewayUsageActionKey string
type GatewayUsagePeriodType string

type GatewayResourceDefinition struct {
	Name        GatewayPermissionName
	Description string
	Target      GatewayTargetPath
}

func (path GatewayTargetPath) String() string {
	return string(path)
}

func StableResourceID(seed string) string {
	sum := md5.Sum([]byte(seed))
	return fmt.Sprintf("%x-%x-%x-%x-%x", sum[0:4], sum[4:6], sum[6:8], sum[8:10], sum[10:16])
}

func createGatewayResource(name GatewayPermissionName, targets ...GatewayTargetPath) GatewayResourceDefinition {
	resource := GatewayResourceDefinition{
		Name:        name,
		Description: "Allows access to the " + string(name) + " capability.",
	}
	if len(targets) > 0 {
		resource.Target = targets[0]
	}
	return resource
}

const (
	UserService          GatewayService = "user-service"
	AuthorisationService GatewayService = "authorisation-service"
	AcademyService       GatewayService = "academy-service"
	OrganisationService  GatewayService = "organisation-service"
	CourseService        GatewayService = "course-service"
	BookingService       GatewayService = "booking-service"
	PaymentService       GatewayService = "payment-service"
	SubscriptionService  GatewayService = "subscription-service"
	WalletService        GatewayService = "wallet-service"
	TransferService      GatewayService = "transfer-service"
	PricingService       GatewayService = "pricing-service"
	UsageLimitsService   GatewayService = "usage-limits-service"
)

const (
	// Academy Service API Gateways
	AcademiesPath                   GatewayTargetPath = "/v1/academies"
	AcademyPath                     GatewayTargetPath = "/v1/academies/{academyId}"
	AcademiesAcademyIdMembers       GatewayTargetPath = "/v1/academies/{academyId}/members"
	AcademiesAcademyIdMembersUserId GatewayTargetPath = "/v1/academies/{academyId}/members/{userId}"
	AcademiesAcademyIdSearchHide    GatewayTargetPath = "/v1/academies/{academyId}/search/hide"
	Memberships                     GatewayTargetPath = "/v1/memberships"
	MembershipsMembershipId         GatewayTargetPath = "/v1/memberships/{membershipId}"

	PermissionAcademyCreate           GatewayPermissionName = "academy.create"
	PermissionAcademyDelete           GatewayPermissionName = "academy.delete"
	PermissionAcademyMemberAssign     GatewayPermissionName = "academy.member.assign"
	PermissionAcademyMemberRead       GatewayPermissionName = "academy.member.read"
	PermissionAcademyMemberRemove     GatewayPermissionName = "academy.member.remove"
	PermissionAcademyMembershipAssign GatewayPermissionName = "academy.membership.assign"
	PermissionAcademyMembershipRead   GatewayPermissionName = "academy.membership.read"
	PermissionAcademyMembershipRemove GatewayPermissionName = "academy.membership.remove"
	PermissionAcademySearchHide       GatewayPermissionName = "academy.search.hide"
	PermissionAcademyUpdate           GatewayPermissionName = "academy.update"

	FeatureAcademyProfileManage GatewaySubscriptionFeatureKey = "academy.profile.manage"
	FeatureAcademyTeamManage    GatewaySubscriptionFeatureKey = "academy.team.manage"

	ResourceAcademy     GatewayResourceType = "academy"
	ResourceAcademyUser GatewayResourceType = "academy_user"
	ResourceMembership  GatewayResourceType = "membership"

	ParamAcademyId    GatewayResourceIDParam = "academyId"
	ParamMembershipId GatewayResourceIDParam = "membershipId"
)

const (
	UsageActionCreate GatewayUsageActionKey = "create"
	UsageActionInvite GatewayUsageActionKey = "invite"

	UsagePeriodLifetime           GatewayUsagePeriodType = "lifetime"
	UsagePeriodSubscriptionPeriod GatewayUsagePeriodType = "subscription_period"
)

const (
	// User Service API Gateways
	AuthChangePassword        GatewayTargetPath = "/auth/change-password"
	AuthForgotPassword        GatewayTargetPath = "/auth/forgot-password"
	AuthLogin                 GatewayTargetPath = "/auth/login"
	AuthLogout                GatewayTargetPath = "/auth/logout"
	AuthMfaSetup              GatewayTargetPath = "/auth/mfa/setup"
	AuthMfaVerify             GatewayTargetPath = "/auth/mfa/verify"
	AuthRefresh               GatewayTargetPath = "/auth/refresh"
	AuthRegister              GatewayTargetPath = "/auth/register"
	AuthResetPassword         GatewayTargetPath = "/auth/reset-password"
	AuthSessions              GatewayTargetPath = "/auth/sessions"
	AuthSessionsSessionId     GatewayTargetPath = "/auth/sessions/{sessionId}"
	AccountsAccountId         GatewayTargetPath = "/v1/accounts/{accountId}"
	AuthCredentials           GatewayTargetPath = "/v1/auth/credentials"
	AuthPasswordResetConfirm  GatewayTargetPath = "/v1/auth/password-reset/confirm"
	AuthPasswordResetRequest  GatewayTargetPath = "/v1/auth/password-reset/request"
	AuthPasswordResetValidate GatewayTargetPath = "/v1/auth/password-reset/validate"
	Users                     GatewayTargetPath = "/v1/users"
	UsersUserId               GatewayTargetPath = "/v1/users/{userId}"
	UsersUserIdMutation       GatewayTargetPath = "/v1/users/{userId}/{mutation}"

	PermissionAccountRead        GatewayPermissionName = "account.read"
	PermissionAccountUpdate      GatewayPermissionName = "account.update"
	PermissionAuthMfaUpdate      GatewayPermissionName = "auth.mfa.update"
	PermissionAuthPasswordUpdate GatewayPermissionName = "auth.password.update"
	PermissionAuthSessionDelete  GatewayPermissionName = "auth.session.delete"
	PermissionAuthSessionRead    GatewayPermissionName = "auth.session.read"
	PermissionUserCreate         GatewayPermissionName = "user.create"
	PermissionUserDelete         GatewayPermissionName = "user.delete"
	PermissionUserRead           GatewayPermissionName = "user.read"
	PermissionUserSearch         GatewayPermissionName = "user.search"
	PermissionUserUpdate         GatewayPermissionName = "user.update"

	ResourceAccount GatewayResourceType = "account"
	ResourceSession GatewayResourceType = "session"
	ResourceUser    GatewayResourceType = "user"

	ParamAccountId GatewayResourceIDParam = "accountId"
	ParamSessionId GatewayResourceIDParam = "sessionId"
	ParamUserId    GatewayResourceIDParam = "userId"
)

const (
	// Organisation Service API Gateways
	Applications                      GatewayTargetPath = "/v1/applications"
	ApplicationsApplicationId         GatewayTargetPath = "/v1/applications/{applicationId}"
	ApplicationsApplicationIdServices GatewayTargetPath = "/v1/applications/{applicationId}/services"
	Organisations                     GatewayTargetPath = "/v1/organisations"
	OrganisationsOrganisationId       GatewayTargetPath = "/v1/organisations/{organisationId}"

	PermissionOrganisationApplicationRead   GatewayPermissionName = "organisation.application.read"
	PermissionOrganisationApplicationSearch GatewayPermissionName = "organisation.application.search"
	PermissionOrganisationCreate            GatewayPermissionName = "organisation.create"
	PermissionOrganisationRead              GatewayPermissionName = "organisation.read"
	PermissionOrganisationSearch            GatewayPermissionName = "organisation.search"
	PermissionOrganisationUpdate            GatewayPermissionName = "organisation.update"

	ResourceApplication  GatewayResourceType = "application"
	ResourceOrganisation GatewayResourceType = "organisation"

	ParamApplicationId  GatewayResourceIDParam = "applicationId"
	ParamOrganisationId GatewayResourceIDParam = "organisationId"
)

const (
	// Course Service API Gateways
	CoursePath                GatewayTargetPath = "/v1/courses/{courseId}"
	CourseTypePath            GatewayTargetPath = "/v1/course-types/{courseTypeId}"
	CourseTypesPath           GatewayTargetPath = "/v1/course-types"
	CoursesPath               GatewayTargetPath = "/v1/courses"
	ActivitiesActivityId      GatewayTargetPath = "/v1/activities/{activityId}"
	CoursesCourseIdActivities GatewayTargetPath = "/v1/courses/{courseId}/activities"

	PermissionCourseActivityCreate GatewayPermissionName = "course.activity.create"
	PermissionCourseActivityDelete GatewayPermissionName = "course.activity.delete"
	PermissionCourseActivityRead   GatewayPermissionName = "course.activity.read"
	PermissionCourseActivityUpdate GatewayPermissionName = "course.activity.update"
	PermissionCourseCreate         GatewayPermissionName = "course.create"
	PermissionCourseDelete         GatewayPermissionName = "course.delete"
	PermissionCourseTypeCreate     GatewayPermissionName = "course.type.create"
	PermissionCourseTypeDelete     GatewayPermissionName = "course.type.delete"
	PermissionCourseTypeUpdate     GatewayPermissionName = "course.type.update"
	PermissionCourseUpdate         GatewayPermissionName = "course.update"

	FeatureCourseCreate GatewaySubscriptionFeatureKey = "course.create"
	FeatureCourseUpdate GatewaySubscriptionFeatureKey = "course.update"
	FeatureCourseDelete GatewaySubscriptionFeatureKey = "course.delete"

	ResourceActivity   GatewayResourceType = "activity"
	ResourceCourse     GatewayResourceType = "course"
	ResourceCourseType GatewayResourceType = "course_type"

	ParamActivityId   GatewayResourceIDParam = "activityId"
	ParamCourseId     GatewayResourceIDParam = "courseId"
	ParamCourseTypeId GatewayResourceIDParam = "courseTypeId"
)

const (
	// Booking Service API Gateways
	Bookings                                             GatewayTargetPath = "/v1/bookings"
	BookingsBookingId                                    GatewayTargetPath = "/v1/bookings/{bookingId}"
	BookingsBookingIdCancel                              GatewayTargetPath = "/v1/bookings/{bookingId}/cancel"
	BookingsBookingIdComplete                            GatewayTargetPath = "/v1/bookings/{bookingId}/complete"
	BookingsBookingIdConfirm                             GatewayTargetPath = "/v1/bookings/{bookingId}/confirm"
	BookingsBookingIdParticipants                        GatewayTargetPath = "/v1/bookings/{bookingId}/participants"
	BookingsBookingIdParticipantsParticipantIdAttendance GatewayTargetPath = "/v1/bookings/{bookingId}/participants/{participantId}/attendance"
	BookingsBookingIdPaymentLink                         GatewayTargetPath = "/v1/bookings/{bookingId}/payment-link"
	BookingsBookingIdPaymentReceived                     GatewayTargetPath = "/v1/bookings/{bookingId}/payment-received"

	PermissionBookingCancel                      GatewayPermissionName = "booking.cancel"
	PermissionBookingComplete                    GatewayPermissionName = "booking.complete"
	PermissionBookingConfirm                     GatewayPermissionName = "booking.confirm"
	PermissionBookingCreate                      GatewayPermissionName = "booking.create"
	PermissionBookingParticipantAttendanceRecord GatewayPermissionName = "booking.participant.attendance.record"
	PermissionBookingParticipantCreate           GatewayPermissionName = "booking.participant.create"
	PermissionBookingParticipantRead             GatewayPermissionName = "booking.participant.read"
	PermissionBookingPaymentLink                 GatewayPermissionName = "booking.payment.link"
	PermissionBookingPaymentRecord               GatewayPermissionName = "booking.payment.record"
	PermissionBookingRead                        GatewayPermissionName = "booking.read"

	FeatureBookingCreate GatewaySubscriptionFeatureKey = "booking.create"

	ResourceBooking GatewayResourceType = "booking"

	ParamBookingId GatewayResourceIDParam = "bookingId"
)

const (
	// Payment Service API Gateways
	CheckoutCallbackPath                  GatewayTargetPath = "/v1/checkouts/{checkoutId}/callbacks/{result}"
	CourseCheckoutCallbackPath            GatewayTargetPath = "/v1/course-occurrence-checkouts/{checkoutId}/callbacks/{result}"
	Checkouts                             GatewayTargetPath = "/v1/checkouts"
	Clients                               GatewayTargetPath = "/v1/clients"
	CourseOccurrenceCheckouts             GatewayTargetPath = "/v1/course-occurrence-checkouts"
	PayeesPayeeIdBalances                 GatewayTargetPath = "/v1/payees/{payeeId}/balances"
	PayeesPayeeIdPayoutRequests           GatewayTargetPath = "/v1/payees/{payeeId}/payout-requests"
	PaymentAccountsStripe                 GatewayTargetPath = "/v1/payment-accounts/stripe"
	PaymentAccountsStripeConnect          GatewayTargetPath = "/v1/payment-accounts/stripe/connect"
	PaymentAccountsStripeDisconnect       GatewayTargetPath = "/v1/payment-accounts/stripe/disconnect"
	PaymentAccountsStripeRefresh          GatewayTargetPath = "/v1/payment-accounts/stripe/refresh"
	PaymentBillingSubscriptions           GatewayTargetPath = "/v1/billing/subscriptions"
	PaymentBillingSubscriptionsId         GatewayTargetPath = "/v1/billing/subscriptions/{billingSubscriptionId}"
	PaymentBillingSubscriptionsIdCancel   GatewayTargetPath = "/v1/billing/subscriptions/{billingSubscriptionId}/cancel"
	PaymentBillingSubscriptionsIdInvoices GatewayTargetPath = "/v1/billing/subscriptions/{billingSubscriptionId}/invoices"
	PaymentBillingSubscriptionsIdPayments GatewayTargetPath = "/v1/billing/subscriptions/{billingSubscriptionId}/payments"
	PaymentBillingSubscriptionsIdResume   GatewayTargetPath = "/v1/billing/subscriptions/{billingSubscriptionId}/resume"
	Payments                              GatewayTargetPath = "/v1/payments"
	PaymentsPaymentId                     GatewayTargetPath = "/v1/payments/{paymentId}"
	PaymentsPaymentIdCancel               GatewayTargetPath = "/v1/payments/{paymentId}/cancel"
	PaymentsPaymentIdCapture              GatewayTargetPath = "/v1/payments/{paymentId}/capture"
	PaymentsPaymentIdRefunds              GatewayTargetPath = "/v1/payments/{paymentId}/refunds"
	PayoutRequests                        GatewayTargetPath = "/v1/payout-requests"
	PayoutRequestsPayoutRequestId         GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}"
	PayoutRequestsPayoutRequestIdApprove  GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}/approve"
	PayoutRequestsPayoutRequestIdCancel   GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}/cancel"
	PayoutRequestsPayoutRequestIdHold     GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}/hold"
	PayoutRequestsPayoutRequestIdMarkPaid GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}/mark-paid"
	PayoutRequestsPayoutRequestIdReject   GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}/reject"
	PayoutRequestsPayoutRequestIdRelease  GatewayTargetPath = "/v1/payout-requests/{payoutRequestId}/release"
	WebhooksProvider                      GatewayTargetPath = "/v1/webhooks/{provider}"

	PermissionPaymentAccountConnect     GatewayPermissionName = "payment.account.connect"
	PermissionPaymentAccountDisconnect  GatewayPermissionName = "payment.account.disconnect"
	PermissionPaymentAccountRead        GatewayPermissionName = "payment.account.read"
	PermissionPaymentCancel             GatewayPermissionName = "payment.cancel"
	PermissionPaymentCapture            GatewayPermissionName = "payment.capture"
	PermissionPaymentCheckoutCreate     GatewayPermissionName = "payment.checkout.create"
	PermissionPaymentClientCreate       GatewayPermissionName = "payment.client.create"
	PermissionPaymentCreate             GatewayPermissionName = "payment.create"
	PermissionPaymentSubscriptionCreate GatewayPermissionName = "payment.subscription.create"
	PermissionPaymentSubscriptionManage GatewayPermissionName = "payment.subscription.manage"
	PermissionPaymentSubscriptionRead   GatewayPermissionName = "payment.subscription.read"
	PermissionPaymentPayeeBalanceRead   GatewayPermissionName = "payment.payee.balance.read"
	PermissionPaymentRead               GatewayPermissionName = "payment.read"
	PermissionPaymentRefundCreate       GatewayPermissionName = "payment.refund.create"
	PermissionPaymentRefundRead         GatewayPermissionName = "payment.refund.read"
	PermissionPaymentSearch             GatewayPermissionName = "payment.search"
	PermissionPayoutRequestApprove      GatewayPermissionName = "payout.request.approve"
	PermissionPayoutRequestCancel       GatewayPermissionName = "payout.request.cancel"
	PermissionPayoutRequestCreate       GatewayPermissionName = "payout.request.create"
	PermissionPayoutRequestHold         GatewayPermissionName = "payout.request.hold"
	PermissionPayoutRequestMarkPaid     GatewayPermissionName = "payout.request.mark_paid"
	PermissionPayoutRequestRead         GatewayPermissionName = "payout.request.read"
	PermissionPayoutRequestReject       GatewayPermissionName = "payout.request.reject"
	PermissionPayoutRequestRelease      GatewayPermissionName = "payout.request.release"
	PermissionPayoutRequestSearch       GatewayPermissionName = "payout.request.search"

	FeaturePaymentAcceptOnline GatewaySubscriptionFeatureKey = "payment.accept_online"

	ResourcePayee                      GatewayResourceType = "payee"
	ResourcePaymentBillingSubscription GatewayResourceType = "payment_billing_subscription"
	ResourcePayment                    GatewayResourceType = "payment"
	ResourcePayoutRequest              GatewayResourceType = "payout_request"

	ParamPayeeId                      GatewayResourceIDParam = "payeeId"
	ParamPaymentBillingSubscriptionId GatewayResourceIDParam = "billingSubscriptionId"
	ParamPaymentId                    GatewayResourceIDParam = "paymentId"
	ParamPayoutRequestId              GatewayResourceIDParam = "payoutRequestId"
)

const (
	// Subscription Service API Gateways
	SubscriptionProducts                       GatewayTargetPath = "/v1/products"
	SubscriptionProduct                        GatewayTargetPath = "/v1/products/{productKey}"
	SubscriptionProductSuspend                 GatewayTargetPath = "/v1/products/{productKey}/suspend"
	SubscriptionProductFeatures                GatewayTargetPath = "/v1/product-features"
	SubscriptionProductFeature                 GatewayTargetPath = "/v1/product-features/{featureKey}"
	SubscriptionProductFeatureDisable          GatewayTargetPath = "/v1/product-features/{featureKey}/disable"
	SubscriptionPlans                          GatewayTargetPath = "/v1/plans"
	SubscriptionPlanBillingCycles              GatewayTargetPath = "/v1/plans/billing-cycles"
	SubscriptionPlanQuote                      GatewayTargetPath = "/v1/plans/quote"
	SubscriptionPlan                           GatewayTargetPath = "/v1/plans/{planKey}"
	SubscriptionPlanSuspend                    GatewayTargetPath = "/v1/plans/{planKey}/suspend"
	SubscriptionPlanFeatures                   GatewayTargetPath = "/v1/plans/{planKey}/features"
	SubscriptionPlanProducts                   GatewayTargetPath = "/v1/plans/{planKey}/products"
	SubscriptionOwnerPolicies                  GatewayTargetPath = "/v1/owner-policies"
	SubscriptionOwnerPolicy                    GatewayTargetPath = "/v1/owner-policies/{ownerType}"
	SubscriptionApplicationAvailableFeatures   GatewayTargetPath = "/v1/applications/{applicationId}/available-product-features"
	SubscriptionApplicationSubscriptions       GatewayTargetPath = "/v1/applications/{applicationId}/subscriptions"
	SubscriptionApplicationSubscriptionCurrent GatewayTargetPath = "/v1/applications/{applicationId}/subscriptions/current"
	SubscriptionOwnerSubscriptions             GatewayTargetPath = "/v1/owners/{ownerType}/{ownerId}/subscriptions"
	SubscriptionOwnerSubscriptionCurrent       GatewayTargetPath = "/v1/owners/{ownerType}/{ownerId}/subscriptions/current"
	SubscriptionOwnerEntitlements              GatewayTargetPath = "/v1/owners/{ownerType}/{ownerId}/entitlements"
	SubscriptionPlanChangesApplyDue            GatewayTargetPath = "/v1/subscriptions/plan-changes/apply-due"
	SubscriptionPlanChangePaymentResult        GatewayTargetPath = "/v1/subscriptions/plan-changes/{planChangeId}/payment-result"
	SubscriptionRecord                         GatewayTargetPath = "/v1/subscriptions/{subscriptionId}"
	SubscriptionRecordCancel                   GatewayTargetPath = "/v1/subscriptions/{subscriptionId}/cancel"
	SubscriptionRecordReactivate               GatewayTargetPath = "/v1/subscriptions/{subscriptionId}/reactivate"
	SubscriptionRecordChangePlan               GatewayTargetPath = "/v1/subscriptions/{subscriptionId}/change-plan"
	SubscriptionRecordCheckout                 GatewayTargetPath = "/v1/subscriptions/{subscriptionId}/checkout"
	SubscriptionRecordPlanChanges              GatewayTargetPath = "/v1/subscriptions/{subscriptionId}/plan-changes"
	SubscriptionRecordBillingEvents            GatewayTargetPath = "/v1/subscriptions/{subscriptionId}/billing-events"
	SubscriptionApplicationEntitlements        GatewayTargetPath = "/v1/applications/{applicationId}/entitlements"

	PermissionSubscriptionProductRead           GatewayPermissionName = "subscription.product.read"
	PermissionSubscriptionProductManage         GatewayPermissionName = "subscription.product.manage"
	PermissionSubscriptionPlanRead              GatewayPermissionName = "subscription.plan.read"
	PermissionSubscriptionPlanManage            GatewayPermissionName = "subscription.plan.manage"
	PermissionSubscriptionAvailableFeaturesRead GatewayPermissionName = "subscription.available_features.read"
	PermissionSubscriptionSubscriptionRead      GatewayPermissionName = "subscription.subscription.read"
	PermissionSubscriptionSubscriptionManage    GatewayPermissionName = "subscription.subscription.manage"
	PermissionSubscriptionEntitlementRead       GatewayPermissionName = "subscription.entitlement.read"

	ResourceSubscription GatewayResourceType = "subscription"
	ResourcePlanChange   GatewayResourceType = "subscription_plan_change"
	ResourcePlan         GatewayResourceType = "subscription_plan"
	ResourceProduct      GatewayResourceType = "subscription_product"
	ResourceFeature      GatewayResourceType = "subscription_feature"

	ParamSubscriptionId GatewayResourceIDParam = "subscriptionId"
	ParamPlanChangeId   GatewayResourceIDParam = "planChangeId"
	ParamOwnerType      GatewayResourceIDParam = "ownerType"
	ParamOwnerId        GatewayResourceIDParam = "ownerId"
	ParamPlanKey        GatewayResourceIDParam = "planKey"
	ParamProductKey     GatewayResourceIDParam = "productKey"
	ParamFeatureKey     GatewayResourceIDParam = "featureKey"
)

const (
	// Wallet Service API Gateways
	Wallets                       GatewayTargetPath = "/v1/wallets"
	WalletsWalletId               GatewayTargetPath = "/v1/wallets/{walletId}"
	WalletsWalletIdLinkedAccounts GatewayTargetPath = "/v1/wallets/{walletId}/linked-accounts"
	WalletsWalletIdBalance        GatewayTargetPath = "/v1/wallets/{walletId}/balance"
	WalletsWalletIdTransactions   GatewayTargetPath = "/v1/wallets/{walletId}/transactions"
	WalletsTransfer               GatewayTargetPath = "/v1/wallets/transfer"
	WalletsReverse                GatewayTargetPath = "/v1/wallets/reverse"
	WalletsAdjustment             GatewayTargetPath = "/v1/wallets/adjustment"
	WalletTransactions            GatewayTargetPath = "/v1/transactions/{transactionId}"

	PermissionWalletCreate          GatewayPermissionName = "wallet.create"
	PermissionWalletSearch          GatewayPermissionName = "wallet.search"
	PermissionWalletRead            GatewayPermissionName = "wallet.read"
	PermissionWalletTransfer        GatewayPermissionName = "wallet.transfer"
	PermissionWalletReverse         GatewayPermissionName = "wallet.reverse"
	PermissionWalletAdjustment      GatewayPermissionName = "wallet.adjustment"
	PermissionWalletTransactionRead GatewayPermissionName = "wallet.transaction.read"

	ResourceWallet      GatewayResourceType = "wallet"
	ResourceTransaction GatewayResourceType = "wallet_transaction"

	ParamWalletId      GatewayResourceIDParam = "walletId"
	ParamTransactionId GatewayResourceIDParam = "transactionId"
)

const (
	// Transfer Service API Gateways
	Transfers GatewayTargetPath = "/v1/transfers"

	PermissionTransferCreate GatewayPermissionName = "transfer.create"
)

const (
	// Pricing Service API Gateways
	PricingPlatformFee        GatewayTargetPath = "/v1/pricing/policies/platform-fee"
	PricingPlatformFeePreview GatewayTargetPath = "/v1/pricing/policies/platform-fee/preview"

	PermissionPricingPolicyRead   GatewayPermissionName = "pricing.policy.read"
	PermissionPricingPolicyUpdate GatewayPermissionName = "pricing.policy.update"
)

const (
	// Usage Limits Service API Gateways
	UsageLimitsCheck              GatewayTargetPath = "/v1/usage-limits/check"
	UsageLimitsReservations       GatewayTargetPath = "/v1/usage-limits/reservations"
	UsageLimitsReservationConfirm GatewayTargetPath = "/v1/usage-limits/reservations/{reservationId}/confirm"
	UsageLimitsReservationRelease GatewayTargetPath = "/v1/usage-limits/reservations/{reservationId}/release"
	UsageLimitsIncrement          GatewayTargetPath = "/v1/usage-limits/increment"
	UsageLimitsDecrement          GatewayTargetPath = "/v1/usage-limits/decrement"
	UsageLimitsOwnerSummary       GatewayTargetPath = "/v1/usage-limits/owners/{ownerType}/{ownerId}"

	PermissionUsageLimitRead   GatewayPermissionName = "usage_limit.read"
	PermissionUsageLimitManage GatewayPermissionName = "usage_limit.manage"

	ResourceUsageLimit GatewayResourceType = "usage_limit"
)

const (
	// Authorisation Service API Gateways
	AuthorisationAuthorise                          GatewayTargetPath = "/v1/authorisation/authorise"
	AuthorisationAuthorize                          GatewayTargetPath = "/v1/authorisation/authorize"
	AuthorisationPermissions                        GatewayTargetPath = "/v1/authorisation/permissions"
	AuthorisationPermissionsPermissionId            GatewayTargetPath = "/v1/authorisation/permissions/{permissionId}"
	AuthorisationResources                          GatewayTargetPath = "/v1/authorisation/resources"
	AuthorisationRoles                              GatewayTargetPath = "/v1/authorisation/roles"
	AuthorisationRolesRoleId                        GatewayTargetPath = "/v1/authorisation/roles/{roleId}"
	AuthorisationRolesRoleIdPermissions             GatewayTargetPath = "/v1/authorisation/roles/{roleId}/permissions"
	AuthorisationRolesRoleIdPermissionsPermissionId GatewayTargetPath = "/v1/authorisation/roles/{roleId}/permissions/{permissionId}"
	AuthorisationUsersUserIdEffectivePermissions    GatewayTargetPath = "/v1/authorisation/users/{userId}/effective-permissions"
	AuthorisationUsersUserIdPermissions             GatewayTargetPath = "/v1/authorisation/users/{userId}/permissions"
	AuthorisationUsersUserIdPermissionsAssignmentId GatewayTargetPath = "/v1/authorisation/users/{userId}/permissions/{assignmentId}"
	AuthorisationUsersUserIdRoles                   GatewayTargetPath = "/v1/authorisation/users/{userId}/roles"
	AuthorisationUsersUserIdRolesAssignmentId       GatewayTargetPath = "/v1/authorisation/users/{userId}/roles/{assignmentId}"

	PermissionAuthorisationAuthorize            GatewayPermissionName = "authorisation.authorize"
	PermissionAuthorisationPermissionCreate     GatewayPermissionName = "authorisation.permission.create"
	PermissionAuthorisationPermissionRead       GatewayPermissionName = "authorisation.permission.read"
	PermissionAuthorisationPermissionUpdate     GatewayPermissionName = "authorisation.permission.update"
	PermissionAuthorisationResourceCreate       GatewayPermissionName = "authorisation.resource.create"
	PermissionAuthorisationResourceRead         GatewayPermissionName = "authorisation.resource.read"
	PermissionAuthorisationRoleCreate           GatewayPermissionName = "authorisation.role.create"
	PermissionAuthorisationRolePermissionAssign GatewayPermissionName = "authorisation.role.permission.assign"
	PermissionAuthorisationRolePermissionRead   GatewayPermissionName = "authorisation.role.permission.read"
	PermissionAuthorisationRolePermissionRemove GatewayPermissionName = "authorisation.role.permission.remove"
	PermissionAuthorisationRoleRead             GatewayPermissionName = "authorisation.role.read"
	PermissionAuthorisationRoleUpdate           GatewayPermissionName = "authorisation.role.update"
	PermissionAuthorisationUserPermissionAssign GatewayPermissionName = "authorisation.user.permission.assign"
	PermissionAuthorisationUserPermissionRead   GatewayPermissionName = "authorisation.user.permission.read"
	PermissionAuthorisationUserPermissionRemove GatewayPermissionName = "authorisation.user.permission.remove"
	PermissionAuthorisationUserRoleAssign       GatewayPermissionName = "authorisation.user.role.assign"
	PermissionAuthorisationUserRoleRead         GatewayPermissionName = "authorisation.user.role.read"
	PermissionAuthorisationUserRoleRemove       GatewayPermissionName = "authorisation.user.role.remove"

	ResourcePermission GatewayResourceType = "permission"
	ResourceRole       GatewayResourceType = "role"

	ParamPermissionId GatewayResourceIDParam = "permissionId"
	ParamRoleId       GatewayResourceIDParam = "roleId"
)

func GatewayResourceCatalog() map[GatewayPermissionName]GatewayResourceDefinition {
	return map[GatewayPermissionName]GatewayResourceDefinition{
		PermissionAcademyCreate:                      createGatewayResource(PermissionAcademyCreate, AcademiesPath),
		PermissionAcademyDelete:                      createGatewayResource(PermissionAcademyDelete, AcademyPath),
		PermissionAcademyMemberAssign:                createGatewayResource(PermissionAcademyMemberAssign, AcademiesAcademyIdMembers),
		PermissionAcademyMemberRead:                  createGatewayResource(PermissionAcademyMemberRead, AcademiesAcademyIdMembers),
		PermissionAcademyMemberRemove:                createGatewayResource(PermissionAcademyMemberRemove, AcademiesAcademyIdMembersUserId),
		PermissionAcademyMembershipAssign:            createGatewayResource(PermissionAcademyMembershipAssign, Memberships),
		PermissionAcademyMembershipRead:              createGatewayResource(PermissionAcademyMembershipRead, Memberships),
		PermissionAcademyMembershipRemove:            createGatewayResource(PermissionAcademyMembershipRemove, MembershipsMembershipId),
		PermissionAcademySearchHide:                  createGatewayResource(PermissionAcademySearchHide, AcademiesAcademyIdSearchHide),
		PermissionAcademyUpdate:                      createGatewayResource(PermissionAcademyUpdate, AcademyPath),
		PermissionAccountRead:                        createGatewayResource(PermissionAccountRead, AccountsAccountId),
		PermissionAccountUpdate:                      createGatewayResource(PermissionAccountUpdate, AccountsAccountId),
		PermissionAuthMfaUpdate:                      createGatewayResource(PermissionAuthMfaUpdate, AuthMfaSetup),
		PermissionAuthPasswordUpdate:                 createGatewayResource(PermissionAuthPasswordUpdate, AuthChangePassword),
		PermissionAuthSessionDelete:                  createGatewayResource(PermissionAuthSessionDelete, AuthSessionsSessionId),
		PermissionAuthSessionRead:                    createGatewayResource(PermissionAuthSessionRead, AuthSessions),
		PermissionUserCreate:                         createGatewayResource(PermissionUserCreate, Users),
		PermissionUserDelete:                         createGatewayResource(PermissionUserDelete, UsersUserId),
		PermissionUserRead:                           createGatewayResource(PermissionUserRead, UsersUserId),
		PermissionUserSearch:                         createGatewayResource(PermissionUserSearch, Users),
		PermissionUserUpdate:                         createGatewayResource(PermissionUserUpdate, UsersUserId),
		PermissionOrganisationApplicationRead:        createGatewayResource(PermissionOrganisationApplicationRead, ApplicationsApplicationId),
		PermissionOrganisationApplicationSearch:      createGatewayResource(PermissionOrganisationApplicationSearch, Applications),
		PermissionOrganisationCreate:                 createGatewayResource(PermissionOrganisationCreate, Organisations),
		PermissionOrganisationRead:                   createGatewayResource(PermissionOrganisationRead, OrganisationsOrganisationId),
		PermissionOrganisationSearch:                 createGatewayResource(PermissionOrganisationSearch, Organisations),
		PermissionOrganisationUpdate:                 createGatewayResource(PermissionOrganisationUpdate, OrganisationsOrganisationId),
		PermissionCourseActivityCreate:               createGatewayResource(PermissionCourseActivityCreate, CoursesCourseIdActivities),
		PermissionCourseActivityDelete:               createGatewayResource(PermissionCourseActivityDelete, ActivitiesActivityId),
		PermissionCourseActivityRead:                 createGatewayResource(PermissionCourseActivityRead, CoursesCourseIdActivities),
		PermissionCourseActivityUpdate:               createGatewayResource(PermissionCourseActivityUpdate, ActivitiesActivityId),
		PermissionCourseCreate:                       createGatewayResource(PermissionCourseCreate, CoursesPath),
		PermissionCourseDelete:                       createGatewayResource(PermissionCourseDelete, CoursePath),
		PermissionCourseTypeCreate:                   createGatewayResource(PermissionCourseTypeCreate, CourseTypesPath),
		PermissionCourseTypeDelete:                   createGatewayResource(PermissionCourseTypeDelete, CourseTypePath),
		PermissionCourseTypeUpdate:                   createGatewayResource(PermissionCourseTypeUpdate, CourseTypePath),
		PermissionCourseUpdate:                       createGatewayResource(PermissionCourseUpdate, CoursePath),
		PermissionBookingCancel:                      createGatewayResource(PermissionBookingCancel, BookingsBookingIdCancel),
		PermissionBookingComplete:                    createGatewayResource(PermissionBookingComplete, BookingsBookingIdComplete),
		PermissionBookingConfirm:                     createGatewayResource(PermissionBookingConfirm, BookingsBookingIdConfirm),
		PermissionBookingCreate:                      createGatewayResource(PermissionBookingCreate, Bookings),
		PermissionBookingParticipantAttendanceRecord: createGatewayResource(PermissionBookingParticipantAttendanceRecord, BookingsBookingIdParticipantsParticipantIdAttendance),
		PermissionBookingParticipantCreate:           createGatewayResource(PermissionBookingParticipantCreate, BookingsBookingIdParticipants),
		PermissionBookingParticipantRead:             createGatewayResource(PermissionBookingParticipantRead, BookingsBookingIdParticipants),
		PermissionBookingPaymentLink:                 createGatewayResource(PermissionBookingPaymentLink, BookingsBookingIdPaymentLink),
		PermissionBookingPaymentRecord:               createGatewayResource(PermissionBookingPaymentRecord, BookingsBookingIdPaymentReceived),
		PermissionBookingRead:                        createGatewayResource(PermissionBookingRead, BookingsBookingId),
		PermissionPaymentAccountConnect:              createGatewayResource(PermissionPaymentAccountConnect, PaymentAccountsStripeConnect),
		PermissionPaymentAccountDisconnect:           createGatewayResource(PermissionPaymentAccountDisconnect, PaymentAccountsStripeDisconnect),
		PermissionPaymentAccountRead:                 createGatewayResource(PermissionPaymentAccountRead, PaymentAccountsStripe),
		PermissionPaymentCancel:                      createGatewayResource(PermissionPaymentCancel, PaymentsPaymentIdCancel),
		PermissionPaymentCapture:                     createGatewayResource(PermissionPaymentCapture, PaymentsPaymentIdCapture),
		PermissionPaymentCheckoutCreate:              createGatewayResource(PermissionPaymentCheckoutCreate, Checkouts),
		PermissionPaymentClientCreate:                createGatewayResource(PermissionPaymentClientCreate, Clients),
		PermissionPaymentCreate:                      createGatewayResource(PermissionPaymentCreate, Payments),
		PermissionPaymentSubscriptionCreate:          createGatewayResource(PermissionPaymentSubscriptionCreate, PaymentBillingSubscriptions),
		PermissionPaymentSubscriptionManage:          createGatewayResource(PermissionPaymentSubscriptionManage, PaymentBillingSubscriptionsIdCancel),
		PermissionPaymentSubscriptionRead:            createGatewayResource(PermissionPaymentSubscriptionRead, PaymentBillingSubscriptionsId),
		PermissionPaymentPayeeBalanceRead:            createGatewayResource(PermissionPaymentPayeeBalanceRead, PayeesPayeeIdBalances),
		PermissionPaymentRead:                        createGatewayResource(PermissionPaymentRead, PaymentsPaymentId),
		PermissionPaymentRefundCreate:                createGatewayResource(PermissionPaymentRefundCreate, PaymentsPaymentIdRefunds),
		PermissionPaymentRefundRead:                  createGatewayResource(PermissionPaymentRefundRead, PaymentsPaymentIdRefunds),
		PermissionPaymentSearch:                      createGatewayResource(PermissionPaymentSearch, Payments),
		PermissionPayoutRequestApprove:               createGatewayResource(PermissionPayoutRequestApprove, PayoutRequestsPayoutRequestIdApprove),
		PermissionPayoutRequestCancel:                createGatewayResource(PermissionPayoutRequestCancel, PayoutRequestsPayoutRequestIdCancel),
		PermissionPayoutRequestCreate:                createGatewayResource(PermissionPayoutRequestCreate, PayeesPayeeIdPayoutRequests),
		PermissionPayoutRequestHold:                  createGatewayResource(PermissionPayoutRequestHold, PayoutRequestsPayoutRequestIdHold),
		PermissionPayoutRequestMarkPaid:              createGatewayResource(PermissionPayoutRequestMarkPaid, PayoutRequestsPayoutRequestIdMarkPaid),
		PermissionPayoutRequestRead:                  createGatewayResource(PermissionPayoutRequestRead, PayoutRequestsPayoutRequestId),
		PermissionPayoutRequestReject:                createGatewayResource(PermissionPayoutRequestReject, PayoutRequestsPayoutRequestIdReject),
		PermissionPayoutRequestRelease:               createGatewayResource(PermissionPayoutRequestRelease, PayoutRequestsPayoutRequestIdRelease),
		PermissionPayoutRequestSearch:                createGatewayResource(PermissionPayoutRequestSearch, PayoutRequests),
		PermissionAuthorisationAuthorize:             createGatewayResource(PermissionAuthorisationAuthorize, AuthorisationAuthorize),
		PermissionAuthorisationPermissionCreate:      createGatewayResource(PermissionAuthorisationPermissionCreate, AuthorisationPermissions),
		PermissionAuthorisationPermissionRead:        createGatewayResource(PermissionAuthorisationPermissionRead, AuthorisationPermissions),
		PermissionAuthorisationPermissionUpdate:      createGatewayResource(PermissionAuthorisationPermissionUpdate, AuthorisationPermissionsPermissionId),
		PermissionAuthorisationResourceCreate:        createGatewayResource(PermissionAuthorisationResourceCreate, AuthorisationResources),
		PermissionAuthorisationResourceRead:          createGatewayResource(PermissionAuthorisationResourceRead, AuthorisationResources),
		PermissionAuthorisationRoleCreate:            createGatewayResource(PermissionAuthorisationRoleCreate, AuthorisationRoles),
		PermissionAuthorisationRolePermissionAssign:  createGatewayResource(PermissionAuthorisationRolePermissionAssign, AuthorisationRolesRoleIdPermissions),
		PermissionAuthorisationRolePermissionRead:    createGatewayResource(PermissionAuthorisationRolePermissionRead, AuthorisationRolesRoleIdPermissions),
		PermissionAuthorisationRolePermissionRemove:  createGatewayResource(PermissionAuthorisationRolePermissionRemove, AuthorisationRolesRoleIdPermissionsPermissionId),
		PermissionAuthorisationRoleRead:              createGatewayResource(PermissionAuthorisationRoleRead, AuthorisationRolesRoleId),
		PermissionAuthorisationRoleUpdate:            createGatewayResource(PermissionAuthorisationRoleUpdate, AuthorisationRolesRoleId),
		PermissionAuthorisationUserPermissionAssign:  createGatewayResource(PermissionAuthorisationUserPermissionAssign, AuthorisationUsersUserIdPermissions),
		PermissionAuthorisationUserPermissionRead:    createGatewayResource(PermissionAuthorisationUserPermissionRead, AuthorisationUsersUserIdPermissions),
		PermissionAuthorisationUserPermissionRemove:  createGatewayResource(PermissionAuthorisationUserPermissionRemove, AuthorisationUsersUserIdPermissionsAssignmentId),
		PermissionAuthorisationUserRoleAssign:        createGatewayResource(PermissionAuthorisationUserRoleAssign, AuthorisationUsersUserIdRoles),
		PermissionAuthorisationUserRoleRead:          createGatewayResource(PermissionAuthorisationUserRoleRead, AuthorisationUsersUserIdRoles),
		PermissionAuthorisationUserRoleRemove:        createGatewayResource(PermissionAuthorisationUserRoleRemove, AuthorisationUsersUserIdRolesAssignmentId),
		PermissionSubscriptionProductRead:            createGatewayResource(PermissionSubscriptionProductRead, SubscriptionProducts),
		PermissionSubscriptionProductManage:          createGatewayResource(PermissionSubscriptionProductManage, SubscriptionProducts),
		PermissionSubscriptionPlanRead:               createGatewayResource(PermissionSubscriptionPlanRead, SubscriptionPlans),
		PermissionSubscriptionPlanManage:             createGatewayResource(PermissionSubscriptionPlanManage, SubscriptionPlans),
		PermissionSubscriptionAvailableFeaturesRead:  createGatewayResource(PermissionSubscriptionAvailableFeaturesRead, SubscriptionApplicationAvailableFeatures),
		PermissionSubscriptionSubscriptionRead:       createGatewayResource(PermissionSubscriptionSubscriptionRead, SubscriptionApplicationSubscriptions),
		PermissionSubscriptionSubscriptionManage:     createGatewayResource(PermissionSubscriptionSubscriptionManage, SubscriptionApplicationSubscriptions),
		PermissionSubscriptionEntitlementRead:        createGatewayResource(PermissionSubscriptionEntitlementRead, SubscriptionApplicationEntitlements),
		PermissionWalletCreate:                       createGatewayResource(PermissionWalletCreate, Wallets),
		PermissionWalletSearch:                       createGatewayResource(PermissionWalletSearch, Wallets),
		PermissionWalletRead:                         createGatewayResource(PermissionWalletRead, WalletsWalletId, WalletsWalletIdLinkedAccounts),
		PermissionWalletTransfer:                     createGatewayResource(PermissionWalletTransfer, WalletsTransfer),
		PermissionWalletReverse:                      createGatewayResource(PermissionWalletReverse, WalletsReverse),
		PermissionWalletAdjustment:                   createGatewayResource(PermissionWalletAdjustment, WalletsAdjustment),
		PermissionWalletTransactionRead:              createGatewayResource(PermissionWalletTransactionRead, WalletTransactions),
		PermissionTransferCreate:                     createGatewayResource(PermissionTransferCreate, Transfers),
		PermissionPricingPolicyRead:                  createGatewayResource(PermissionPricingPolicyRead, PricingPlatformFee),
		PermissionPricingPolicyUpdate:                createGatewayResource(PermissionPricingPolicyUpdate, PricingPlatformFee),
		PermissionUsageLimitRead:                     createGatewayResource(PermissionUsageLimitRead, UsageLimitsOwnerSummary),
		PermissionUsageLimitManage:                   createGatewayResource(PermissionUsageLimitManage, UsageLimitsReservations),
	}
}

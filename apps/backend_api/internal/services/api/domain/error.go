package domain

const (
	ErrCodeAuthorisationUnavailable  = "authorisation_unavailable"
	ErrCodeNotAuthorised             = "not_authorised"
	ErrCodePermissionMappingNotFound = "permission_mapping_not_found"
	ErrCodeResourceNotResolved       = "resource_not_resolved"
	ErrCodeRouteNotFound             = "route_not_found"
	ErrCodeServiceNotConfigured      = "service_not_configured"
	ErrCodeSubscriptionRequired      = "SUBSCRIPTION_REQUIRED"
	ErrCodeSubscriptionUnavailable   = "subscription_unavailable"
	ErrCodePlanFeatureNotIncluded    = "PLAN_FEATURE_NOT_INCLUDED"
	ErrCodeUsageLimitExceeded        = "USAGE_LIMIT_EXCEEDED"
	ErrCodeUsageLimitsUnavailable    = "usage_limits_unavailable"

	ErrMessageAuthorisationUnavailable  = "Authorisation could not be completed."
	ErrMessageNotAuthorised             = "Not authorised."
	ErrMessagePermissionMappingNotFound = "No permission mapping is registered for this route."
	ErrMessageResourceNotResolved       = "Route resource could not be resolved."
	ErrMessageRouteNotFound             = "No API route is registered for this path."
	ErrMessageServiceNotConfigured      = "The target service is not configured."
	ErrMessageSubscriptionDenied        = "Subscription plan does not allow this feature."
	ErrMessageSubscriptionUnavailable   = "Subscription entitlement could not be completed."
	ErrMessageUsageLimitDenied          = "Usage limit does not allow this action."
	ErrMessageUsageLimitsUnavailable    = "Usage limit check could not be completed."
)

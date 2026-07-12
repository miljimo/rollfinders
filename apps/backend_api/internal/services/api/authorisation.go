package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"rollfinders/internal/services/api/domain"
)

const (
	actorUserIDHeader = domain.ActorUserIDHeader
)

type authoriseRequest struct {
	SubjectID      string `json:"subjectId"`
	Permission     string `json:"permission"`
	OrganisationID string `json:"organisationId,omitempty"`
	ApplicationID  string `json:"applicationId,omitempty"`
	ResourceID     string `json:"resourceId,omitempty"`
}

type authoriseResponse struct {
	Authorized bool   `json:"authorized"`
	Decision   string `json:"decision"`
}

type entitlementCheckRequest struct {
	OwnerType      string `json:"owner_type"`
	OwnerID        string `json:"owner_id"`
	FeatureKey     string `json:"feature_key"`
	SubjectID      string `json:"subject_id,omitempty"`
	Permission     string `json:"permission,omitempty"`
	OrganisationID string `json:"organisation_id,omitempty"`
	ApplicationID  string `json:"application_id,omitempty"`
	ResourceID     string `json:"resource_id,omitempty"`
	Route          string `json:"route,omitempty"`
	HTTPMethod     string `json:"http_method,omitempty"`
}

type entitlementCheckResponse struct {
	Allowed            bool       `json:"allowed"`
	Decision           string     `json:"decision"`
	Reason             string     `json:"reason"`
	PlanID             string     `json:"plan_id"`
	BillingPeriodStart *time.Time `json:"billing_period_start"`
	BillingPeriodEnd   *time.Time `json:"billing_period_end"`
	OwnerType          string     `json:"owner_type"`
	OwnerID            string     `json:"owner_id"`
	SubscriptionID     string     `json:"subscription_id"`
}

type usageReservationRequest struct {
	IdempotencyKey     string     `json:"idempotency_key"`
	OwnerType          string     `json:"owner_type"`
	OwnerID            string     `json:"owner_id"`
	SubscriptionPlanID string     `json:"subscription_plan_id,omitempty"`
	ResourceType       string     `json:"resource_type"`
	ActionKey          string     `json:"action_key"`
	Amount             int        `json:"amount"`
	PeriodType         string     `json:"period_type"`
	PeriodStart        *time.Time `json:"period_start,omitempty"`
	PeriodEnd          *time.Time `json:"period_end,omitempty"`
}

type usageReservationResponse struct {
	Allowed       bool   `json:"allowed"`
	ReservationID string `json:"reservation_id"`
	Decision      string `json:"decision"`
	Reason        string `json:"reason"`
}

func (s *server) authoriseRequest(w http.ResponseWriter, r *http.Request) bool {
	if isPublicInfrastructureRoute(r.URL.Path) {
		return true
	}
	match, ok := resolveRoute(r.Method, r.URL.Path)
	if !ok {
		writeError(w, r, http.StatusForbidden, domain.ErrCodePermissionMappingNotFound, domain.ErrMessagePermissionMappingNotFound, map[string]string{"path": r.URL.Path})
		return false
	}
	if match.Definition.Public {
		return true
	}
	permission := match.Definition.Permission

	subjectID := s.subjectIDFromRequest(r)
	if subjectID == "" {
		writeError(w, r, http.StatusUnauthorized, domain.ErrCodeNotAuthorised, domain.ErrMessageNotAuthorised, nil)
		return false
	}
	resourceID := ""
	if match.Definition.ResourceIDParam != "" {
		resourceID = strings.TrimSpace(match.Params[string(match.Definition.ResourceIDParam)])
		if resourceID == "" {
			writeError(w, r, http.StatusForbidden, domain.ErrCodeResourceNotResolved, domain.ErrMessageResourceNotResolved, map[string]string{"resourceIdParam": string(match.Definition.ResourceIDParam)})
			return false
		}
	}

	allowed, err := s.authorize(authoriseRequest{
		SubjectID:      subjectID,
		Permission:     string(permission),
		OrganisationID: organisationIDFrom(r),
		ApplicationID:  s.cfg.ApplicationID,
		ResourceID:     resourceID,
	})
	if err != nil {
		s.logger.Error("authorisation check failed", "request_id", requestIDFrom(r), "permission", permission, "error", err)
		writeError(w, r, http.StatusServiceUnavailable, domain.ErrCodeAuthorisationUnavailable, domain.ErrMessageAuthorisationUnavailable, nil)
		return false
	}
	if !allowed {
		writeError(w, r, http.StatusForbidden, domain.ErrCodeNotAuthorised, domain.ErrMessageNotAuthorised, map[string]string{"permission": string(permission)})
		return false
	}
	var entitlementResult entitlementCheckResponse
	if match.Definition.SubscriptionFeatureKey != "" {
		entitlementRequest := s.entitlementRequestFromRoute(r, match, subjectID, resourceID)
		result, err := s.checkEntitlement(entitlementRequest)
		if err != nil {
			s.logger.Error("subscription entitlement check failed", "request_id", requestIDFrom(r), "feature_key", entitlementRequest.FeatureKey, "error", err)
			writeError(w, r, http.StatusServiceUnavailable, domain.ErrCodeSubscriptionUnavailable, domain.ErrMessageSubscriptionUnavailable, nil)
			return false
		}
		entitlementResult = result
		if !result.Allowed || !strings.EqualFold(result.Decision, domain.DecisionAllow) {
			if result.Reason == "" {
				result.Reason = domain.ErrCodePlanFeatureNotIncluded
			}
			s.auditSubscriptionDenial(r, entitlementRequest, result.Reason)
			writeError(w, r, http.StatusForbidden, result.Reason, domain.ErrMessageSubscriptionDenied, map[string]string{
				"feature_key": entitlementRequest.FeatureKey,
				"owner_type":  entitlementRequest.OwnerType,
				"owner_id":    entitlementRequest.OwnerID,
			})
			return false
		}
	}
	if match.Definition.UsageResourceType != "" {
		reservationID, err := s.reserveUsage(r, match, resourceID, entitlementResult)
		if err != nil {
			s.logger.Error("usage limit reservation failed", "request_id", requestIDFrom(r), "error", err)
			writeError(w, r, http.StatusServiceUnavailable, domain.ErrCodeUsageLimitsUnavailable, domain.ErrMessageUsageLimitsUnavailable, nil)
			return false
		}
		if reservationID == "" {
			writeError(w, r, http.StatusForbidden, domain.ErrCodeUsageLimitExceeded, domain.ErrMessageUsageLimitDenied, map[string]string{
				"resource_type": string(match.Definition.UsageResourceType),
				"action_key":    string(match.Definition.UsageActionKey),
			})
			return false
		}
		r.Header.Set("X-Usage-Reservation-ID", reservationID)
	}
	return true
}

func (s *server) auditSubscriptionDenial(r *http.Request, checkRequest entitlementCheckRequest, reason string) {
	s.logger.Warn("subscription access denied",
		"request_id", requestIDFrom(r),
		"subject_id", checkRequest.SubjectID,
		"owner_type", checkRequest.OwnerType,
		"owner_id", checkRequest.OwnerID,
		"application_id", checkRequest.ApplicationID,
		"organisation_id", checkRequest.OrganisationID,
		"resource_id", checkRequest.ResourceID,
		"route", r.URL.Path,
		"http_method", r.Method,
		"permission", checkRequest.Permission,
		"feature_key", checkRequest.FeatureKey,
		"iam_decision", "allow",
		"subscription_decision", "deny",
		"final_decision", "deny",
		"reason", reason,
	)
}

func (s *server) authorize(authRequest authoriseRequest) (bool, error) {
	payload, err := json.Marshal(authRequest)
	if err != nil {
		return false, err
	}

	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequest(http.MethodPost, s.cfg.AuthorisationBaseURL+domain.AuthorisationAuthorizePath, bytes.NewReader(payload))
	if err != nil {
		return false, err
	}
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	req.Header.Set(actorUserIDHeader, authRequest.SubjectID)

	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return false, nil
	}

	var result authoriseResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}
	return result.Authorized && result.Decision == domain.DecisionAllow, nil
}

func (s *server) checkEntitlement(checkRequest entitlementCheckRequest) (entitlementCheckResponse, error) {
	payload, err := json.Marshal(checkRequest)
	if err != nil {
		return entitlementCheckResponse{}, err
	}

	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequest(http.MethodPost, s.cfg.SubscriptionBaseURL+domain.SubscriptionEntitlementCheckPath, bytes.NewReader(payload))
	if err != nil {
		return entitlementCheckResponse{}, err
	}
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	if checkRequest.SubjectID != "" {
		req.Header.Set(actorUserIDHeader, checkRequest.SubjectID)
	}

	resp, err := client.Do(req)
	if err != nil {
		return entitlementCheckResponse{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return entitlementCheckResponse{Allowed: false, Decision: "deny", Reason: domain.ErrCodeSubscriptionRequired}, nil
	}

	var result entitlementCheckResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return entitlementCheckResponse{}, err
	}
	return result, nil
}

func (s *server) reserveUsage(r *http.Request, match routeMatch, resourceID string, entitlement entitlementCheckResponse) (string, error) {
	ownerType, ownerID := usageOwnerFrom(r, match, resourceID, entitlement, s.cfg.ApplicationID)
	amount := match.Definition.UsageAmount
	if amount < 1 {
		amount = 1
	}
	periodType := string(match.Definition.UsagePeriodType)
	if periodType == "" {
		periodType = "lifetime"
	}
	body := usageReservationRequest{
		IdempotencyKey:     usageIdempotencyKey(r, match),
		OwnerType:          ownerType,
		OwnerID:            ownerID,
		SubscriptionPlanID: strings.TrimSpace(entitlement.PlanID),
		ResourceType:       string(match.Definition.UsageResourceType),
		ActionKey:          string(match.Definition.UsageActionKey),
		Amount:             amount,
		PeriodType:         periodType,
	}
	if periodType == "subscription_period" {
		body.PeriodStart = entitlement.BillingPeriodStart
		body.PeriodEnd = entitlement.BillingPeriodEnd
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequest(http.MethodPost, s.cfg.UsageLimitsBaseURL+domain.UsageLimitsReservationsPath, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	req.Header.Set(domain.IdempotencyHeader, body.IdempotencyKey)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result usageReservationResponse
	_ = json.NewDecoder(resp.Body).Decode(&result)
	if resp.StatusCode == http.StatusForbidden || !result.Allowed || !strings.EqualFold(result.Decision, domain.DecisionAllow) {
		return "", nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("usage limits returned %s", resp.Status)
	}
	if result.ReservationID == "" {
		return "", fmt.Errorf("usage limits did not return reservation id")
	}
	return result.ReservationID, nil
}

func usageOwnerFrom(r *http.Request, match routeMatch, resourceID string, entitlement entitlementCheckResponse, fallbackApplicationID string) (string, string) {
	if match.Definition.UsageOwnerType != "" {
		switch match.Definition.UsageOwnerType {
		case "academy":
			if match.Definition.ResourceType == ResourceAcademy && resourceID != "" {
				return "academy", resourceID
			}
		}
	}
	if entitlement.OwnerType != "" && entitlement.OwnerID != "" {
		return strings.ToLower(entitlement.OwnerType), entitlement.OwnerID
	}
	return subscriptionOwnerFrom(r, match, resourceID, fallbackApplicationID)
}

func usageIdempotencyKey(r *http.Request, match routeMatch) string {
	if value := strings.TrimSpace(r.Header.Get(domain.IdempotencyHeader)); value != "" {
		return value + ":" + string(match.Definition.UsageResourceType) + ":" + string(match.Definition.UsageActionKey)
	}
	return requestIDFrom(r) + ":" + r.Method + ":" + r.URL.Path + ":" + string(match.Definition.UsageResourceType) + ":" + string(match.Definition.UsageActionKey)
}

func (s *server) entitlementRequestFromRoute(r *http.Request, match routeMatch, subjectID string, resourceID string) entitlementCheckRequest {
	ownerType, ownerID := subscriptionOwnerFrom(r, match, resourceID, s.cfg.ApplicationID)
	return entitlementCheckRequest{
		OwnerType:      ownerType,
		OwnerID:        ownerID,
		FeatureKey:     string(match.Definition.SubscriptionFeatureKey),
		SubjectID:      subjectID,
		Permission:     string(match.Definition.Permission),
		OrganisationID: organisationIDFrom(r),
		ApplicationID:  s.cfg.ApplicationID,
		ResourceID:     resourceID,
		Route:          r.URL.Path,
		HTTPMethod:     r.Method,
	}
}

func subscriptionOwnerFrom(r *http.Request, match routeMatch, resourceID string, fallbackApplicationID string) (string, string) {
	ownerType := firstNonEmpty(
		r.Header.Get(domain.SubscriptionOwnerTypeHeader),
		r.URL.Query().Get(domain.QueryOwnerType),
		r.URL.Query().Get(domain.QueryOwnerTypeCamel),
	)
	ownerID := firstNonEmpty(
		r.Header.Get(domain.SubscriptionOwnerIDHeader),
		r.URL.Query().Get(domain.QueryOwnerID),
		r.URL.Query().Get(domain.QueryOwnerIDCamel),
	)
	if ownerType != "" && ownerID != "" {
		return strings.ToLower(ownerType), ownerID
	}
	switch match.Definition.ResourceType {
	case ResourceAcademy:
		return domain.OwnerTypeAcademy, resourceID
	case ResourceOrganisation:
		return domain.OwnerTypeOrganisation, resourceID
	case ResourceApplication:
		return domain.OwnerTypeApplication, resourceID
	case ResourceUser:
		return domain.OwnerTypePractitioner, resourceID
	default:
		return domain.OwnerTypeApplication, fallbackApplicationID
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if cleaned := strings.TrimSpace(value); cleaned != "" {
			return cleaned
		}
	}
	return ""
}

func organisationIDFrom(r *http.Request) string {
	for _, key := range []string{domain.OrganisationIDHeader, domain.OrganizationIDHeader} {
		if value := strings.TrimSpace(r.Header.Get(key)); value != "" {
			return value
		}
	}
	return strings.TrimSpace(r.URL.Query().Get(domain.QueryOrganisationID))
}

func isPublicInfrastructureRoute(path string) bool {
	return path == domain.RootPath || path == domain.OpenAPIPath || path == domain.HealthPath || path == domain.ReadyPath
}

func routeAuthMetadataGaps() []GatewayRouteDefinition {
	gaps := make([]GatewayRouteDefinition, 0)
	for _, route := range gatewayRoutes() {
		if route.Public {
			continue
		}
		if strings.TrimSpace(string(route.Permission)) == "" {
			gaps = append(gaps, route)
		}
	}
	return gaps
}

func isPublicGatewayRoute(method string, path string) bool {
	if isPublicInfrastructureRoute(path) {
		return true
	}
	match, ok := resolveRoute(method, path)
	return ok && match.Definition.Public
}

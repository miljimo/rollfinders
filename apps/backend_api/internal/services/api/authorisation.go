package api

import (
	"bytes"
	"encoding/json"
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
	Allowed  bool   `json:"allowed"`
	Decision string `json:"decision"`
	Reason   string `json:"reason"`
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
	if match.Definition.SubscriptionFeatureKey != "" {
		entitlementRequest := s.entitlementRequestFromRoute(r, match, subjectID, resourceID)
		allowed, reason, err := s.checkEntitlement(entitlementRequest)
		if err != nil {
			s.logger.Error("subscription entitlement check failed", "request_id", requestIDFrom(r), "feature_key", entitlementRequest.FeatureKey, "error", err)
			writeError(w, r, http.StatusServiceUnavailable, domain.ErrCodeSubscriptionUnavailable, domain.ErrMessageSubscriptionUnavailable, nil)
			return false
		}
		if !allowed {
			if reason == "" {
				reason = domain.ErrCodePlanFeatureNotIncluded
			}
			s.auditSubscriptionDenial(r, entitlementRequest, reason)
			writeError(w, r, http.StatusForbidden, reason, domain.ErrMessageSubscriptionDenied, map[string]string{
				"feature_key": entitlementRequest.FeatureKey,
				"owner_type":  entitlementRequest.OwnerType,
				"owner_id":    entitlementRequest.OwnerID,
			})
			return false
		}
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

func (s *server) checkEntitlement(checkRequest entitlementCheckRequest) (bool, string, error) {
	payload, err := json.Marshal(checkRequest)
	if err != nil {
		return false, "", err
	}

	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequest(http.MethodPost, s.cfg.SubscriptionBaseURL+domain.SubscriptionEntitlementCheckPath, bytes.NewReader(payload))
	if err != nil {
		return false, "", err
	}
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	if checkRequest.SubjectID != "" {
		req.Header.Set(actorUserIDHeader, checkRequest.SubjectID)
	}

	resp, err := client.Do(req)
	if err != nil {
		return false, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return false, domain.ErrCodeSubscriptionRequired, nil
	}

	var result entitlementCheckResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, "", err
	}
	return result.Allowed && strings.EqualFold(result.Decision, domain.DecisionAllow), result.Reason, nil
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

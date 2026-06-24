package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const (
	actorUserIDHeader = "X-Actor-User-ID"
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

func (s *server) authoriseRequest(w http.ResponseWriter, r *http.Request) bool {
	if isPublicInfrastructureRoute(r.URL.Path) {
		return true
	}
	match, ok := resolveRoute(r.Method, r.URL.Path)
	if !ok {
		writeError(w, r, http.StatusForbidden, "permission_mapping_not_found", "No permission mapping is registered for this route.", map[string]string{"path": r.URL.Path})
		return false
	}
	if match.Definition.Public {
		return true
	}
	permission := match.Definition.Permission

	subjectID := s.subjectIDFromRequest(r)
	if subjectID == "" {
		writeError(w, r, http.StatusUnauthorized, "not_authorised", "Not authorised.", nil)
		return false
	}
	resourceID := ""
	if match.Definition.ResourceIDParam != "" {
		resourceID = strings.TrimSpace(match.Params[string(match.Definition.ResourceIDParam)])
		if resourceID == "" {
			writeError(w, r, http.StatusForbidden, "resource_not_resolved", "Route resource could not be resolved.", map[string]string{"resourceIdParam": string(match.Definition.ResourceIDParam)})
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
		writeError(w, r, http.StatusServiceUnavailable, "authorisation_unavailable", "Authorisation could not be completed.", nil)
		return false
	}
	if !allowed {
		writeError(w, r, http.StatusForbidden, "not_authorised", "Not authorised.", map[string]string{"permission": string(permission)})
		return false
	}
	return true
}

func (s *server) authorize(authRequest authoriseRequest) (bool, error) {
	payload, err := json.Marshal(authRequest)
	if err != nil {
		return false, err
	}

	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequest(http.MethodPost, s.cfg.AuthorisationBaseURL+"/v1/authorize", bytes.NewReader(payload))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")
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
	return result.Authorized && result.Decision == "allow", nil
}

func organisationIDFrom(r *http.Request) string {
	for _, key := range []string{"X-Organisation-ID", "X-Organization-ID"} {
		if value := strings.TrimSpace(r.Header.Get(key)); value != "" {
			return value
		}
	}
	return strings.TrimSpace(r.URL.Query().Get("organisationId"))
}

func isPublicInfrastructureRoute(path string) bool {
	return path == "/" || path == "/openapi.json" || path == "/healthz" || path == "/readyz"
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

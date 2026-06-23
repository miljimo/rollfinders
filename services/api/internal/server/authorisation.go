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
	ResourceType   string `json:"resourceType,omitempty"`
	ResourceID     string `json:"resourceId,omitempty"`
}

type authoriseResponse struct {
	Authorized bool   `json:"authorized"`
	Decision   string `json:"decision"`
}

func (s *server) authoriseRequest(w http.ResponseWriter, r *http.Request) bool {
	if isPublicGatewayRoute(r.Method, r.URL.Path) || strings.HasPrefix(r.URL.Path, "/v1/authorisation") {
		return true
	}
	match, ok := resolveRoute(r.Method, r.URL.Path)
	if !ok {
		writeError(w, r, http.StatusForbidden, "permission_mapping_not_found", "No permission mapping is registered for this route.", map[string]string{"path": r.URL.Path})
		return false
	}
	permission := match.Definition.Permission

	subjectID := strings.TrimSpace(r.Header.Get(actorUserIDHeader))
	if subjectID == "" {
		writeError(w, r, http.StatusUnauthorized, "not_authorised", "Not authorised.", nil)
		return false
	}
	if isSelfAccountRead(r, subjectID) {
		return true
	}

	resourceID := ""
	if match.Definition.ResourceIDParam != "" {
		resourceID = strings.TrimSpace(match.Params[match.Definition.ResourceIDParam])
		if resourceID == "" {
			writeError(w, r, http.StatusForbidden, "resource_not_resolved", "Route resource could not be resolved.", map[string]string{"resourceType": match.Definition.ResourceType})
			return false
		}
	}

	allowed, err := s.authorize(authoriseRequest{
		SubjectID:      subjectID,
		Permission:     permission,
		OrganisationID: organisationIDFrom(r),
		ApplicationID:  s.cfg.ApplicationID,
		ResourceType:   match.Definition.ResourceType,
		ResourceID:     resourceID,
	})
	if err != nil {
		s.logger.Error("authorisation check failed", "request_id", requestIDFrom(r), "permission", permission, "error", err)
		writeError(w, r, http.StatusServiceUnavailable, "authorisation_unavailable", "Authorisation could not be completed.", nil)
		return false
	}
	if !allowed {
		writeError(w, r, http.StatusForbidden, "not_authorised", "Not authorised.", map[string]string{"permission": permission})
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

func isSelfAccountRead(r *http.Request, subjectID string) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}
	accountID, ok := strings.CutPrefix(strings.Trim(r.URL.Path, "/"), "v1/accounts/")
	return ok && accountID == subjectID
}

func isPublicGatewayRoute(method string, path string) bool {
	if path == "/" || path == "/healthz" || path == "/readyz" {
		return true
	}
	if method == http.MethodGet && isPublicCatalogRoute(path) {
		return true
	}
	if strings.HasPrefix(path, "/auth/login") ||
		strings.HasPrefix(path, "/auth/forgot-password") ||
		strings.HasPrefix(path, "/auth/reset-password") ||
		strings.HasPrefix(path, "/v1/auth/password-reset/") {
		return true
	}
	return method == http.MethodGet && strings.Contains(path, "/callbacks/")
}

func isPublicCatalogRoute(path string) bool {
	return path == "/v1/academies" ||
		strings.HasPrefix(path, "/v1/academies/") ||
		path == "/v1/courses" ||
		strings.HasPrefix(path, "/v1/courses/") ||
		path == "/v1/course-types" ||
		strings.HasPrefix(path, "/v1/course-types/")
}

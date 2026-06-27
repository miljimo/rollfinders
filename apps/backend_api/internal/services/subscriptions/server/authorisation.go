package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type authorisationClient struct {
	baseURL string
	client  *http.Client
}

type authorisationPermission struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

type authorisationPermissionsResponse struct {
	Permissions []authorisationPermission `json:"permissions"`
}

type bootstrapProductCandidate struct {
	ServiceKey  string                    `json:"service_key"`
	Name        string                    `json:"name"`
	Candidate   bool                      `json:"candidate"`
	Permissions []authorisationPermission `json:"permissions"`
}

func (c authorisationClient) listPermissions(ctx context.Context) ([]authorisationPermission, error) {
	if c.baseURL == "" {
		return nil, errNotFound
	}
	client := c.client
	if client == nil {
		client = http.DefaultClient
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/permissions?limit=100", nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errNotFound
	}
	var result authorisationPermissionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Permissions, nil
}

func bootstrapCandidatesFromPermissions(permissions []authorisationPermission) []bootstrapProductCandidate {
	grouped := map[string][]authorisationPermission{}
	for _, permission := range permissions {
		code := strings.TrimSpace(permission.Code)
		if code == "" {
			continue
		}
		prefix := code
		if idx := strings.Index(code, "."); idx > 0 {
			prefix = code[:idx]
		}
		grouped[prefix] = append(grouped[prefix], permission)
	}
	candidates := make([]bootstrapProductCandidate, 0, len(grouped))
	for serviceKey, items := range grouped {
		candidates = append(candidates, bootstrapProductCandidate{
			ServiceKey:  serviceKey,
			Name:        candidateName(serviceKey),
			Candidate:   true,
			Permissions: items,
		})
	}
	return candidates
}

func candidateName(serviceKey string) string {
	if serviceKey == "" {
		return "Draft product area"
	}
	return strings.ToUpper(serviceKey[:1]) + strings.ReplaceAll(serviceKey[1:], "_", " ")
}

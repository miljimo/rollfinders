package server

import "net/http"

type apiRouteDoc struct {
	Method          string `json:"method"`
	Path            string `json:"path"`
	Service         string `json:"service"`
	Authentication  string `json:"authentication"`
	Permission      string `json:"permission,omitempty"`
	ResourceIDParam string `json:"resourceIdParam,omitempty"`
	Notes           string `json:"notes,omitempty"`
}

func (s *server) docs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"name":        "RollFinders API",
		"description": "Public orchestration gateway, mobile, and service clients.",
		"version":     "v1",
		"principles": []string{
			"Frontend clients call this API instead of domain services directly.",
			"Domain services own business data and state transitions.",
			"The API service owns cross-service orchestration and edge authorization.",
			"Service-to-service API keys are not required; authorization is enforced at the orchestration layer.",
		},
		"health": map[string]string{
			"healthz": "/healthz",
			"readyz":  "/readyz",
		},
		"routes": apiRouteDocs(),
	})
}

func apiRouteDocs() []apiRouteDoc {
	docs := []apiRouteDoc{
		{Method: http.MethodGet, Path: "/", Service: "api", Authentication: "public", Notes: "API documentation."},
		{Method: http.MethodGet, Path: "/healthz", Service: "api", Authentication: "public", Notes: "Liveness check."},
		{Method: http.MethodGet, Path: "/readyz", Service: "api", Authentication: "public", Notes: "Readiness check."},
		{Method: "*", Path: "/auth/*", Service: "user-service", Authentication: "public", Notes: "Authentication endpoints proxied to Users Service."},
		{Method: "*", Path: "/v1/auth/password-reset/*", Service: "user-service", Authentication: "public", Notes: "Password reset endpoints proxied to Users Service."},
		{Method: "*", Path: "/v1/authorisation/*", Service: "authorisation-service", Authentication: "required", Notes: "Forwarded to Authorisation Service with /v1/authorisation rewritten to /v1."},
		{Method: "*", Path: "/legacy/*", Service: "legacy-next-api", Authentication: "route-policy", Notes: "Temporary compatibility route for orchestration still living in TypeScript."},
	}
	for _, route := range gatewayRoutes() {
		auth := "required"
		if route.Public {
			auth = "public"
		}
		docs = append(docs, apiRouteDoc{
			Method:          route.Method,
			Path:            string(route.Path),
			Service:         string(route.Service),
			Authentication:  auth,
			Permission:      string(route.Permission),
			ResourceIDParam: string(route.ResourceIDParam),
		})
	}
	return docs
}

package server

import "net/http"

func (s *server) docs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"name":        "RollFinders API",
		"description": "Public orchestration gateway for RollFinders web, mobile, and service clients.",
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
		"routes": []map[string]string{
			{"path": "/auth/*", "service": "Users Service", "permission_owner": "user.auth"},
			{"path": "/v1/auth/*", "service": "Users Service", "permission_owner": "user.auth"},
			{"path": "/v1/accounts/*", "service": "Users Service", "permission_owner": "user.account"},
			{"path": "/v1/users/*", "service": "Users Service", "permission_owner": "user.*"},
			{"path": "/v1/authorisation/*", "service": "Authorisation Service", "permission_owner": "authorisation.*", "notes": "Strips /v1/authorisation before forwarding."},
			{"path": "/v1/academies/*", "service": "Academy Service", "permission_owner": "academy.*"},
			{"path": "/v1/organisations/*", "service": "Organisation Service", "permission_owner": "organisation.*"},
			{"path": "/v1/applications/*", "service": "Organisation Service", "permission_owner": "organisation.*"},
			{"path": "/v1/courses/*", "service": "Courses Service", "permission_owner": "course.*"},
			{"path": "/v1/course-types/*", "service": "Courses Service", "permission_owner": "course.*"},
			{"path": "/v1/bookings/*", "service": "Booking Service", "permission_owner": "booking.*"},
			{"path": "/v1/payments/*", "service": "Payments Service", "permission_owner": "payment.*"},
			{"path": "/v1/checkouts/*", "service": "Payments Service", "permission_owner": "payment.*"},
			{"path": "/v1/refunds/*", "service": "Payments Service", "permission_owner": "payment.*"},
			{"path": "/v1/payout*", "service": "Payments Service", "permission_owner": "payment.*"},
			{"path": "/legacy/*", "service": "Next.js API", "permission_owner": "migration only", "notes": "Temporary compatibility route for orchestration still living in TypeScript."},
		},
	})
}

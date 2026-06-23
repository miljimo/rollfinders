package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"api/internal/config"
)

func testConfig(baseURL string) config.Config {
	return config.Config{
		Port:                 "8080",
		DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
		ReadTimeout:          time.Second,
		WriteTimeout:         time.Second,
		ShutdownTimeout:      time.Second,
		ApplicationID:        "app_rollfinders",
		UserBaseURL:          baseURL,
		AuthorisationBaseURL: baseURL,
		AcademyBaseURL:       baseURL,
		OrganisationBaseURL:  baseURL,
		CourseBaseURL:        baseURL,
		BookingBaseURL:       baseURL,
		PaymentBaseURL:       baseURL,
		LegacyNextBaseURL:    baseURL,
	}
}

func newGatewayTestServer(t *testing.T, authorize bool, receivedPaths *[]string) *httptest.Server {
	return newGatewayTestServerWithAuthoriseCapture(t, authorize, receivedPaths, nil)
}

func newGatewayTestServerWithAuthoriseCapture(t *testing.T, authorize bool, receivedPaths *[]string, receivedAuthorise *authoriseRequest) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/authorize" {
			if receivedAuthorise != nil {
				if err := json.NewDecoder(r.Body).Decode(receivedAuthorise); err != nil {
					t.Fatalf("decode authorise request: %v", err)
				}
			}
			writeJSON(w, http.StatusOK, map[string]any{"authorized": authorize, "decision": map[bool]string{true: "allow", false: "deny"}[authorize]})
			return
		}
		if receivedPaths != nil {
			*receivedPaths = append(*receivedPaths, r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]string{"service": "downstream"})
	}))
}

func authorisedRequest(method string, path string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set(actorUserIDHeader, "user_test")
	return req
}

func TestRootEndpointReturnsApiDocumentation(t *testing.T) {
	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
			ReadTimeout:          time.Second,
			WriteTimeout:         time.Second,
			ShutdownTimeout:      time.Second,
			ApplicationID:        "app_rollfinders",
			UserBaseURL:          "http://users:8080",
			AuthorisationBaseURL: "http://authorisation:8080",
			AcademyBaseURL:       "http://academy:8080",
			OrganisationBaseURL:  "http://organisation:8080",
			CourseBaseURL:        "http://courses:8080",
			BookingBaseURL:       "http://booking:8080",
			PaymentBaseURL:       "http://payments:8080",
			LegacyNextBaseURL:    "http://app:3000",
		},
		Logger: slog.Default(),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid JSON docs payload: %v", err)
	}
	if payload["name"] != "RollFinders API" {
		t.Fatalf("unexpected docs name: %#v", payload["name"])
	}
	if _, ok := payload["routes"].([]any); !ok {
		t.Fatal("docs payload should include routes")
	}
}

func TestRootDocsDoNotCaptureGatewayRoutes(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{
		Config: testConfig(downstream.URL),
		Logger: slog.Default(),
	})

	req := authorisedRequest(http.MethodGet, "/v1/bookings")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if body := rec.Body.String(); body != "{\"service\":\"downstream\"}\n" {
		t.Fatalf("unexpected response body: %s", body)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/bookings" {
		t.Fatalf("unexpected downstream paths: %#v", receivedPaths)
	}
}

func TestUserAuthAndAccountRoutesProxyToUsersService(t *testing.T) {
	receivedPaths := make([]string, 0, 3)
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{
		Config: testConfig(downstream.URL),
		Logger: slog.Default(),
	})

	for _, path := range []string{"/auth/login", "/v1/auth/password-reset/validate", "/v1/accounts/user_123"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		if strings.HasPrefix(path, "/v1/accounts") {
			req.Header.Set(actorUserIDHeader, "user_test")
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200 for %s, got %d", path, rec.Code)
		}
	}

	expected := []string{"/auth/login", "/v1/auth/password-reset/validate", "/v1/accounts/user_123"}
	if len(receivedPaths) != len(expected) {
		t.Fatalf("expected %d proxied requests, got %d", len(expected), len(receivedPaths))
	}
	for index, expectedPath := range expected {
		if receivedPaths[index] != expectedPath {
			t.Fatalf("expected proxied path %s, got %s", expectedPath, receivedPaths[index])
		}
	}
}

func TestOrganisationRoutesProxyToOrganisationService(t *testing.T) {
	receivedPaths := make([]string, 0, 2)
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{
		Config: testConfig(downstream.URL),
		Logger: slog.Default(),
	})

	for _, path := range []string{"/v1/organisations/org_rollfinders", "/v1/applications/app_rollfinders/services"} {
		req := authorisedRequest(http.MethodGet, path)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200 for %s, got %d", path, rec.Code)
		}
	}

	expected := []string{"/v1/organisations/org_rollfinders", "/v1/applications/app_rollfinders/services"}
	if len(receivedPaths) != len(expected) {
		t.Fatalf("expected %d proxied requests, got %d", len(expected), len(receivedPaths))
	}
	for index, expectedPath := range expected {
		if receivedPaths[index] != expectedPath {
			t.Fatalf("expected proxied path %s, got %s", expectedPath, receivedPaths[index])
		}
	}
}

func TestAcademyMembershipRoutesProxyToAcademyService(t *testing.T) {
	receivedPaths := make([]string, 0, 2)
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{
		Config: testConfig(downstream.URL),
		Logger: slog.Default(),
	})

	for _, path := range []string{"/v1/academies", "/v1/memberships?user_id=user_123"} {
		req := authorisedRequest(http.MethodGet, path)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200 for %s, got %d", path, rec.Code)
		}
	}

	expected := []string{"/v1/academies", "/v1/memberships"}
	if len(receivedPaths) != len(expected) {
		t.Fatalf("expected %d proxied requests, got %d", len(expected), len(receivedPaths))
	}
	for index, expectedPath := range expected {
		if receivedPaths[index] != expectedPath {
			t.Fatalf("expected proxied path %s, got %s", expectedPath, receivedPaths[index])
		}
	}
}

func TestPublicCatalogReadsProxyWithoutActor(t *testing.T) {
	receivedPaths := make([]string, 0, 3)
	downstream := newGatewayTestServer(t, false, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	for _, path := range []string{"/v1/academies", "/v1/courses", "/v1/course-types"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200 for public catalog %s, got %d", path, rec.Code)
		}
	}

	expected := []string{"/v1/academies", "/v1/courses", "/v1/course-types"}
	if len(receivedPaths) != len(expected) {
		t.Fatalf("expected %d proxied requests, got %d", len(expected), len(receivedPaths))
	}
	for index, expectedPath := range expected {
		if receivedPaths[index] != expectedPath {
			t.Fatalf("expected proxied path %s, got %s", expectedPath, receivedPaths[index])
		}
	}
}

func TestProtectedRoutesRequireActorBeforeProxying(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := httptest.NewRequest(http.MethodGet, "/v1/memberships?user_id=user_123", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
	if len(receivedPaths) != 0 {
		t.Fatalf("downstream should not be called, got paths %#v", receivedPaths)
	}
}

func TestSelfAccountReadProxiesWithoutPermissionCheck(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := newGatewayTestServer(t, false, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodGet, "/v1/accounts/user_test")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200 for self account read, got %d", rec.Code)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/accounts/user_test" {
		t.Fatalf("expected self account read to proxy once, got paths %#v", receivedPaths)
	}
}

func TestProtectedRoutesReturnForbiddenWhenAuthorisationDenies(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := newGatewayTestServer(t, false, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodGet, "/v1/memberships?user_id=user_123")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rec.Code)
	}
	if len(receivedPaths) != 0 {
		t.Fatalf("downstream should not be called, got paths %#v", receivedPaths)
	}
}

func TestRouteRegistrySendsServiceDeclaredPermissionAndResourceScope(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	var authorisePayload authoriseRequest
	downstream := newGatewayTestServerWithAuthoriseCapture(t, true, &receivedPaths, &authorisePayload)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodPost, "/v1/academies/academy_456/search/hide")
	req.Header.Set("X-Organisation-ID", "org_123")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if authorisePayload.SubjectID != "user_test" {
		t.Fatalf("subject=%q", authorisePayload.SubjectID)
	}
	if authorisePayload.Permission != "academy.search.hide" {
		t.Fatalf("permission=%q", authorisePayload.Permission)
	}
	if authorisePayload.OrganisationID != "org_123" || authorisePayload.ApplicationID != "app_rollfinders" {
		t.Fatalf("unexpected scope: %#v", authorisePayload)
	}
	if authorisePayload.ResourceType != "academy" || authorisePayload.ResourceID != "academy_456" {
		t.Fatalf("unexpected resource scope: %#v", authorisePayload)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/academies/academy_456/search/hide" {
		t.Fatalf("expected downstream call after allow, got %#v", receivedPaths)
	}
}

func TestUnregisteredProtectedRouteFailsClosedBeforeProxying(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodPost, "/v1/academies/academy_456/unregistered-action")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rec.Code)
	}
	if len(receivedPaths) != 0 {
		t.Fatalf("downstream should not be called, got paths %#v", receivedPaths)
	}
}

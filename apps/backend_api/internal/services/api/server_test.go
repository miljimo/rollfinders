package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"rollfinders/internal/services/api/config"
	"rollfinders/internal/services/api/domain"
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
		SubscriptionBaseURL:  baseURL,
		WalletBaseURL:        baseURL,
		TransferBaseURL:      baseURL,
		PricingBaseURL:       baseURL,
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
		if r.URL.Path == "/v1/entitlements/check" {
			writeJSON(w, http.StatusOK, map[string]any{"allowed": true, "decision": "allow"})
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
			SubscriptionBaseURL:  "http://subscriptions:8080",
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

func TestOpenAPIEndpointReturnsPostmanImportableDocument(t *testing.T) {
	handler := New(Options{
		Config: testConfig("http://downstream.test"),
		Logger: slog.Default(),
	})

	req := httptest.NewRequest(http.MethodGet, "/openapi.json", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid OpenAPI JSON payload: %v", err)
	}
	if payload["openapi"] != "3.1.0" {
		t.Fatalf("unexpected OpenAPI version: %#v", payload["openapi"])
	}
	paths, ok := payload["paths"].(map[string]any)
	if !ok || len(paths) == 0 {
		t.Fatal("OpenAPI payload should include paths")
	}
	if _, ok := paths["/v1/authorisation/permissions"]; !ok {
		t.Fatal("OpenAPI payload should include authorisation gateway routes")
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

func TestGatewayTransferEndpointOrchestratesDownstreamServices(t *testing.T) {
	authServer := newGatewayTestServer(t, true, nil)
	defer authServer.Close()

	var transferPaths []string
	var transferStatusPayloads []map[string]any
	transferServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		transferPaths = append(transferPaths, r.URL.Path)
		w.Header().Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
		switch r.URL.Path {
		case domain.TransferCreatePath:
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(map[string]any{domain.JSONKeyTransfer: map[string]any{
				"id":                              "trf_gateway",
				domain.JSONKeyStatus:              "PENDING",
				domain.JSONKeySourceWalletID:      "wal_source",
				domain.JSONKeyDestinationWalletID: "wal_destination",
				domain.JSONKeyAmount:              2500,
				domain.JSONKeyCurrency:            "GBP",
			}})
		case fmt.Sprintf(domain.TransferStatusPathFormat, "trf_gateway"):
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode transfer status payload: %v", err)
			}
			transferStatusPayloads = append(transferStatusPayloads, payload)
			writeJSON(w, http.StatusOK, map[string]any{domain.JSONKeyTransfer: map[string]any{"id": "trf_gateway", domain.JSONKeyStatus: payload[domain.JSONKeyStatus]}})
		default:
			t.Fatalf("unexpected transfer path %s", r.URL.Path)
		}
	}))
	defer transferServer.Close()

	var walletPath string
	var walletIDempotencyKey string
	walletServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		walletPath = r.URL.Path
		walletIDempotencyKey = r.Header.Get(domain.IdempotencyHeader)
		writeJSON(w, http.StatusCreated, map[string]any{"id": "txn_gateway", domain.JSONKeyStatus: domain.TransferStatusCompleted})
	}))
	defer walletServer.Close()

	cfg := testConfig(authServer.URL)
	cfg.TransferBaseURL = transferServer.URL
	cfg.WalletBaseURL = walletServer.URL
	handler := New(Options{Config: cfg, Logger: slog.Default()})

	body, _ := json.Marshal(map[string]any{
		"source_wallet_id":      "wal_source",
		"destination_wallet_id": "wal_destination",
		"amount":                2500,
		"currency":              "GBP",
	})
	req := httptest.NewRequest(http.MethodPost, string(Transfers), bytes.NewReader(body))
	req.Header.Set(actorUserIDHeader, "user_test")
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	req.Header.Set(domain.IdempotencyHeader, "transfer-key")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d with body %s", rec.Code, rec.Body.String())
	}
	if walletPath != domain.WalletTransferPath {
		t.Fatalf("expected wallet transfer path %s, got %s", domain.WalletTransferPath, walletPath)
	}
	if walletIDempotencyKey != "trf_gateway" {
		t.Fatalf("expected transfer id idempotency key, got %q", walletIDempotencyKey)
	}
	expectedTransferStatusPath := fmt.Sprintf(domain.TransferStatusPathFormat, "trf_gateway")
	expectedPaths := []string{domain.TransferCreatePath, expectedTransferStatusPath, expectedTransferStatusPath}
	if len(transferPaths) != len(expectedPaths) {
		t.Fatalf("expected transfer paths %#v, got %#v", expectedPaths, transferPaths)
	}
	for index, expected := range expectedPaths {
		if transferPaths[index] != expected {
			t.Fatalf("expected transfer path %s, got %s", expected, transferPaths[index])
		}
	}
	if len(transferStatusPayloads) != 2 {
		t.Fatalf("expected processing and completed status payloads, got %#v", transferStatusPayloads)
	}
	if transferStatusPayloads[0][domain.JSONKeyStatus] != domain.TransferStatusProcessing || transferStatusPayloads[1][domain.JSONKeyStatus] != domain.TransferStatusCompleted {
		t.Fatalf("unexpected transfer status payloads: %#v", transferStatusPayloads)
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

	cases := []struct {
		method string
		path   string
	}{
		{method: http.MethodPost, path: "/auth/login"},
		{method: http.MethodPost, path: "/v1/auth/password-reset/validate"},
		{method: http.MethodGet, path: "/v1/accounts/user_123"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		if strings.HasPrefix(tc.path, "/v1/accounts") {
			req.Header.Set(actorUserIDHeader, "user_test")
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200 for %s, got %d", tc.path, rec.Code)
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

func TestProtectedRoutesRejectUnauthenticatedRequestsBeforeProxying(t *testing.T) {
	receivedPaths := make([]string, 0, len(protectedRoutes()))
	downstream := newGatewayTestServer(t, true, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	for _, route := range protectedRoutes() {
		route := route
		path := concreteRoutePath(string(route.Path))
		t.Run(route.Method+" "+string(route.Path), func(t *testing.T) {
			req := httptest.NewRequest(route.Method, path, nil)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if isPublicGatewayRoute(route.Method, path) {
				if rec.Code != http.StatusOK {
					t.Fatalf("expected public route to proxy with status 200, got %d", rec.Code)
				}
				return
			}
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected status 401 for unauthenticated protected route, got %d", rec.Code)
			}
		})
	}
	if len(receivedPaths) != publicProtectedRouteCount() {
		t.Fatalf("only public catalog routes should proxy, got paths %#v", receivedPaths)
	}
}

func TestSelfAccountReadUsesAuthorisationService(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	var authorisePayload authoriseRequest
	downstream := newGatewayTestServerWithAuthoriseCapture(t, true, &receivedPaths, &authorisePayload)
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
	if authorisePayload.Permission != "account.read" || authorisePayload.ResourceID != "user_test" {
		t.Fatalf("expected self account read to use authorisation service with resource scope, got %#v", authorisePayload)
	}
}

func TestSelfAccountReadDoesNotBypassDeniedAuthorisation(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := newGatewayTestServer(t, false, &receivedPaths)
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodGet, "/v1/accounts/user_test")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 for denied self account read, got %d", rec.Code)
	}
	if len(receivedPaths) != 0 {
		t.Fatalf("downstream should not be called, got paths %#v", receivedPaths)
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

func TestAuthorisedProtectedRoutesProxyToDeclaredServices(t *testing.T) {
	cases := []struct {
		name         string
		method       string
		path         string
		expectedPath string
	}{
		{name: "users", method: http.MethodGet, path: "/v1/users", expectedPath: "/v1/users"},
		{name: "academy", method: http.MethodPost, path: "/v1/academies/academy_123/search/hide", expectedPath: "/v1/academies/academy_123/search/hide"},
		{name: "organisation", method: http.MethodGet, path: "/v1/organisations/org_123", expectedPath: "/v1/organisations/org_123"},
		{name: "course", method: http.MethodPost, path: "/v1/courses", expectedPath: "/v1/courses"},
		{name: "booking", method: http.MethodPost, path: "/v1/bookings/booking_123/cancel", expectedPath: "/v1/bookings/booking_123/cancel"},
		{name: "payment", method: http.MethodPost, path: "/v1/payment-accounts/stripe/connect", expectedPath: "/v1/payment-accounts/stripe/connect"},
		{name: "authorisation namespace", method: http.MethodPost, path: "/v1/authorisation/permissions", expectedPath: "/v1/permissions"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			receivedPaths := make([]string, 0, 1)
			downstream := newGatewayTestServer(t, true, &receivedPaths)
			defer downstream.Close()

			handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
			req := authorisedRequest(tc.method, tc.path)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d", rec.Code)
			}
			if len(receivedPaths) != 1 || receivedPaths[0] != tc.expectedPath {
				t.Fatalf("expected downstream path %s, got %#v", tc.expectedPath, receivedPaths)
			}
		})
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
	if authorisePayload.ResourceID != "academy_456" {
		t.Fatalf("unexpected resource scope: %#v", authorisePayload)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/academies/academy_456/search/hide" {
		t.Fatalf("expected downstream call after allow, got %#v", receivedPaths)
	}
}

func TestSubscriptionControlledRouteChecksEntitlementBeforeProxying(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	var entitlementPayload entitlementCheckRequest
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/authorize":
			writeJSON(w, http.StatusOK, map[string]any{"authorized": true, "decision": "allow"})
		case "/v1/entitlements/check":
			if err := json.NewDecoder(r.Body).Decode(&entitlementPayload); err != nil {
				t.Fatalf("decode entitlement request: %v", err)
			}
			writeJSON(w, http.StatusOK, map[string]any{"allowed": true, "decision": "allow"})
		default:
			receivedPaths = append(receivedPaths, r.URL.Path)
			writeJSON(w, http.StatusOK, map[string]string{"service": "downstream"})
		}
	}))
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodPut, "/v1/academies/academy_456")
	req.Header.Set("X-Subscription-Owner-Type", "academy")
	req.Header.Set("X-Subscription-Owner-ID", "academy_456")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if entitlementPayload.FeatureKey != "academy.profile.manage" {
		t.Fatalf("expected academy profile entitlement check, got %#v", entitlementPayload)
	}
	if entitlementPayload.OwnerType != "academy" || entitlementPayload.OwnerID != "academy_456" {
		t.Fatalf("unexpected entitlement owner: %#v", entitlementPayload)
	}
	if entitlementPayload.SubjectID != "user_test" || entitlementPayload.Permission != "academy.update" {
		t.Fatalf("unexpected entitlement actor permission context: %#v", entitlementPayload)
	}
	if entitlementPayload.Route != "/v1/academies/academy_456" || entitlementPayload.HTTPMethod != http.MethodPut {
		t.Fatalf("unexpected entitlement route context: %#v", entitlementPayload)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/academies/academy_456" {
		t.Fatalf("expected downstream call after subscription allow, got %#v", receivedPaths)
	}
}

func TestSubscriptionControlledRouteDeniesBeforeProxying(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/authorize":
			writeJSON(w, http.StatusOK, map[string]any{"authorized": true, "decision": "allow"})
		case "/v1/entitlements/check":
			writeJSON(w, http.StatusOK, map[string]any{"allowed": false, "decision": "deny", "reason": "PLAN_FEATURE_NOT_INCLUDED"})
		default:
			receivedPaths = append(receivedPaths, r.URL.Path)
			writeJSON(w, http.StatusOK, map[string]string{"service": "downstream"})
		}
	}))
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := authorisedRequest(http.MethodPost, "/v1/courses")
	req.Header.Set("X-Subscription-Owner-Type", "academy")
	req.Header.Set("X-Subscription-Owner-ID", "academy_456")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "PLAN_FEATURE_NOT_INCLUDED") {
		t.Fatalf("expected subscription denial reason, got %s", rec.Body.String())
	}
	if len(receivedPaths) != 0 {
		t.Fatalf("downstream should not be called, got paths %#v", receivedPaths)
	}
}

func TestSubscriptionDecisionIsScopedByOwnerContextNotUser(t *testing.T) {
	receivedPaths := make([]string, 0, 2)
	entitlementOwners := make([]string, 0, 2)
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/authorize":
			writeJSON(w, http.StatusOK, map[string]any{"authorized": true, "decision": "allow"})
		case "/v1/entitlements/check":
			var payload entitlementCheckRequest
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode entitlement request: %v", err)
			}
			entitlementOwners = append(entitlementOwners, payload.OwnerID)
			if payload.SubjectID != "user_test" {
				t.Fatalf("subject must remain the same user across owner contexts, got %#v", payload)
			}
			allowed := payload.OwnerID == "academy_paid"
			reason := "PLAN_FEATURE_INCLUDED"
			if !allowed {
				reason = "PLAN_FEATURE_NOT_INCLUDED"
			}
			writeJSON(w, http.StatusOK, map[string]any{"allowed": allowed, "decision": map[bool]string{true: "allow", false: "deny"}[allowed], "reason": reason})
		default:
			receivedPaths = append(receivedPaths, r.URL.Path)
			writeJSON(w, http.StatusOK, map[string]string{"service": "downstream"})
		}
	}))
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	allowedReq := authorisedRequest(http.MethodPut, "/v1/academies/academy_paid")
	allowedReq.Header.Set("X-Subscription-Owner-Type", "academy")
	allowedReq.Header.Set("X-Subscription-Owner-ID", "academy_paid")
	allowedRec := httptest.NewRecorder()
	handler.ServeHTTP(allowedRec, allowedReq)
	if allowedRec.Code != http.StatusOK {
		t.Fatalf("expected paid academy request to pass, got %d %s", allowedRec.Code, allowedRec.Body.String())
	}

	deniedReq := authorisedRequest(http.MethodPut, "/v1/academies/academy_free")
	deniedReq.Header.Set("X-Subscription-Owner-Type", "academy")
	deniedReq.Header.Set("X-Subscription-Owner-ID", "academy_free")
	deniedRec := httptest.NewRecorder()
	handler.ServeHTTP(deniedRec, deniedReq)
	if deniedRec.Code != http.StatusForbidden {
		t.Fatalf("expected unpaid academy request to deny, got %d %s", deniedRec.Code, deniedRec.Body.String())
	}
	if !strings.Contains(deniedRec.Body.String(), "PLAN_FEATURE_NOT_INCLUDED") {
		t.Fatalf("expected missing-plan-feature denial, got %s", deniedRec.Body.String())
	}
	if len(entitlementOwners) != 2 || entitlementOwners[0] != "academy_paid" || entitlementOwners[1] != "academy_free" {
		t.Fatalf("entitlement checks must follow owner context, got %#v", entitlementOwners)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/academies/academy_paid" {
		t.Fatalf("only allowed owner should reach downstream, got %#v", receivedPaths)
	}
}

func TestPublicRouteDoesNotCallSubscriptionEntitlement(t *testing.T) {
	receivedPaths := make([]string, 0, 1)
	entitlementCalls := 0
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/entitlements/check" {
			entitlementCalls++
			writeJSON(w, http.StatusOK, map[string]any{"allowed": false, "decision": "deny"})
			return
		}
		receivedPaths = append(receivedPaths, r.URL.Path)
		writeJSON(w, http.StatusOK, map[string]string{"service": "downstream"})
	}))
	defer downstream.Close()

	handler := New(Options{Config: testConfig(downstream.URL), Logger: slog.Default()})
	req := httptest.NewRequest(http.MethodGet, "/v1/academies", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected public route to pass, got %d %s", rec.Code, rec.Body.String())
	}
	if entitlementCalls != 0 {
		t.Fatalf("public route must not call subscription entitlement service, got %d calls", entitlementCalls)
	}
	if len(receivedPaths) != 1 || receivedPaths[0] != "/v1/academies" {
		t.Fatalf("expected public route to proxy, got %#v", receivedPaths)
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

func concreteRoutePath(pattern string) string {
	replacements := map[string]string{
		"accountId":       "user_other",
		"userId":          "user_123",
		"mutation":        "disable",
		"sessionId":       "session_123",
		"academyId":       "academy_123",
		"membershipId":    "membership_123",
		"organisationId":  "org_123",
		"applicationId":   "app_rollfinders",
		"courseId":        "course_123",
		"courseTypeId":    "course_type_123",
		"activityId":      "activity_123",
		"bookingId":       "booking_123",
		"participantId":   "participant_123",
		"paymentId":       "payment_123",
		"payeeId":         "payee_123",
		"payoutRequestId": "payout_request_123",
		"permissionId":    "permission_123",
		"roleId":          "role_123",
		"assignmentId":    "assignment_123",
	}
	path := pattern
	for key, value := range replacements {
		path = strings.ReplaceAll(path, "{"+key+"}", value)
	}
	return path
}

func publicProtectedRouteCount() int {
	count := 0
	for _, route := range protectedRoutes() {
		if isPublicGatewayRoute(route.Method, concreteRoutePath(string(route.Path))) {
			count++
		}
	}
	return count
}

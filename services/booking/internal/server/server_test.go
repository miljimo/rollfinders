package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"booking/internal/config"
)

func testServer(databaseURL string, apiKey string) http.Handler {
	return New(Options{
		Config: config.Config{
			Port:        "8080",
			DatabaseURL: databaseURL,
			APIKey:      apiKey,
		},
		Logger: slog.Default(),
	})
}

func TestHealthDoesNotRequireDatabaseOrAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	testServer("", "").ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}
}

func TestReadyFailsWithoutDatabaseURL(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	testServer("", "test-key").ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", res.Code)
	}
}

func TestProtectedEndpointRequiresCredentials(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/bookings", nil)
	res := httptest.NewRecorder()
	testServer("", "test-key").ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", res.Code)
	}

	var body ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "unauthorized" || body.Error.RequestID == "" {
		t.Fatalf("unexpected error envelope: %+v", body)
	}
}

func TestProtectedEndpointAcceptsBearerCredentials(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/bookings", nil)
	req.Header.Set("Authorization", "Bearer test-key")
	res := httptest.NewRecorder()
	testServer("", "test-key").ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503 after auth reached handler without database config, got %d", res.Code)
	}
}

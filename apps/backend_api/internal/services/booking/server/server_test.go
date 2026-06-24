package server

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"rollfinders/internal/services/booking/config"
)

func testServer(databaseURL string) http.Handler {
	return New(Options{
		Config: config.Config{
			Port:        "8080",
			DatabaseURL: databaseURL,
		},
		Logger: slog.Default(),
	})
}

func TestHealthDoesNotRequireDatabaseOrAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}
}

func TestReadyFailsWithoutDatabaseURL(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", res.Code)
	}
}

func TestProtectedEndpointDoesNotRequireServiceCredentials(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/bookings", nil)
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503 after route reached handler without database config, got %d", res.Code)
	}
}

func TestProtectedEndpointIgnoresBearerCredentials(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/bookings", nil)
	req.Header.Set("Authorization", "Bearer test-key")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503 after auth reached handler without database config, got %d", res.Code)
	}
}

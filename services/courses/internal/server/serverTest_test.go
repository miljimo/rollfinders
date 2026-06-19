package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"courses/internal/config"
)

func TestHealthDoesNotRequireAuth(t *testing.T) {
	handler := New(Options{Config: config.Config{APIKey: "secret"}})
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestProtectedEndpointRequiresAuth(t *testing.T) {
	handler := New(Options{Config: config.Config{APIKey: "secret"}})
	req := httptest.NewRequest(http.MethodGet, "/v1/courses?organisation_id=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestProtectedEndpointAcceptsAPIKeyHeader(t *testing.T) {
	handler := New(Options{Config: config.Config{APIKey: "secret"}})
	req := httptest.NewRequest(http.MethodGet, "/v1/courses?organisation_id=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", nil)
	req.Header.Set("X-API-Key", "secret")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected auth to pass and database availability to fail with 503, got %d", rec.Code)
	}
}

func TestReadyReportsUnavailableWithoutDatabase(t *testing.T) {
	handler := New(Options{Config: config.Config{APIKey: "secret"}})
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
}

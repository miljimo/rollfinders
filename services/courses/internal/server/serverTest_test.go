package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"courses/internal/config"
)

func TestHealthDoesNotRequireAuth(t *testing.T) {
	handler := New(Options{Config: config.Config{}})
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestProtectedEndpointDoesNotRequireServiceAuth(t *testing.T) {
	handler := New(Options{Config: config.Config{}})
	req := httptest.NewRequest(http.MethodGet, "/v1/courses?organisation_id=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected database availability to fail with 503, got %d", rec.Code)
	}
}

func TestProtectedEndpointIgnoresLegacyServiceKeyHeader(t *testing.T) {
	handler := New(Options{Config: config.Config{}})
	req := httptest.NewRequest(http.MethodGet, "/v1/courses?organisation_id=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", nil)
	req.Header.Set("X-API-Key", "secret")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected auth to pass and database availability to fail with 503, got %d", rec.Code)
	}
}

func TestCourseTypeCreateRequiresPlatformAdminRole(t *testing.T) {
	handler := New(Options{Config: config.Config{}})
	req := httptest.NewRequest(http.MethodPost, "/v1/course-types", strings.NewReader(`{"name":"Open Mat"}`))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCourseTypeCreateAllowsPlatformAdminRole(t *testing.T) {
	handler := New(Options{Config: config.Config{}})
	req := httptest.NewRequest(http.MethodPost, "/v1/course-types", strings.NewReader(`{"name":"Open Mat"}`))
	req.Header.Set("X-Actor-Role", "PLATFORM_ADMIN")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected role check to pass and database availability to fail with 503, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestReadyReportsUnavailableWithoutDatabase(t *testing.T) {
	handler := New(Options{Config: config.Config{}})
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
}

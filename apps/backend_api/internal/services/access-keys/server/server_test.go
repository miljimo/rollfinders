package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"rollfinders/internal/services/access-keys/config"
)

func TestHealthz(t *testing.T) {
	srv := New(Options{Config: config.Config{Port: "8080"}})
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

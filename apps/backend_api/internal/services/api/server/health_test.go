package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/api/config"
)

func TestHealthChecksServicesAndDatabase(t *testing.T) {
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/healthz" {
			t.Fatalf("unexpected health path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}))
	defer downstream.Close()

	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			ReadTimeout:          time.Second,
			WriteTimeout:         time.Second,
			ShutdownTimeout:      time.Second,
			ApplicationID:        "app_rollfinders",
			UserBaseURL:          downstream.URL,
			AuthorisationBaseURL: downstream.URL,
			AcademyBaseURL:       downstream.URL,
			OrganisationBaseURL:  downstream.URL,
			CourseBaseURL:        downstream.URL,
			BookingBaseURL:       downstream.URL,
			PaymentBaseURL:       downstream.URL,
			LegacyNextBaseURL:    downstream.URL,
		},
		Logger: slog.Default(),
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503 because database is not configured, got %d", rec.Code)
	}
	var payload dependencyReport
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid health payload: %v", err)
	}
	if payload.Status != "not_ready" {
		t.Fatalf("expected not_ready, got %s", payload.Status)
	}
	if payload.Services["users"].Status != "ready" {
		t.Fatalf("expected users to be ready, got %#v", payload.Services["users"])
	}
	if payload.Services["organisation"].Status != "ready" {
		t.Fatalf("expected organisation to be ready, got %#v", payload.Services["organisation"])
	}
	if payload.Services["database"].Status != "not_ready" {
		t.Fatalf("expected database to be not_ready, got %#v", payload.Services["database"])
	}
}

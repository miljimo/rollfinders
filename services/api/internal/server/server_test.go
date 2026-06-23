package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"api/internal/config"
)

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
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/bookings" {
			t.Fatalf("unexpected downstream path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]string{"service": "booking"})
	}))
	defer downstream.Close()

	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
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

	req := httptest.NewRequest(http.MethodGet, "/v1/bookings", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if body := rec.Body.String(); body != "{\"service\":\"booking\"}\n" {
		t.Fatalf("unexpected response body: %s", body)
	}
}

func TestUserAuthAndAccountRoutesProxyToUsersService(t *testing.T) {
	receivedPaths := make([]string, 0, 3)
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPaths = append(receivedPaths, r.URL.Path)
		writeJSON(w, http.StatusOK, map[string]string{"service": "users"})
	}))
	defer downstream.Close()

	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
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

	for _, path := range []string{"/auth/login", "/v1/auth/password-reset/validate", "/v1/accounts/user_123"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
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
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPaths = append(receivedPaths, r.URL.Path)
		writeJSON(w, http.StatusOK, map[string]string{"service": "organisation"})
	}))
	defer downstream.Close()

	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
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

	for _, path := range []string{"/v1/organisations/org_rollfinders", "/v1/applications/app_rollfinders/services"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
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
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPaths = append(receivedPaths, r.URL.Path)
		writeJSON(w, http.StatusOK, map[string]string{"service": "academy"})
	}))
	defer downstream.Close()

	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
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

	for _, path := range []string{"/v1/academies", "/v1/memberships?user_id=user_123"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
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

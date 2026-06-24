package server

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/notification/config"
	"rollfinders/internal/services/notification/dataaccess"
)

type fakeNotificationStore struct {
	created dataaccess.CreateNotificationInput
	items   []dataaccess.Notification
	item    dataaccess.Notification
	err     error
}

func (f *fakeNotificationStore) Create(ctx context.Context, input dataaccess.CreateNotificationInput) (dataaccess.Notification, bool, error) {
	f.created = input
	if f.err != nil {
		return dataaccess.Notification{}, false, f.err
	}
	return dataaccess.Notification{
		ID:        input.ID,
		Channel:   input.Channel,
		Priority:  input.Priority,
		Status:    queuedStatus,
		Subject:   input.Subject,
		CreatedAt: time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC),
		UpdatedAt: time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC),
	}, false, nil
}

func (f *fakeNotificationStore) Get(ctx context.Context, id string) (dataaccess.Notification, error) {
	if f.err != nil {
		return dataaccess.Notification{}, f.err
	}
	if f.item.ID == "" {
		return dataaccess.Notification{}, dataaccess.ErrNotFound
	}
	return f.item, nil
}

func (f *fakeNotificationStore) Search(ctx context.Context, filter dataaccess.SearchFilter) ([]dataaccess.Notification, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.items, nil
}

func testServer(databaseURL string, apiKey string, store NotificationStore) http.Handler {
	return New(Options{
		Config: config.Config{
			Port:        "8080",
			DatabaseURL: databaseURL,
			APIKey:      apiKey,
		},
		Logger: slog.Default(),
		Store:  store,
	})
}

func TestHealthDoesNotRequireDatabaseOrAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	testServer("", "", nil).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}
	if res.Header().Get(requestIDHeader) == "" {
		t.Fatalf("expected request id header")
	}
}

func TestReadyFailsWithoutDatabaseURL(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	testServer("", "", nil).ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", res.Code)
	}
}

func TestProtectedEndpointRequiresServiceCredentials(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/notifications", nil)
	req.Header.Set(requestIDHeader, "req_test")
	res := httptest.NewRecorder()
	testServer("", "secret", nil).ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", res.Code)
	}
	var envelope ErrorEnvelope
	if err := json.NewDecoder(res.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	if envelope.Error.Code != "unauthorized" {
		t.Fatalf("expected unauthorized error code, got %q", envelope.Error.Code)
	}
	if envelope.Error.RequestID != "req_test" {
		t.Fatalf("expected request id in error envelope, got %q", envelope.Error.RequestID)
	}
}

func TestCreateNotificationAcceptsBearerCredential(t *testing.T) {
	body := []byte(`{
		"channel": "EMAIL",
		"priority": "HIGH",
		"subject": "Booking Confirmed",
		"contentText": "Booking Confirmed",
		"isContentHtml": false,
		"from": {"email": "noreply@rollfinders.com", "name": "RollFinders"},
		"to": [{"email": "john@example.com", "name": "John"}],
		"metadata": {"sourceService": "booking-service"},
		"idempotencyKey": "booking-123-confirmation"
	}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/notifications", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer secret")
	res := httptest.NewRecorder()
	store := &fakeNotificationStore{}
	testServer("", "secret", store).ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d: %s", res.Code, res.Body.String())
	}
	var response CreateNotificationResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if response.NotificationID == "" {
		t.Fatalf("expected notification id")
	}
	if response.Status != queuedStatus {
		t.Fatalf("expected status %s, got %s", queuedStatus, response.Status)
	}
	if store.created.ClientScope != "booking-service" {
		t.Fatalf("expected source service client scope, got %q", store.created.ClientScope)
	}
	if store.created.MaxAttempts != dataaccess.DefaultMaxAttempts {
		t.Fatalf("expected max attempts %d, got %d", dataaccess.DefaultMaxAttempts, store.created.MaxAttempts)
	}
	if store.created.ContentText != "Booking Confirmed" || store.created.IsContentHTML {
		t.Fatalf("unexpected content mapping: %#v", store.created)
	}
}

func TestListNotificationsReturnsStoreItems(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/notifications", nil)
	req.Header.Set("X-API-Key", "secret")
	res := httptest.NewRecorder()
	testServer("", "secret", &fakeNotificationStore{items: []dataaccess.Notification{{
		ID:        "notification_1",
		Channel:   "EMAIL",
		Priority:  "HIGH",
		Status:    queuedStatus,
		Subject:   "Booking Confirmed",
		CreatedAt: time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC),
		UpdatedAt: time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC),
	}}}).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}
	var response ListNotificationsResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if response.Notifications == nil {
		t.Fatalf("expected notifications array")
	}
	if len(response.Notifications) != 1 {
		t.Fatalf("expected one notification, got %d", len(response.Notifications))
	}
}

func TestGetNotificationReturnsStableNotFoundStub(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/notifications/00000000-0000-4000-8000-000000000000", nil)
	req.Header.Set("X-API-Key", "secret")
	res := httptest.NewRecorder()
	testServer("", "secret", &fakeNotificationStore{}).ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", res.Code)
	}
	var envelope ErrorEnvelope
	if err := json.NewDecoder(res.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	if envelope.Error.Code != "not_found" {
		t.Fatalf("expected not_found error code, got %q", envelope.Error.Code)
	}
}

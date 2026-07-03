package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAccessLogRecordsRequestDetails(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	handler := AccessLog(logger, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}), WithAccessLogRequestID(func(*http.Request) string { return "req_test" }))

	req := httptest.NewRequest(http.MethodPost, "/v1/test", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var entry map[string]any
	if err := json.Unmarshal(logs.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log entry, got error: %v", err)
	}

	if entry["msg"] != "request handled" {
		t.Fatalf("expected request handled message, got %#v", entry["msg"])
	}
	if entry["request_id"] != "req_test" {
		t.Fatalf("expected request id, got %#v", entry["request_id"])
	}
	if entry["method"] != http.MethodPost {
		t.Fatalf("expected method %s, got %#v", http.MethodPost, entry["method"])
	}
	if entry["path"] != "/v1/test" {
		t.Fatalf("expected path /v1/test, got %#v", entry["path"])
	}
	if entry["status"] != float64(http.StatusCreated) {
		t.Fatalf("expected status %d, got %#v", http.StatusCreated, entry["status"])
	}
	if _, ok := entry["duration_ms"]; !ok {
		t.Fatal("expected duration_ms field")
	}
}

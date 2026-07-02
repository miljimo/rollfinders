package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/api/config"
)

func TestTransferRouteOrchestratesTransferAndWalletServices(t *testing.T) {
	var transferPaths []string
	var transferStatusPayloads []map[string]any
	var walletKey string
	var walletPayload map[string]any

	authorisation := newGatewayTestServer(t, true, nil)
	defer authorisation.Close()

	transferService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		transferPaths = append(transferPaths, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/transfers":
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(map[string]any{"transfer": map[string]any{
				"id":                    "trf_123",
				"status":                "PENDING",
				"source_wallet_id":      "wal_source",
				"destination_wallet_id": "wal_destination",
				"amount":                2500,
				"currency":              "GBP",
				"reference_type":        "booking",
				"reference_id":          "booking_1",
				"idempotency_key":       "transfer-key",
			}})
		case "/v1/transfers/trf_123/status":
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode transfer status payload: %v", err)
			}
			transferStatusPayloads = append(transferStatusPayloads, payload)
			if payload["status"] == "COMPLETED" {
				writeJSON(w, http.StatusOK, map[string]any{"transfer": map[string]any{"id": "trf_123", "status": "COMPLETED"}})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"transfer": map[string]any{"id": "trf_123", "status": payload["status"]}})
		default:
			t.Fatalf("unexpected transfer path %s", r.URL.Path)
		}
	}))
	defer transferService.Close()

	walletService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/wallets/transfer" {
			t.Fatalf("unexpected wallet path %s", r.URL.Path)
		}
		walletKey = r.Header.Get("Idempotency-Key")
		if err := json.NewDecoder(r.Body).Decode(&walletPayload); err != nil {
			t.Fatalf("decode wallet payload: %v", err)
		}
		writeJSON(w, http.StatusCreated, map[string]any{"id": "txn_123", "status": "COMPLETED"})
	}))
	defer walletService.Close()

	handler := New(Options{
		Config: config.Config{
			Port:                 "8080",
			DatabaseURL:          "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable",
			ReadTimeout:          time.Second,
			WriteTimeout:         time.Second,
			ShutdownTimeout:      time.Second,
			ApplicationID:        "app_rollfinders",
			JWTSecret:            "test-secret",
			UserBaseURL:          authorisation.URL,
			AuthorisationBaseURL: authorisation.URL,
			AcademyBaseURL:       authorisation.URL,
			OrganisationBaseURL:  authorisation.URL,
			CourseBaseURL:        authorisation.URL,
			BookingBaseURL:       authorisation.URL,
			PaymentBaseURL:       authorisation.URL,
			SubscriptionBaseURL:  authorisation.URL,
			WalletBaseURL:        walletService.URL,
			TransferBaseURL:      transferService.URL,
			LegacyNextBaseURL:    authorisation.URL,
		},
		Logger: slog.Default(),
	})

	body, _ := json.Marshal(map[string]any{
		"source_wallet_id":      "wal_source",
		"destination_wallet_id": "wal_destination",
		"amount":                2500,
		"currency":              "GBP",
		"reference_type":        "booking",
		"reference_id":          "booking_1",
	})
	req := authorisedRequest(http.MethodPost, "/v1/transfers")
	req.Body = ioNopCloser{Reader: bytes.NewReader(body)}
	req.Header.Set("Idempotency-Key", "transfer-key")
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d with body %s", rec.Code, rec.Body.String())
	}
	if walletKey != "trf_123" {
		t.Fatalf("expected transfer id to be used as wallet ledger idempotency key, got %q", walletKey)
	}
	if walletPayload["reference_id"] != "booking_1" || walletPayload["type"] != "TRANSFER" {
		t.Fatalf("unexpected wallet payload: %#v", walletPayload)
	}
	expectedPaths := []string{"/v1/transfers", "/v1/transfers/trf_123/status", "/v1/transfers/trf_123/status"}
	if len(transferPaths) != len(expectedPaths) {
		t.Fatalf("expected transfer paths %#v, got %#v", expectedPaths, transferPaths)
	}
	for index, expected := range expectedPaths {
		if transferPaths[index] != expected {
			t.Fatalf("expected transfer path %s, got %s", expected, transferPaths[index])
		}
	}
	if len(transferStatusPayloads) != 2 {
		t.Fatalf("expected two status payloads, got %#v", transferStatusPayloads)
	}
	if transferStatusPayloads[0]["status"] != "PROCESSING" || transferStatusPayloads[1]["status"] != "COMPLETED" {
		t.Fatalf("unexpected transfer status payloads: %#v", transferStatusPayloads)
	}
}

type ioNopCloser struct {
	*bytes.Reader
}

func (c ioNopCloser) Close() error {
	return nil
}

package transfer

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/transfer/config"
	transfersvc "rollfinders/internal/services/transfer/service"
)

func TestTransferServiceInitiatesWalletTransfer(t *testing.T) {
	var receivedPath string
	var receivedKey string
	var receivedBody map[string]interface{}
	wallet := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		receivedKey = r.Header.Get("Idempotency-Key")
		_ = json.NewDecoder(r.Body).Decode(&receivedBody)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"id":                    "txn_123",
			"type":                  "TRANSFER",
			"status":                "COMPLETED",
			"amount":                2500,
			"currency":              "GBP",
			"source_wallet_id":      "wal_source",
			"destination_wallet_id": "wal_destination",
			"reference_type":        "booking",
			"reference_id":          "booking_1",
			"created_at":            time.Now().UTC(),
		})
	}))
	defer wallet.Close()

	handler := New(Options{
		Config:  config.Config{WalletBaseURL: wallet.URL, WalletRequestTimeout: time.Second},
		Logger:  slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
		Service: transfersvc.New(transfersvc.NewWalletHTTPClient(wallet.URL, time.Second)),
	})
	res := postJSON(t, handler, "/v1/transfers", "transfer-key", map[string]interface{}{
		"source_wallet_id": "wal_source", "destination_wallet_id": "wal_destination", "amount": 2500, "currency": "gbp", "reference_type": "booking", "reference_id": "booking_1",
	}, http.StatusCreated)

	if receivedPath != "/v1/wallets/transfer" {
		t.Fatalf("expected transfer service to call wallet transfer endpoint, got %s", receivedPath)
	}
	if receivedKey != "transfer-key" {
		t.Fatalf("expected idempotency key to be forwarded, got %q", receivedKey)
	}
	if receivedBody["currency"] != "GBP" {
		t.Fatalf("expected normalized currency, got %#v", receivedBody)
	}
	transfer := res["transfer"].(map[string]interface{})
	if transfer["id"] != "txn_123" || transfer["type"] != "TRANSFER" {
		t.Fatalf("expected wallet transaction response, got %#v", res)
	}
}

func TestTransferServiceValidatesMinimumRequest(t *testing.T) {
	handler := New(Options{Config: config.Config{}, Logger: slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))})
	postJSON(t, handler, "/v1/transfers", "", map[string]interface{}{
		"source_wallet_id": "wal_source", "destination_wallet_id": "wal_destination", "amount": 2500, "currency": "GBP",
	}, http.StatusBadRequest)
	postJSON(t, handler, "/v1/transfers", "same-wallet", map[string]interface{}{
		"source_wallet_id": "wal_same", "destination_wallet_id": "wal_same", "amount": 2500, "currency": "GBP",
	}, http.StatusBadRequest)
	postJSON(t, handler, "/v1/transfers", "bad-amount", map[string]interface{}{
		"source_wallet_id": "wal_source", "destination_wallet_id": "wal_destination", "amount": 0, "currency": "GBP",
	}, http.StatusBadRequest)
}

func postJSON(t *testing.T, handler http.Handler, path string, idempotencyKey string, payload map[string]interface{}, expectedStatus int) map[string]interface{} {
	t.Helper()
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != expectedStatus {
		t.Fatalf("expected status %d, got %d with body %s", expectedStatus, res.Code, res.Body.String())
	}
	var decoded map[string]interface{}
	_ = json.NewDecoder(res.Body).Decode(&decoded)
	return decoded
}

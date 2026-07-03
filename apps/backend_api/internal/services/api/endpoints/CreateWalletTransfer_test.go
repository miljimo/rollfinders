package endpoints

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"rollfinders/internal/services/api/domain"
	"testing"
)

func TestTransferRouteOrchestratesTransferAndWalletServices(t *testing.T) {
	var transferPaths []string
	var transferStatusPayloads []map[string]any
	var walletKey string
	var walletPayload map[string]any

	transferService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		transferPaths = append(transferPaths, r.URL.Path)
		w.Header().Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
		switch r.URL.Path {
		case domain.TransferCreatePath:
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(map[string]any{domain.JSONKeyTransfer: map[string]any{
				"id":                              "trf_123",
				domain.JSONKeyStatus:              "PENDING",
				domain.JSONKeySourceWalletID:      "wal_source",
				domain.JSONKeyDestinationWalletID: "wal_destination",
				domain.JSONKeyAmount:              2500,
				domain.JSONKeyCurrency:            "GBP",
				domain.JSONKeyReferenceType:       "booking",
				domain.JSONKeyReferenceID:         "booking_1",
				"idempotency_key":                 "transfer-key",
			}})
		case fmt.Sprintf(domain.TransferStatusPathFormat, "trf_123"):
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode transfer status payload: %v", err)
			}
			transferStatusPayloads = append(transferStatusPayloads, payload)
			if payload[domain.JSONKeyStatus] == domain.TransferStatusCompleted {
				writeJSON(w, http.StatusOK, map[string]any{domain.JSONKeyTransfer: map[string]any{"id": "trf_123", domain.JSONKeyStatus: domain.TransferStatusCompleted}})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{domain.JSONKeyTransfer: map[string]any{"id": "trf_123", domain.JSONKeyStatus: payload[domain.JSONKeyStatus]}})
		default:
			t.Fatalf("unexpected transfer path %s", r.URL.Path)
		}
	}))
	defer transferService.Close()

	walletService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != domain.WalletTransferPath {
			t.Fatalf("unexpected wallet path %s", r.URL.Path)
		}
		walletKey = r.Header.Get(domain.IdempotencyHeader)
		if err := json.NewDecoder(r.Body).Decode(&walletPayload); err != nil {
			t.Fatalf("decode wallet payload: %v", err)
		}
		writeJSON(w, http.StatusCreated, map[string]any{"id": "txn_123", domain.JSONKeyStatus: domain.TransferStatusCompleted})
	}))
	defer walletService.Close()

	handler := CreateWalletTransfer(WalletTransferOptions{
		TransferBaseURL: transferService.URL,
		WalletBaseURL:   walletService.URL,
		RequestIDFrom:   func(*http.Request) string { return "req_test" },
		WriteError: func(w http.ResponseWriter, _ *http.Request, status int, code string, message string, details any) {
			writeJSON(w, status, map[string]any{domain.JSONKeyError: map[string]any{domain.JSONKeyCode: code, domain.JSONKeyMessage: message, domain.JSONKeyDetails: details}})
		},
	})

	body, _ := json.Marshal(map[string]any{
		"source_wallet_id":      "wal_source",
		"destination_wallet_id": "wal_destination",
		"amount":                2500,
		"currency":              "GBP",
		"reference_type":        "booking",
		"reference_id":          "booking_1",
	})
	req := httptest.NewRequest(http.MethodPost, domain.TransferCreatePath, bytes.NewReader(body))
	req.Header.Set(domain.IdempotencyHeader, "transfer-key")
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d with body %s", rec.Code, rec.Body.String())
	}
	if walletKey != "trf_123" {
		t.Fatalf("expected transfer id to be used as wallet ledger idempotency key, got %q", walletKey)
	}
	if walletPayload[domain.JSONKeyReferenceID] != "booking_1" || walletPayload[domain.JSONKeyType] != domain.TransferType {
		t.Fatalf("unexpected wallet payload: %#v", walletPayload)
	}
	expectedTransferStatusPath := fmt.Sprintf(domain.TransferStatusPathFormat, "trf_123")
	expectedPaths := []string{domain.TransferCreatePath, expectedTransferStatusPath, expectedTransferStatusPath}
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
	if transferStatusPayloads[0][domain.JSONKeyStatus] != domain.TransferStatusProcessing || transferStatusPayloads[1][domain.JSONKeyStatus] != domain.TransferStatusCompleted {
		t.Fatalf("unexpected transfer status payloads: %#v", transferStatusPayloads)
	}
}

package transfer

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/transfer/config"
	"rollfinders/internal/services/transfer/dataaccess"
	"rollfinders/internal/services/transfer/domain"
	transfersvc "rollfinders/internal/services/transfer/service"
)

type stubRepository struct {
	created dataaccess.CreateTransferInput
}

func (repo *stubRepository) CreateTransfer(_ context.Context, input dataaccess.CreateTransferInput) (*domain.Transfer, error) {
	repo.created = input
	return &domain.Transfer{
		ID:                  "trf_123",
		Status:              string(domain.TransferPending),
		SourceWalletID:      input.SourceWalletID,
		DestinationWalletID: input.DestinationWalletID,
		Amount:              input.Amount,
		Currency:            input.Currency,
		ReferenceType:       input.ReferenceType,
		ReferenceID:         input.ReferenceID,
		Description:         input.Description,
		IdempotencyKey:      input.IdempotencyKey,
		CreatedAt:           time.Now().UTC(),
		UpdatedAt:           time.Now().UTC(),
	}, nil
}

func (repo *stubRepository) MarkTransferProcessing(_ context.Context, id string) (*domain.Transfer, error) {
	return &domain.Transfer{ID: id, Status: string(domain.TransferProcessing)}, nil
}

func (repo *stubRepository) CompleteTransfer(_ context.Context, id string) (*domain.Transfer, error) {
	return &domain.Transfer{ID: id, Status: string(domain.TransferCompleted)}, nil
}

func (repo *stubRepository) FailTransfer(_ context.Context, input dataaccess.FailTransferInput) (*domain.Transfer, error) {
	return &domain.Transfer{ID: input.ID, Status: string(domain.TransferFailed), FailureReason: input.FailureReason}, nil
}

func (repo *stubRepository) GetTransfer(_ context.Context, id string) (*domain.Transfer, error) {
	return &domain.Transfer{ID: id, Status: string(domain.TransferPending)}, nil
}

func (repo *stubRepository) ListTransfers(_ context.Context, _ dataaccess.ListTransfersInput) ([]domain.Transfer, error) {
	return []domain.Transfer{{ID: "trf_123", Status: string(domain.TransferPending)}}, nil
}

func TestTransferServiceCreatesTransferRecord(t *testing.T) {
	repo := &stubRepository{}

	handler := New(Options{
		Config:  config.Config{},
		Logger:  slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
		Service: transfersvc.New(repo),
	})
	res := postJSON(t, handler, "/v1/transfers", "transfer-key", map[string]interface{}{
		"source_wallet_id": "wal_source", "destination_wallet_id": "wal_destination", "amount": 2500, "currency": "gbp", "reference_type": "booking", "reference_id": "booking_1",
	}, http.StatusCreated)

	if repo.created.IdempotencyKey != "transfer-key" {
		t.Fatalf("expected idempotency key to be persisted, got %q", repo.created.IdempotencyKey)
	}
	if repo.created.Currency != "GBP" {
		t.Fatalf("expected normalized currency, got %#v", repo.created)
	}
	transfer := res["transfer"].(map[string]interface{})
	if transfer["id"] != "trf_123" || transfer["status"] != "PENDING" {
		t.Fatalf("expected transfer record response, got %#v", res)
	}
}

func TestTransferServiceUpdatesTransferStatusThroughSingleEndpoint(t *testing.T) {
	repo := &stubRepository{}
	handler := New(Options{
		Config:  config.Config{},
		Logger:  slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)),
		Service: transfersvc.New(repo),
	})

	processing := postJSON(t, handler, "/v1/transfers/trf_123/status", "", map[string]interface{}{
		"status": "PROCESSING",
	}, http.StatusOK)
	if processing["transfer"].(map[string]interface{})["status"] != "PROCESSING" {
		t.Fatalf("expected processing status, got %#v", processing)
	}

	completed := postJSON(t, handler, "/v1/transfers/trf_123/status", "", map[string]interface{}{
		"status": "COMPLETED",
	}, http.StatusOK)
	transfer := completed["transfer"].(map[string]interface{})
	if transfer["status"] != "COMPLETED" {
		t.Fatalf("expected completed status, got %#v", completed)
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
	postJSON(t, handler, "/v1/transfers", "bad-currency", map[string]interface{}{
		"source_wallet_id": "wal_source", "destination_wallet_id": "wal_destination", "amount": 2500, "currency": "AUD",
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

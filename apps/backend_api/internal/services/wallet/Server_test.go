package wallet

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"rollfinders/internal/services/wallet/config"
)

func TestWalletServiceFinancialFlow(t *testing.T) {
	handler := New(Options{Config: config.Config{MetricsEnabled: true}, Logger: slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))})

	platform := createWallet(t, handler, "platform", "rollfinders", "GBP")
	academy := createWallet(t, handler, "academy", "academy_1", "GBP")
	walletPage := getWallets(t, handler)
	if len(walletPage.Wallets) != 2 || walletPage.Pagination.Total != 2 {
		t.Fatalf("expected wallet list to include created wallets, got %+v", walletPage)
	}

	adjustment := postJSON(t, handler, "/v1/wallets/adjustment", "seed-platform", map[string]interface{}{
		"wallet_id": platform.ID, "counter_wallet_id": academy.ID, "type": "MANUAL_CREDIT", "amount": 10000, "currency": "GBP", "reason": "seed funds", "administrator_id": "SYSTEM", "reference": "seed_1",
	}, http.StatusCreated)
	if adjustment["id"] == "" {
		t.Fatalf("expected adjustment transaction id")
	}

	transfer := postJSON(t, handler, "/v1/wallets/transfer", "transfer-1", map[string]interface{}{
		"source_wallet_id": platform.ID, "destination_wallet_id": academy.ID, "amount": 2500, "currency": "GBP", "reference_type": "booking", "reference_id": "booking_1",
	}, http.StatusCreated)
	if transfer["type"] != "TRANSFER" {
		t.Fatalf("expected transfer transaction, got %#v", transfer)
	}

	platformBalance := getBalance(t, handler, platform.ID)
	if platformBalance.AvailableBalance != 7500 {
		t.Fatalf("expected platform balance 7500, got %+v", platformBalance)
	}
	academyBalance := getBalance(t, handler, academy.ID)
	if academyBalance.AvailableBalance != -7500 {
		t.Fatalf("expected academy counter balance -7500 after manual credit plus transfer, got %+v", academyBalance)
	}

	reserveBody := postJSON(t, handler, "/v1/wallets/reserve", "reserve-1", map[string]interface{}{
		"wallet_id": platform.ID, "amount": 1000, "currency": "GBP", "reference_type": "hold", "reference_id": "hold_1",
	}, http.StatusCreated)
	reservation := reserveBody["reservation"].(map[string]interface{})
	if reservation["status"] != "ACTIVE" {
		t.Fatalf("expected active reservation, got %#v", reservation)
	}
	platformBalance = getBalance(t, handler, platform.ID)
	if platformBalance.AvailableBalance != 6500 || platformBalance.ReservedBalance != 1000 {
		t.Fatalf("expected reservation to reduce available balance, got %+v", platformBalance)
	}

	postJSON(t, handler, "/v1/wallets/release", "release-1", map[string]interface{}{"reservation_id": reservation["id"]}, http.StatusOK)
	platformBalance = getBalance(t, handler, platform.ID)
	if platformBalance.AvailableBalance != 7500 || platformBalance.ReservedBalance != 0 {
		t.Fatalf("expected release to restore available balance, got %+v", platformBalance)
	}

	reversal := postJSON(t, handler, "/v1/wallets/reverse", "reverse-1", map[string]interface{}{
		"transaction_id": transfer["id"], "description": "cancel booking",
	}, http.StatusCreated)
	if reversal["type"] != "REVERSAL" {
		t.Fatalf("expected reversal transaction, got %#v", reversal)
	}
	platformBalance = getBalance(t, handler, platform.ID)
	if platformBalance.AvailableBalance != 10000 {
		t.Fatalf("expected reversal to restore platform balance, got %+v", platformBalance)
	}
}

func TestWalletServiceRejectsInsufficientFundsAndRequiresIdempotency(t *testing.T) {
	handler := New(Options{Config: config.Config{}, Logger: slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))})
	source := createWallet(t, handler, "platform", "rollfinders", "GBP")
	destination := createWallet(t, handler, "academy", "academy_1", "GBP")

	postJSON(t, handler, "/v1/wallets/transfer", "transfer-empty", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": destination.ID, "amount": 1, "currency": "GBP",
	}, http.StatusConflict)

	postJSON(t, handler, "/v1/wallets/transfer", "", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": destination.ID, "amount": 1, "currency": "GBP",
	}, http.StatusBadRequest)
}

func TestWalletServiceReplaysIdempotentTransfer(t *testing.T) {
	handler := New(Options{Config: config.Config{}, Logger: slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))})
	source := createWallet(t, handler, "platform", "rollfinders", "GBP")
	destination := createWallet(t, handler, "academy", "academy_1", "GBP")
	postJSON(t, handler, "/v1/wallets/adjustment", "seed", map[string]interface{}{
		"wallet_id": source.ID, "counter_wallet_id": destination.ID, "type": "MANUAL_CREDIT", "amount": 100, "currency": "GBP", "reason": "seed", "administrator_id": "SYSTEM", "reference": "seed",
	}, http.StatusCreated)

	first := postJSON(t, handler, "/v1/wallets/transfer", "same-key", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": destination.ID, "amount": 50, "currency": "GBP",
	}, http.StatusCreated)
	second := postJSON(t, handler, "/v1/wallets/transfer", "same-key", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": destination.ID, "amount": 50, "currency": "GBP",
	}, http.StatusCreated)
	if first["id"] != second["id"] {
		t.Fatalf("expected idempotent replay, got %v and %v", first["id"], second["id"])
	}
	balance := getBalance(t, handler, source.ID)
	if balance.AvailableBalance != 50 {
		t.Fatalf("expected only one transfer to be applied, got %+v", balance)
	}
}

type walletResponse struct {
	ID string `json:"id"`
}

type balanceResponse struct {
	AvailableBalance int64 `json:"available_balance"`
	ReservedBalance  int64 `json:"reserved_balance"`
}

type walletsResponse struct {
	Wallets    []walletResponse `json:"wallets"`
	Pagination struct {
		Total int `json:"total"`
	} `json:"pagination"`
}

func createWallet(t *testing.T, handler http.Handler, ownerType string, ownerID string, currency string) walletResponse {
	t.Helper()
	body := postJSON(t, handler, "/v1/wallets", "", map[string]interface{}{"owner_type": ownerType, "owner_id": ownerID, "currency": currency}, http.StatusCreated)
	id, _ := body["id"].(string)
	if id == "" {
		t.Fatalf("expected wallet id in %#v", body)
	}
	return walletResponse{ID: id}
}

func getBalance(t *testing.T, handler http.Handler, walletID string) balanceResponse {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/v1/wallets/"+walletID+"/balance", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected balance status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var balance balanceResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &balance); err != nil {
		t.Fatalf("decode balance: %v", err)
	}
	return balance
}

func getWallets(t *testing.T, handler http.Handler) walletsResponse {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/v1/wallets?limit=10&offset=0", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected wallets status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var page walletsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil {
		t.Fatalf("decode wallets: %v", err)
	}
	return page
}

func postJSON(t *testing.T, handler http.Handler, path string, key string, body map[string]interface{}, expected int) map[string]interface{} {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	if key != "" {
		req.Header.Set("Idempotency-Key", key)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != expected {
		t.Fatalf("expected %s status %d, got %d body %s", path, expected, rec.Code, rec.Body.String())
	}
	var decoded map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return decoded
}

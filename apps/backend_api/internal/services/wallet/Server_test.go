package wallet

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"rollfinders/internal/services/wallet/config"
	"rollfinders/internal/services/wallet/repository"
)

func TestWalletServiceFinancialFlow(t *testing.T) {
	handler := testHandler()

	internalWallet := createWallet(t, handler, "internal", "owner_rollfinders", "GBP")
	externalWallet := createWallet(t, handler, "external", "owner_registered_1", "GBP")
	if internalWallet.Type != "internal" || externalWallet.Type != "external" {
		t.Fatalf("expected wallet type to be returned, got internal=%+v external=%+v", internalWallet, externalWallet)
	}
	walletPage := getWallets(t, handler)
	if len(walletPage.Wallets) != 2 || walletPage.Pagination.Total != 2 {
		t.Fatalf("expected wallet list to include created wallets, got %+v", walletPage)
	}

	adjustment := postJSON(t, handler, "/v1/wallets/adjustment", "seed-internal", map[string]interface{}{
		"wallet_id": internalWallet.ID, "counter_wallet_id": externalWallet.ID, "type": "MANUAL_CREDIT", "amount": 10000, "currency": "GBP", "reason": "seed funds", "administrator_id": "SYSTEM", "reference": "seed_1",
	}, http.StatusCreated)
	if adjustment["id"] == "" {
		t.Fatalf("expected adjustment transaction id")
	}

	transfer := postJSON(t, handler, "/v1/wallets/transfer", "transfer-1", map[string]interface{}{
		"source_wallet_id": internalWallet.ID, "destination_wallet_id": externalWallet.ID, "amount": 2500, "currency": "GBP", "reference_type": "booking", "reference_id": "booking_1",
	}, http.StatusCreated)
	if transfer["type"] != "TRANSFER" {
		t.Fatalf("expected transfer transaction, got %#v", transfer)
	}

	internalBalance := getBalance(t, handler, internalWallet.ID)
	if internalBalance.Available != 7500 {
		t.Fatalf("expected internal wallet balance 7500, got %+v", internalBalance)
	}
	externalBalance := getBalance(t, handler, externalWallet.ID)
	if externalBalance.Available != -7500 {
		t.Fatalf("expected external counter balance -7500 after manual credit plus transfer, got %+v", externalBalance)
	}

	reversal := postJSON(t, handler, "/v1/wallets/reverse", "reverse-1", map[string]interface{}{
		"transaction_id": transfer["id"], "description": "cancel booking",
	}, http.StatusCreated)
	if reversal["type"] != "REVERSAL" {
		t.Fatalf("expected reversal transaction, got %#v", reversal)
	}
	internalBalance = getBalance(t, handler, internalWallet.ID)
	if internalBalance.Available != 10000 {
		t.Fatalf("expected reversal to restore internal wallet balance, got %+v", internalBalance)
	}
	if internalBalance.Reserved != 0 {
		t.Fatalf("expected reserved balance to remain zero without reservations, got %+v", internalBalance)
	}
}

func TestWalletServiceRejectsInsufficientFundsAndRequiresIdempotency(t *testing.T) {
	handler := testHandler()
	source := createWallet(t, handler, "internal", "owner_source", "GBP")
	destination := createWallet(t, handler, "external", "owner_destination", "GBP")

	postJSON(t, handler, "/v1/wallets/transfer", "transfer-empty", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": destination.ID, "amount": 1, "currency": "GBP",
	}, http.StatusConflict)

	postJSON(t, handler, "/v1/wallets/transfer", "", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": destination.ID, "amount": 1, "currency": "GBP",
	}, http.StatusBadRequest)
	postJSON(t, handler, "/v1/wallets/transfer", "same-wallet", map[string]interface{}{
		"source_wallet_id": source.ID, "destination_wallet_id": source.ID, "amount": 1, "currency": "GBP",
	}, http.StatusBadRequest)
	postJSON(t, handler, "/v1/wallets", "", map[string]interface{}{"wallet_type": "platform", "owner_id": "owner_source", "currency": "GBP"}, http.StatusBadRequest)
	postJSON(t, handler, "/v1/wallets", "", map[string]interface{}{"wallet_type": "internal", "owner_id": "", "currency": "GBP"}, http.StatusBadRequest)
	postJSON(t, handler, "/v1/wallets", "", map[string]interface{}{"wallet_type": "internal", "owner_id": "rollfinders", "currency": "AUD"}, http.StatusBadRequest)
}

func TestWalletServiceReplaysIdempotentTransfer(t *testing.T) {
	handler := testHandler()
	source := createWallet(t, handler, "internal", "owner_source", "GBP")
	destination := createWallet(t, handler, "external", "owner_destination", "GBP")
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
	if balance.Available != 50 {
		t.Fatalf("expected only one transfer to be applied, got %+v", balance)
	}
}

func testHandler() http.Handler {
	return New(Options{Config: config.Config{MetricsEnabled: true}, Logger: slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)), Repo: repository.NewInMemoryRepository()})
}

type walletResponse struct {
	ID       string `json:"id"`
	Type     string `json:"wallet_type"`
	OwnerID  string `json:"owner_id"`
	Currency string `json:"currency"`
}

type balanceResponse struct {
	Available int64 `json:"available_balance"`
	Reserved  int64 `json:"reserved_balance"`
}

type walletsResponse struct {
	Wallets    []walletResponse `json:"wallets"`
	Pagination struct {
		Total int `json:"total"`
	} `json:"pagination"`
}

func createWallet(t *testing.T, handler http.Handler, walletType string, ownerID string, currency string) walletResponse {
	t.Helper()
	body := postJSON(t, handler, "/v1/wallets", "", map[string]interface{}{"wallet_type": walletType, "owner_id": ownerID, "currency": currency}, http.StatusCreated)
	wallet := walletResponse{
		ID:       stringValue(body["id"]),
		Type:     stringValue(body["wallet_type"]),
		OwnerID:  stringValue(body["owner_id"]),
		Currency: stringValue(body["currency"]),
	}
	if wallet.ID == "" {
		t.Fatalf("expected wallet id in %#v", body)
	}
	if wallet.Type != walletType || wallet.OwnerID != ownerID || wallet.Currency != currency {
		t.Fatalf("expected wallet contract to include type, owner, currency; got %+v", wallet)
	}
	return wallet
}

func stringValue(value interface{}) string {
	text, _ := value.(string)
	return text
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

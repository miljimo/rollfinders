package wallet

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/wallet/config"
	"rollfinders/internal/services/wallet/domain"
)

func TestWalletServiceFinancialFlow(t *testing.T) {
	handler := testHandler()

	internalWallet := createWallet(t, handler, "internal", "owner_rollfinders", "GBP")
	externalWallet := createWallet(t, handler, "external", "owner_registered_1", "GBP")
	linkExternalWallet(t, handler, externalWallet.ID)
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
	linkExternalWallet(t, handler, destination.ID)
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

func TestWalletServiceReservesReleasesAndFinalizesFunds(t *testing.T) {
	handler := testHandler()
	payeeWallet := createWallet(t, handler, "internal", "academy_123", "GBP")
	platformWallet := createWallet(t, handler, "internal", "rollfinders_platform", "GBP")
	externalWallet := createWallet(t, handler, "external", "academy_123_payout", "GBP")
	linkExternalWallet(t, handler, externalWallet.ID)

	postJSON(t, handler, "/v1/wallets/adjustment", "seed-payee", map[string]interface{}{
		"wallet_id": payeeWallet.ID, "counter_wallet_id": platformWallet.ID, "type": "MANUAL_CREDIT", "amount": 1000, "currency": "GBP", "reason": "payment succeeded", "administrator_id": "SYSTEM", "reference": "payment_123",
	}, http.StatusCreated)

	reservation := postJSON(t, handler, "/v1/wallets/reservations", "reserve-payout-1", map[string]interface{}{
		"wallet_id": payeeWallet.ID, "amount": 700, "currency": "GBP", "reference_type": "payout_request", "reference_id": "payout_123", "description": "reserve payout funds",
	}, http.StatusCreated)
	if reservation["status"] != "ACTIVE" {
		t.Fatalf("expected active reservation, got %#v", reservation)
	}
	balance := getBalance(t, handler, payeeWallet.ID)
	if balance.Available != 300 || balance.Reserved != 700 {
		t.Fatalf("expected reserved funds to reduce available balance, got %+v", balance)
	}

	released := postJSON(t, handler, "/v1/wallets/reservations/"+stringValue(reservation["id"])+"/release", "release-payout-1", map[string]interface{}{
		"description": "payout rejected",
	}, http.StatusOK)
	if released["status"] != "RELEASED" {
		t.Fatalf("expected released reservation, got %#v", released)
	}
	balance = getBalance(t, handler, payeeWallet.ID)
	if balance.Available != 1000 || balance.Reserved != 0 {
		t.Fatalf("expected release to restore available balance, got %+v", balance)
	}

	finalReservation := postJSON(t, handler, "/v1/wallets/reservations", "reserve-payout-2", map[string]interface{}{
		"wallet_id": payeeWallet.ID, "amount": 800, "currency": "GBP", "reference_type": "payout_request", "reference_id": "payout_456",
	}, http.StatusCreated)
	finalized := postJSON(t, handler, "/v1/wallets/reservations/"+stringValue(finalReservation["id"])+"/finalize", "finalize-payout-2", map[string]interface{}{
		"counter_wallet_id": externalWallet.ID, "description": "provider payout paid",
	}, http.StatusOK)
	if finalized["type"] != "TRANSFER" {
		t.Fatalf("expected finalization transfer, got %#v", finalized)
	}
	balance = getBalance(t, handler, payeeWallet.ID)
	if balance.Available != 200 || balance.Reserved != 0 {
		t.Fatalf("expected finalized payout to debit payee wallet, got %+v", balance)
	}
}

func TestWalletServiceListsLinkedAccountsForExternalWallet(t *testing.T) {
	handler, repo := testHandlerWithRepo()
	externalWallet := createWallet(t, handler, "external", "owner_registered_1", "GBP")
	now := time.Now().UTC()
	repo.addLinkedAccount(domain.LinkedAccount{
		ID:                "lwa_stripe_1",
		WalletID:          externalWallet.ID,
		Provider:          domain.LinkedAccountProviderStripe,
		ProviderAccountID: "acct_123",
		ConnectionType:    domain.LinkedAccountBoth,
		Status:            domain.LinkedAccountConnected,
		DisplayName:       "Stripe Connect",
		ExternalReference: "acct_123",
		Currency:          domain.CurrencyGBP,
		CreatedAt:         now,
		UpdatedAt:         now,
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/wallets/"+externalWallet.ID+"/linked-accounts", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected linked account status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Data []domain.LinkedAccount `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode linked accounts: %v", err)
	}
	if len(body.Data) != 1 {
		t.Fatalf("expected one linked account, got %+v", body.Data)
	}
	if body.Data[0].Provider != domain.LinkedAccountProviderStripe || body.Data[0].ProviderAccountID != "acct_123" {
		t.Fatalf("expected stripe linked account details, got %+v", body.Data[0])
	}
}

func TestWalletServiceRootReturnsEndpointIndex(t *testing.T) {
	handler := testHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected root status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Service   string              `json:"service"`
		Endpoints []map[string]string `json:"endpoints"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode root response: %v", err)
	}
	if body.Service != "wallet" {
		t.Fatalf("expected wallet service index, got %#v", body.Service)
	}
	if len(body.Endpoints) == 0 {
		t.Fatalf("expected root response to list endpoints")
	}
}

func testHandler() http.Handler {
	handler, _ := testHandlerWithRepo()
	return handler
}

func testHandlerWithRepo() (http.Handler, *InMemoryRepository) {
	repo := NewInMemoryRepository()
	return New(Options{Config: config.Config{MetricsEnabled: true}, Logger: slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil)), Repo: repo}), repo
}

type walletResponse struct {
	ID       string `json:"id"`
	Type     string `json:"wallet_type"`
	OwnerID  string `json:"owner_id"`
	Currency string `json:"currency"`
	Status   string `json:"status"`
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
		Status:   stringValue(body["status"]),
	}
	if wallet.ID == "" {
		t.Fatalf("expected wallet id in %#v", body)
	}
	if wallet.Type != walletType || wallet.OwnerID != ownerID || wallet.Currency != currency {
		t.Fatalf("expected wallet contract to include type, owner, currency; got %+v", wallet)
	}
	return wallet
}

func TestWalletServiceCreatesExternalWalletInactiveAndActivatesWhenLinked(t *testing.T) {
	handler := testHandler()
	externalWallet := createWallet(t, handler, "external", "owner_registered_1", "GBP")
	if externalWallet.Status != "inactive" {
		t.Fatalf("expected new external wallet to be inactive, got %+v", externalWallet)
	}

	body := postJSON(t, handler, "/v1/wallets/"+externalWallet.ID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_123",
		"connection_type":     "BOTH",
		"status":              "CONNECTED",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_123",
		"currency":            "GBP",
	}, http.StatusCreated)
	if body["provider"] != "STRIPE" {
		t.Fatalf("expected linked account response, got %#v", body)
	}

	wallet := getWallet(t, handler, externalWallet.ID)
	if wallet.Status != "active" {
		t.Fatalf("expected linked external wallet to become active, got %+v", wallet)
	}
}

func TestWalletServiceUpsertsLinkedAccountForSameWalletProvider(t *testing.T) {
	handler := testHandler()
	externalWallet := createWallet(t, handler, "external", "owner_registered_1", "GBP")

	first := postJSON(t, handler, "/v1/wallets/"+externalWallet.ID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_pending",
		"connection_type":     "BOTH",
		"status":              "PENDING",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_pending",
		"currency":            "GBP",
	}, http.StatusCreated)
	second := postJSON(t, handler, "/v1/wallets/"+externalWallet.ID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_connected",
		"connection_type":     "BOTH",
		"status":              "CONNECTED",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_connected",
		"currency":            "GBP",
	}, http.StatusCreated)
	if first["id"] != second["id"] {
		t.Fatalf("expected linked account upsert to preserve id, got %v and %v", first["id"], second["id"])
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/wallets/"+externalWallet.ID+"/linked-accounts", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected linked account list status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Data []domain.LinkedAccount `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode linked account list: %v", err)
	}
	if len(body.Data) != 1 || body.Data[0].ProviderAccountID != "acct_connected" || body.Data[0].Status != domain.LinkedAccountConnected {
		t.Fatalf("expected one connected linked account after upsert, got %+v", body.Data)
	}
}

func TestWalletServiceAllowsSharedProviderAccountAndReportsConnectedWalletCount(t *testing.T) {
	handler := testHandler()
	firstWallet := createWallet(t, handler, "external", "owner_registered_1", "GBP")
	secondWallet := createWallet(t, handler, "external", "owner_registered_2", "GBP")

	postJSON(t, handler, "/v1/wallets/"+firstWallet.ID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_shared",
		"connection_type":     "BOTH",
		"status":              "CONNECTED",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_shared",
		"currency":            "GBP",
	}, http.StatusCreated)
	second := postJSON(t, handler, "/v1/wallets/"+secondWallet.ID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_shared",
		"connection_type":     "BOTH",
		"status":              "CONNECTED",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_shared",
		"currency":            "GBP",
	}, http.StatusCreated)

	if second["connected_wallet_count"] != float64(2) {
		t.Fatalf("expected shared provider account to report 2 connected wallets, got %#v", second)
	}

	disabled := postJSON(t, handler, "/v1/wallets/"+firstWallet.ID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_shared",
		"connection_type":     "BOTH",
		"status":              "DISABLED",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_shared",
		"currency":            "GBP",
	}, http.StatusCreated)
	if disabled["connected_wallet_count"] != float64(1) || disabled["status"] != "DISABLED" {
		t.Fatalf("expected disabling one wallet to leave one connected wallet, got %#v", disabled)
	}

	secondAccounts := listLinkedAccounts(t, handler, secondWallet.ID)
	if len(secondAccounts) != 1 || secondAccounts[0].Status != domain.LinkedAccountConnected || secondAccounts[0].ConnectedWallets != 1 {
		t.Fatalf("expected second wallet to remain connected to shared account, got %+v", secondAccounts)
	}
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

func getWallet(t *testing.T, handler http.Handler, walletID string) walletResponse {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/v1/wallets/"+walletID, nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected wallet status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var wallet walletResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &wallet); err != nil {
		t.Fatalf("decode wallet: %v", err)
	}
	return wallet
}

func linkExternalWallet(t *testing.T, handler http.Handler, walletID string) {
	t.Helper()
	postJSON(t, handler, "/v1/wallets/"+walletID+"/linked-accounts", "", map[string]interface{}{
		"provider":            "STRIPE",
		"provider_account_id": "acct_" + walletID,
		"connection_type":     "BOTH",
		"status":              "CONNECTED",
		"display_name":        "Stripe Connect",
		"external_reference":  "acct_" + walletID,
		"currency":            "GBP",
	}, http.StatusCreated)
}

func listLinkedAccounts(t *testing.T, handler http.Handler, walletID string) []domain.LinkedAccount {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/v1/wallets/"+walletID+"/linked-accounts", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected linked account status 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Data []domain.LinkedAccount `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode linked accounts: %v", err)
	}
	return body.Data
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

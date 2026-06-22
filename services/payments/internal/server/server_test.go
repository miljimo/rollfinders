package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"payments/internal/config"
)

func testServer(databaseURL string) http.Handler {
	return New(Options{
		Config: config.Config{
			Port:                     "8080",
			DatabaseURL:              databaseURL,
			APIKey:                   "test-key",
			PublicBaseURL:            "https://payments.rollfinders.test",
			DefaultClientID:          "rollfinders",
			DefaultClientName:        "Rollfinders",
			DefaultClientCallbackURL: "https://rollfinders.test/payments/status",
			MetricsEnabled:           true,
		},
		Logger: slog.Default(),
	})
}

func authed(req *http.Request) *http.Request {
	req.Header.Set("Authorization", "Bearer test-key")
	return req
}

func TestHealthDoesNotRequireDatabase(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}
}

func TestReadyFailsWithoutDatabaseURL(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", res.Code)
	}
}

func TestCreatePaymentRequiresJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewBufferString(`{}`))
	authed(req)
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("expected status 415, got %d", res.Code)
	}
}

func TestCreatePaymentRequiresIdempotencyKey(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewBufferString(`{}`))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestCreatePaymentRejectsInvalidFields(t *testing.T) {
	body := map[string]any{
		"amount":              0,
		"currency":            "gbp",
		"provider":            "adyen",
		"payment_method_type": "card",
	}
	data, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(data))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "test-key")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestCreatePaymentRejectsRawCardData(t *testing.T) {
	body := []byte(`{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"card","card_number":"4242424242424242"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "test-key")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestCreatePaymentValidRequestCreatesPayment(t *testing.T) {
	body := []byte(`{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"card"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "test-key")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", res.Code)
	}
}

func TestCreatePaymentAcceptsStripeGooglePay(t *testing.T) {
	body := []byte(`{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"google_pay"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "google-pay-payment")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", res.Code, res.Body.String())
	}
}

func TestCreatePaymentRejectsProviderMethodMismatch(t *testing.T) {
	body := []byte(`{"amount":1299,"currency":"GBP","provider":"paypal","payment_method_type":"google_pay"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "google-pay-paypal-mismatch")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", res.Code, res.Body.String())
	}
}

func TestCreateCheckoutCreatesCheckout(t *testing.T) {
	body := []byte(`{"resource_type":"course_occurrence","resource_id":"course_123:2026-06-08:19:00","resource_label":"Beginner BJJ","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com","metadata":{"course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08"}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "checkout-test")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", res.Code, res.Body.String())
	}

	var checkout Checkout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}
	if checkout.PaymentID == "" || checkout.CheckoutSessionID == "" || checkout.CheckoutURL == "" {
		t.Fatalf("expected checkout ids and url, got %+v", checkout)
	}
	if checkout.ResourceType != "course_occurrence" || checkout.ResourceID != "course_123:2026-06-08:19:00" {
		t.Fatalf("unexpected checkout resource: %+v", checkout)
	}
	if checkout.Metadata["course_id"] != "course_123" || checkout.Metadata["academy_id"] != "academy_123" {
		t.Fatalf("expected course metadata on checkout, got %+v", checkout.Metadata)
	}
	if !strings.HasPrefix(checkout.SuccessURL, "https://payments.rollfinders.test/v1/checkouts/") {
		t.Fatalf("expected service-owned success callback url, got %s", checkout.SuccessURL)
	}
	if !strings.HasPrefix(checkout.CancelURL, "https://payments.rollfinders.test/v1/checkouts/") {
		t.Fatalf("expected service-owned cancel callback url, got %s", checkout.CancelURL)
	}
}

func TestCreateCheckoutRejectsMissingResource(t *testing.T) {
	body := []byte(`{"amount":1000,"currency":"GBP","provider":"stripe","payment_method_type":"card","payer_email":"student@example.com"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "checkout-invalid")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestLegacyCourseOccurrenceCheckoutRouteRemainsCompatible(t *testing.T) {
	body := []byte(`{"course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08","occurrence_start_time":"19:00","occurrence_end_time":"20:30","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "legacy-checkout")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", res.Code, res.Body.String())
	}
	var checkout Checkout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}
	if checkout.ResourceType != "course_occurrence" || checkout.Metadata["course_id"] != "course_123" {
		t.Fatalf("expected legacy course request to map to generic checkout, got %+v", checkout)
	}
}

func TestCheckoutCallbackRedirectsToApplicationStatus(t *testing.T) {
	srv := testServer("")
	body := []byte(`{"resource_type":"course_occurrence","resource_id":"course_123:2026-06-08:19:00","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com","metadata":{"course_id":"course_123","academy_id":"academy_123"}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "callback-checkout")
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", res.Code, res.Body.String())
	}

	var checkout Checkout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}

	callbackReq := httptest.NewRequest(http.MethodGet, "/v1/checkouts/"+checkout.CheckoutSessionID+"/callbacks/success", nil)
	callbackRes := httptest.NewRecorder()
	srv.ServeHTTP(callbackRes, callbackReq)
	if callbackRes.Code != http.StatusFound {
		t.Fatalf("expected status 302, got %d", callbackRes.Code)
	}
	location := callbackRes.Header().Get("Location")
	if !strings.HasPrefix(location, "https://rollfinders.test/payments/status?") {
		t.Fatalf("expected application status redirect, got %s", location)
	}
	for _, expected := range []string{
		"checkout_session_id=" + checkout.CheckoutSessionID,
		"payment_id=" + checkout.PaymentID,
		"resource_type=course_occurrence",
		"resource_id=course_123%3A2026-06-08%3A19%3A00",
		"metadata_course_id=course_123",
		"metadata_academy_id=academy_123",
		"result=success",
		"payment_status=requires_action",
	} {
		if !strings.Contains(location, expected) {
			t.Fatalf("expected redirect location %q to contain %q", location, expected)
		}
	}
}

func TestPayoutRequestHappyPathAndBalanceReservation(t *testing.T) {
	srv := testServer("")
	createSucceededPayment(t, srv, "payment-payout-1", 1000, map[string]string{
		"client_id":                  "rollfinders",
		"payee_id":                   "academy_123",
		"platform_fee_amount":        "50",
		"stripe_destination_account": "acct_test",
	})
	createSucceededPayment(t, srv, "payment-payout-2", 500, map[string]string{
		"client_id": "rollfinders",
		"payee_id":  "academy_123",
	})

	balance := getPayeeBalanceForTest(t, srv, "academy_123", "rollfinders")
	if balance.AvailablePayoutAmount != 1450 || balance.PlatformFeeAmount != 50 {
		t.Fatalf("expected available 1450 and fee 50, got %+v", balance)
	}

	payout := createPayoutRequestForTest(t, srv, "academy_123", "payout-key-1", 1000)
	if payout.Status != payoutStatusPendingReview || payout.Amount != 1000 {
		t.Fatalf("unexpected payout request: %+v", payout)
	}

	balance = getPayeeBalanceForTest(t, srv, "academy_123", "rollfinders")
	if balance.AvailablePayoutAmount != 450 || balance.PendingPayoutAmount != 1000 {
		t.Fatalf("expected reserved balance after payout request, got %+v", balance)
	}

	replay := createPayoutRequestForTest(t, srv, "academy_123", "payout-key-1", 1000)
	if replay.ID != payout.ID {
		t.Fatalf("expected idempotent replay to return same payout id, got %s and %s", replay.ID, payout.ID)
	}
}

func TestPayoutRequestRejectsUnavailableBalanceAndInvalidTransitions(t *testing.T) {
	srv := testServer("")
	createSucceededPayment(t, srv, "payment-payout-invalid", 500, map[string]string{
		"client_id":                  "rollfinders",
		"academy_id":                 "academy_456",
		"stripe_destination_account": "acct_test",
	})

	body := []byte(`{"client_id":"rollfinders","amount":600,"currency":"GBP","destination_account_id":"acct_test"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/payees/academy_456/payout-requests", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "payout-too-large")
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusConflict {
		t.Fatalf("expected status 409 for unavailable balance, got %d: %s", res.Code, res.Body.String())
	}

	payout := createPayoutRequestForTest(t, srv, "academy_456", "payout-key-2", 500)
	transitionReq := httptest.NewRequest(http.MethodPost, "/v1/payout-requests/"+payout.ID+"/mark-paid", bytes.NewReader([]byte(`{"provider_reference":"manual_1"}`)))
	authed(transitionReq)
	transitionReq.Header.Set("Content-Type", "application/json")
	transitionRes := httptest.NewRecorder()
	srv.ServeHTTP(transitionRes, transitionReq)
	if transitionRes.Code != http.StatusConflict {
		t.Fatalf("expected status 409 for invalid transition, got %d: %s", transitionRes.Code, transitionRes.Body.String())
	}
}

func TestRejectedPayoutRequestReleasesBalance(t *testing.T) {
	srv := testServer("")
	createSucceededPayment(t, srv, "payment-payout-release", 800, map[string]string{
		"client_id":                  "rollfinders",
		"payee_id":                   "academy_789",
		"stripe_destination_account": "acct_test",
	})
	payout := createPayoutRequestForTest(t, srv, "academy_789", "payout-key-3", 800)

	rejectReq := httptest.NewRequest(http.MethodPost, "/v1/payout-requests/"+payout.ID+"/reject", bytes.NewReader([]byte(`{"actor_id":"admin_1","reason":"duplicate request"}`)))
	authed(rejectReq)
	rejectReq.Header.Set("Content-Type", "application/json")
	rejectRes := httptest.NewRecorder()
	srv.ServeHTTP(rejectRes, rejectReq)
	if rejectRes.Code != http.StatusOK {
		t.Fatalf("expected status 200 for reject, got %d: %s", rejectRes.Code, rejectRes.Body.String())
	}

	balance := getPayeeBalanceForTest(t, srv, "academy_789", "rollfinders")
	if balance.AvailablePayoutAmount != 800 || balance.PendingPayoutAmount != 0 {
		t.Fatalf("expected rejected payout to release funds, got %+v", balance)
	}
}

func createSucceededPayment(t *testing.T, srv http.Handler, key string, amount int64, metadata map[string]string) Payment {
	t.Helper()
	body := map[string]any{
		"amount":              amount,
		"currency":            "GBP",
		"provider":            "stripe",
		"payment_method_type": "card",
		"metadata":            metadata,
	}
	data, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(data))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", key)
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected payment status 201, got %d: %s", res.Code, res.Body.String())
	}
	var payment Payment
	if err := json.Unmarshal(res.Body.Bytes(), &payment); err != nil {
		t.Fatal(err)
	}
	return payment
}

func getPayeeBalanceForTest(t *testing.T, srv http.Handler, payeeID string, clientID string) PayeeBalance {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/v1/payees/"+payeeID+"/balances?client_id="+clientID+"&currency=GBP", nil)
	authed(req)
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected balance status 200, got %d: %s", res.Code, res.Body.String())
	}
	var balance PayeeBalance
	if err := json.Unmarshal(res.Body.Bytes(), &balance); err != nil {
		t.Fatal(err)
	}
	return balance
}

func createPayoutRequestForTest(t *testing.T, srv http.Handler, payeeID string, key string, amount int64) PayoutRequest {
	t.Helper()
	body := map[string]any{
		"client_id":              "rollfinders",
		"amount":                 amount,
		"currency":               "GBP",
		"destination_account_id": "acct_test",
		"requested_by":           "academy_admin_1",
		"notes":                  "test payout",
	}
	data, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/v1/payees/"+payeeID+"/payout-requests", bytes.NewReader(data))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", key)
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected payout request status 201, got %d: %s", res.Code, res.Body.String())
	}
	var payout PayoutRequest
	if err := json.Unmarshal(res.Body.Bytes(), &payout); err != nil {
		t.Fatal(err)
	}
	return payout
}

func TestRegisteredClientCallbackReceivesCheckoutStatus(t *testing.T) {
	srv := testServer("")
	clientBody := []byte(`{"id":"partner_app","name":"Partner App","callback_url":"https://partner.test/payments/callback"}`)
	clientReq := httptest.NewRequest(http.MethodPost, "/v1/clients", bytes.NewReader(clientBody))
	authed(clientReq)
	clientReq.Header.Set("Content-Type", "application/json")
	clientRes := httptest.NewRecorder()
	srv.ServeHTTP(clientRes, clientReq)
	if clientRes.Code != http.StatusCreated {
		t.Fatalf("expected client status 201, got %d: %s", clientRes.Code, clientRes.Body.String())
	}

	body := []byte(`{"client_id":"partner_app","client_state":"order_abc","resource_type":"invoice","resource_id":"invoice_123","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "partner-checkout")
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected checkout status 201, got %d: %s", res.Code, res.Body.String())
	}
	var checkout Checkout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}
	if checkout.ClientID != "partner_app" || checkout.ClientState != "order_abc" {
		t.Fatalf("expected client metadata on checkout, got %+v", checkout)
	}

	callbackReq := httptest.NewRequest(http.MethodGet, "/v1/checkouts/"+checkout.CheckoutSessionID+"/callbacks/success", nil)
	callbackRes := httptest.NewRecorder()
	srv.ServeHTTP(callbackRes, callbackReq)
	location := callbackRes.Header().Get("Location")
	if !strings.HasPrefix(location, "https://partner.test/payments/callback?") {
		t.Fatalf("expected partner callback redirect, got %s", location)
	}
	for _, expected := range []string{"client_id=partner_app", "state=order_abc", "payment_id=" + checkout.PaymentID} {
		if !strings.Contains(location, expected) {
			t.Fatalf("expected redirect location %q to contain %q", location, expected)
		}
	}
}

func TestCreateCheckoutRejectsUnknownClient(t *testing.T) {
	body := []byte(`{"client_id":"missing_client","resource_type":"invoice","resource_id":"invoice_123","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "unknown-client-checkout")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", res.Code, res.Body.String())
	}
}

func TestCreateCheckoutIdempotentReplay(t *testing.T) {
	srv := testServer("")
	body := []byte(`{"resource_type":"course_occurrence","resource_id":"course_123:2026-06-08:19:00","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com"}`)
	var first Checkout
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
		authed(req)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", "same-checkout")
		res := httptest.NewRecorder()
		srv.ServeHTTP(res, req)
		if res.Code != http.StatusCreated {
			t.Fatalf("request %d expected status 201, got %d", i+1, res.Code)
		}
		var checkout Checkout
		if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
			t.Fatal(err)
		}
		if i == 0 {
			first = checkout
			continue
		}
		if checkout.CheckoutSessionID != first.CheckoutSessionID || checkout.PaymentID != first.PaymentID {
			t.Fatalf("expected replayed checkout, first=%+v second=%+v", first, checkout)
		}
	}
}

func TestListPaymentsReturnsStoredTransactionHistory(t *testing.T) {
	srv := testServer("")
	firstBody := []byte(`{"resource_type":"invoice","resource_id":"invoice_123","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com"}`)
	secondBody := []byte(`{"resource_type":"invoice","resource_id":"invoice_456","amount":2500,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"other@example.com"}`)
	for key, body := range map[string][]byte{"history-one": firstBody, "history-two": secondBody} {
		req := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
		authed(req)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", key)
		res := httptest.NewRecorder()
		srv.ServeHTTP(res, req)
		if res.Code != http.StatusCreated {
			t.Fatalf("expected checkout status 201, got %d: %s", res.Code, res.Body.String())
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/payments?payer_email=student@example.com&resource_type=invoice", nil)
	authed(req)
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected history status 200, got %d: %s", res.Code, res.Body.String())
	}
	var history PaymentHistoryResponse
	if err := json.Unmarshal(res.Body.Bytes(), &history); err != nil {
		t.Fatal(err)
	}
	if history.Count != 1 || len(history.Payments) != 1 {
		t.Fatalf("expected one payment history record, got %+v", history)
	}
	record := history.Payments[0]
	if record.Payment.ID == "" || record.CheckoutSessionID == "" {
		t.Fatalf("expected payment and checkout ids in history, got %+v", record)
	}
	if record.ResourceID != "invoice_123" || record.PayerEmail != "student@example.com" {
		t.Fatalf("unexpected history record: %+v", record)
	}
}

func TestListPaymentsCanFilterByResourceID(t *testing.T) {
	srv := testServer("")
	body := []byte(`{"resource_type":"invoice","resource_id":"invoice_history_789","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com"}`)
	createReq := httptest.NewRequest(http.MethodPost, "/v1/checkouts", bytes.NewReader(body))
	authed(createReq)
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Idempotency-Key", "history-resource")
	createRes := httptest.NewRecorder()
	srv.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected checkout status 201, got %d: %s", createRes.Code, createRes.Body.String())
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/payments?resource_id=invoice_history_789", nil)
	authed(req)
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected history status 200, got %d: %s", res.Code, res.Body.String())
	}
	var history PaymentHistoryResponse
	if err := json.Unmarshal(res.Body.Bytes(), &history); err != nil {
		t.Fatal(err)
	}
	if history.Count != 1 || history.Payments[0].ResourceID != "invoice_history_789" {
		t.Fatalf("expected resource-filtered payment history, got %+v", history)
	}
}

func TestCreatePaymentIdempotentReplay(t *testing.T) {
	srv := testServer("")
	body := []byte(`{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"card"}`)
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(body))
		authed(req)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", "same-key")
		res := httptest.NewRecorder()
		srv.ServeHTTP(res, req)
		if res.Code != http.StatusCreated {
			t.Fatalf("request %d expected status 201, got %d", i+1, res.Code)
		}
	}
}

func TestRefundUpdatesPaymentStatus(t *testing.T) {
	srv := testServer("")
	createBody := []byte(`{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"card"}`)
	createReq := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(createBody))
	authed(createReq)
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Idempotency-Key", "create-refund-test")
	createRes := httptest.NewRecorder()
	srv.ServeHTTP(createRes, createReq)

	var payment Payment
	if err := json.Unmarshal(createRes.Body.Bytes(), &payment); err != nil {
		t.Fatal(err)
	}
	refundReq := httptest.NewRequest(http.MethodPost, "/v1/payments/"+payment.ID+"/refunds", bytes.NewReader([]byte(`{"amount":1299,"reason":"requested_by_customer"}`)))
	authed(refundReq)
	refundReq.Header.Set("Content-Type", "application/json")
	refundReq.Header.Set("Idempotency-Key", "refund-test")
	refundRes := httptest.NewRecorder()
	srv.ServeHTTP(refundRes, refundReq)
	if refundRes.Code != http.StatusCreated {
		t.Fatalf("expected refund status 201, got %d: %s", refundRes.Code, refundRes.Body.String())
	}
}

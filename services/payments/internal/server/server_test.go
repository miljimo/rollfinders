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
			Port:                        "8080",
			DatabaseURL:                 databaseURL,
			APIKey:                      "test-key",
			PublicBaseURL:               "https://payments.rollfinders.test",
			ApplicationPaymentStatusURL: "https://rollfinders.test/payments/status",
			MetricsEnabled:              true,
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

func TestCreateCourseOccurrenceCheckoutCreatesCheckout(t *testing.T) {
	body := []byte(`{"course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08","occurrence_start_time":"19:00","occurrence_end_time":"20:30","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "checkout-test")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", res.Code, res.Body.String())
	}

	var checkout CourseOccurrenceCheckout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}
	if checkout.PaymentID == "" || checkout.CheckoutSessionID == "" || checkout.CheckoutURL == "" {
		t.Fatalf("expected checkout ids and url, got %+v", checkout)
	}
	if checkout.CourseID != "course_123" || checkout.OccurrenceDate != "2026-06-08" {
		t.Fatalf("unexpected checkout course occurrence: %+v", checkout)
	}
	if !strings.HasPrefix(checkout.SuccessURL, "https://payments.rollfinders.test/v1/course-occurrence-checkouts/") {
		t.Fatalf("expected service-owned success callback url, got %s", checkout.SuccessURL)
	}
	if !strings.HasPrefix(checkout.CancelURL, "https://payments.rollfinders.test/v1/course-occurrence-checkouts/") {
		t.Fatalf("expected service-owned cancel callback url, got %s", checkout.CancelURL)
	}
}

func TestCreateCourseOccurrenceCheckoutRejectsMissingOccurrence(t *testing.T) {
	body := []byte(`{"course_id":"course_123","academy_id":"academy_123","amount":1000,"currency":"GBP","provider":"stripe","payment_method_type":"card","payer_email":"student@example.com"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "checkout-invalid")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestCourseOccurrenceCheckoutCallbackRedirectsToApplicationStatus(t *testing.T) {
	srv := testServer("")
	body := []byte(`{"course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08","occurrence_start_time":"19:00","occurrence_end_time":"20:30","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "callback-checkout")
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", res.Code, res.Body.String())
	}

	var checkout CourseOccurrenceCheckout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}

	callbackReq := httptest.NewRequest(http.MethodGet, "/v1/course-occurrence-checkouts/"+checkout.CheckoutSessionID+"/callbacks/success", nil)
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
		"course_id=course_123",
		"academy_id=academy_123",
		"result=success",
		"payment_status=requires_action",
	} {
		if !strings.Contains(location, expected) {
			t.Fatalf("expected redirect location %q to contain %q", location, expected)
		}
	}
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

	body := []byte(`{"client_id":"partner_app","client_state":"order_abc","course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08","occurrence_start_time":"19:00","occurrence_end_time":"20:30","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "partner-checkout")
	res := httptest.NewRecorder()
	srv.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected checkout status 201, got %d: %s", res.Code, res.Body.String())
	}
	var checkout CourseOccurrenceCheckout
	if err := json.Unmarshal(res.Body.Bytes(), &checkout); err != nil {
		t.Fatal(err)
	}
	if checkout.ClientID != "partner_app" || checkout.ClientState != "order_abc" {
		t.Fatalf("expected client metadata on checkout, got %+v", checkout)
	}

	callbackReq := httptest.NewRequest(http.MethodGet, "/v1/course-occurrence-checkouts/"+checkout.CheckoutSessionID+"/callbacks/success", nil)
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

func TestCreateCourseOccurrenceCheckoutRejectsUnknownClient(t *testing.T) {
	body := []byte(`{"client_id":"missing_client","course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08","occurrence_start_time":"19:00","occurrence_end_time":"20:30","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
	authed(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "unknown-client-checkout")
	res := httptest.NewRecorder()
	testServer("").ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", res.Code, res.Body.String())
	}
}

func TestCreateCourseOccurrenceCheckoutIdempotentReplay(t *testing.T) {
	srv := testServer("")
	body := []byte(`{"course_id":"course_123","academy_id":"academy_123","occurrence_date":"2026-06-08","occurrence_start_time":"19:00","occurrence_end_time":"20:30","amount":1000,"currency":"GBP","provider":"paypal","payment_method_type":"paypal","payer_email":"student@example.com"}`)
	var first CourseOccurrenceCheckout
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/course-occurrence-checkouts", bytes.NewReader(body))
		authed(req)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", "same-checkout")
		res := httptest.NewRecorder()
		srv.ServeHTTP(res, req)
		if res.Code != http.StatusCreated {
			t.Fatalf("request %d expected status 201, got %d", i+1, res.Code)
		}
		var checkout CourseOccurrenceCheckout
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

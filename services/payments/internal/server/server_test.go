package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"payments/internal/config"
)

func testServer(databaseURL string) http.Handler {
	return New(Options{
		Config: config.Config{Port: "8080", DatabaseURL: databaseURL, APIKey: "test-key", MetricsEnabled: true},
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

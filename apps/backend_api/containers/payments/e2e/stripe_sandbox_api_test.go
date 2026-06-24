package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type checkoutResponse struct {
	CheckoutSessionID string            `json:"checkout_session_id"`
	CheckoutURL       string            `json:"checkout_url"`
	PaymentID         string            `json:"payment_id"`
	Provider          string            `json:"provider"`
	SuccessURL        string            `json:"success_url"`
	CancelURL         string            `json:"cancel_url"`
	NextAction        map[string]string `json:"next_action"`
}

type paymentResponse struct {
	ID                string            `json:"id"`
	Provider          string            `json:"provider"`
	Status            string            `json:"status"`
	ProviderPaymentID string            `json:"provider_payment_id"`
	NextAction        map[string]string `json:"next_action"`
}

func TestStripeSandboxCheckoutEndToEnd(t *testing.T) {
	if os.Getenv("RUN_PAYMENT_E2E") != "1" {
		t.Skip("set RUN_PAYMENT_E2E=1 to run payment API e2e tests")
	}
	loadDotEnv(t)

	stripeKey := firstNonEmpty(os.Getenv("STRIPE_SECRET_KEY"), os.Getenv("PAYMENT_GATEWAY_API_KEY"))
	if stripeKey == "" {
		t.Skip("STRIPE_SECRET_KEY or PAYMENT_GATEWAY_API_KEY is required")
	}

	baseURL := strings.TrimRight(firstNonEmpty(os.Getenv("PAYMENT_PUBLIC_BASE_URL"), "http://localhost:3002"), "/")
	httpClient := &http.Client{Timeout: 15 * time.Second}

	assertHealth(t, httpClient, baseURL)

	idempotencyKey := fmt.Sprintf("stripe-e2e-%d", time.Now().UnixNano())
	body := map[string]any{
		"client_id":           "rollfinders",
		"client_state":        "stripe-e2e",
		"resource_type":       "invoice",
		"resource_id":         "stripe_e2e_invoice",
		"resource_label":      "Stripe sandbox e2e invoice",
		"amount":              1500,
		"currency":            "GBP",
		"provider":            "stripe",
		"payment_method_type": "card",
		"payer_email":         "sandbox@example.com",
		"metadata": map[string]string{
			"source": "payment-api-e2e",
		},
	}
	var checkout checkoutResponse
	doJSON(t, httpClient, http.MethodPost, baseURL+"/v1/checkouts", idempotencyKey, body, http.StatusCreated, &checkout)

	if checkout.CheckoutSessionID == "" || checkout.PaymentID == "" {
		t.Fatalf("expected checkout and payment ids, got %+v", checkout)
	}
	if !strings.HasPrefix(checkout.CheckoutURL, "https://checkout.stripe.com/") {
		t.Fatalf("expected Stripe checkout URL, got %q", checkout.CheckoutURL)
	}
	if !strings.HasPrefix(checkout.SuccessURL, baseURL+"/v1/checkouts/") {
		t.Fatalf("expected service-owned success URL, got %q", checkout.SuccessURL)
	}

	var payment paymentResponse
	doJSON(t, httpClient, http.MethodGet, baseURL+"/v1/payments/"+url.PathEscape(checkout.PaymentID), "", nil, http.StatusOK, &payment)
	if payment.Provider != "stripe" || payment.ProviderPaymentID == "" {
		t.Fatalf("expected Stripe provider payment id, got %+v", payment)
	}
	if payment.NextAction["url"] != checkout.CheckoutURL {
		t.Fatalf("expected payment next action URL to match checkout URL, payment=%+v checkout=%+v", payment, checkout)
	}

	session := fetchStripeCheckoutSession(t, httpClient, stripeKey, payment.ProviderPaymentID)
	if session.ID != payment.ProviderPaymentID {
		t.Fatalf("expected Stripe session id %q, got %q", payment.ProviderPaymentID, session.ID)
	}
	if session.LiveMode {
		t.Fatal("expected Stripe sandbox session with livemode=false")
	}
}

func assertHealth(t *testing.T, client *http.Client, baseURL string) {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, baseURL+"/healthz", nil)
	if err != nil {
		t.Fatal(err)
	}
	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("payment API is not reachable at %s: %v", baseURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected payment API health 200, got %d", res.StatusCode)
	}
}

func doJSON(t *testing.T, client *http.Client, method string, endpoint string, idempotencyKey string, body any, expectedStatus int, target any) {
	t.Helper()
	var payload io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		payload = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, endpoint, payload)
	if err != nil {
		t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	res, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != expectedStatus {
		t.Fatalf("expected %s %s status %d, got %d: %s", method, endpoint, expectedStatus, res.StatusCode, string(responseBody))
	}
	if target != nil {
		if err := json.Unmarshal(responseBody, target); err != nil {
			t.Fatalf("decode response: %v body=%s", err, string(responseBody))
		}
	}
}

type stripeCheckoutSession struct {
	ID       string `json:"id"`
	LiveMode bool   `json:"livemode"`
}

func fetchStripeCheckoutSession(t *testing.T, client *http.Client, key string, sessionID string) stripeCheckoutSession {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/checkout/sessions/"+url.PathEscape(sessionID), nil)
	if err != nil {
		t.Fatal(err)
	}
	req.SetBasicAuth(key, "")
	res, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected Stripe session lookup 200, got %d: %s", res.StatusCode, redactStripeBody(body))
	}
	var session stripeCheckoutSession
	if err := json.Unmarshal(body, &session); err != nil {
		t.Fatalf("decode Stripe session: %v body=%s", err, string(body))
	}
	return session
}

func loadDotEnv(t *testing.T) {
	t.Helper()
	for _, candidate := range []string{
		".env",
		filepath.Join("..", ".env"),
		filepath.Join("..", "..", ".env"),
		filepath.Join("..", "..", "..", ".env"),
		filepath.Join("..", ".env.local"),
		filepath.Join("..", "..", ".env.local"),
		filepath.Join("..", "..", "..", ".env.local"),
	} {
		content, err := os.ReadFile(candidate)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(content), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
				continue
			}
			key, value, _ := strings.Cut(line, "=")
			key = strings.TrimSpace(key)
			value = strings.Trim(strings.TrimSpace(value), `"'`)
			if key != "" && os.Getenv(key) == "" {
				t.Setenv(key, value)
			}
		}
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func redactStripeBody(body []byte) string {
	var parsed struct {
		Error struct {
			Type    string `json:"type"`
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err == nil && parsed.Error.Message != "" {
		return fmt.Sprintf("%s:%s:%s", parsed.Error.Type, parsed.Error.Code, parsed.Error.Message)
	}
	return "redacted"
}

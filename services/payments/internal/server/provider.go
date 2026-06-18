package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
)

var errUnsupportedProvider = errors.New("unsupported provider")

type providerAdapter interface {
	CreatePayment(createPaymentRequest, string) (providerResult, error)
	Refresh(Payment) (providerResult, error)
	Capture(Payment, string) (providerResult, error)
	Cancel(Payment, string) (providerResult, error)
	Refund(Payment, refundRequest, string) (providerResult, error)
	ParseWebhook([]byte, map[string]string) (webhookEvent, error)
}

type providerResult struct {
	ProviderID string
	Status     string
	RawStatus  string
	NextAction map[string]string
}

type providerRegistry map[string]providerAdapter

func (r providerRegistry) get(name string) (providerAdapter, error) {
	adapter, ok := r[name]
	if !ok {
		return nil, errUnsupportedProvider
	}
	return adapter, nil
}

type stripeAdapter struct {
	secret stripeSecretResolver
}
type paypalAdapter struct{}

type stripeSecretResolver struct {
	envValue string
	filePath string
}

func (r stripeSecretResolver) value() string {
	if strings.TrimSpace(r.filePath) != "" {
		content, err := os.ReadFile(r.filePath)
		if err == nil && strings.TrimSpace(string(content)) != "" {
			return strings.TrimSpace(string(content))
		}
	}
	return strings.TrimSpace(r.envValue)
}

func (r stripeSecretResolver) configured() bool {
	return r.value() != ""
}

func (a stripeAdapter) CreatePayment(req createPaymentRequest, key string) (providerResult, error) {
	if a.secret.configured() && req.Metadata["payment_checkout_success_url"] != "" && req.Metadata["payment_checkout_cancel_url"] != "" {
		return a.createCheckoutSession(req, key)
	}
	status := statusSucceeded
	raw := "succeeded"
	action := map[string]string(nil)
	if req.CaptureMethod == "manual" {
		status, raw = statusAuthorized, "requires_capture"
	}
	if req.Metadata["requires_action"] == "true" {
		status, raw = statusRequiresAction, "requires_action"
		action = map[string]string{"type": "stripe_next_action", "client_secret": "redacted"}
	}
	if a.secret.configured() {
		if action == nil {
			action = map[string]string{}
		}
		action["provider_credentials"] = "configured"
	}
	return providerResult{ProviderID: "pi_" + shortKey(key), Status: status, RawStatus: raw, NextAction: action}, nil
}

func (a stripeAdapter) createCheckoutSession(req createPaymentRequest, key string) (providerResult, error) {
	form := url.Values{}
	form.Set("mode", "payment")
	form.Set("payment_method_types[0]", stripeCheckoutPaymentMethodType(req.PaymentMethodType))
	form.Set("success_url", req.Metadata["payment_checkout_success_url"])
	form.Set("cancel_url", req.Metadata["payment_checkout_cancel_url"])
	form.Set("line_items[0][quantity]", "1")
	form.Set("line_items[0][price_data][currency]", strings.ToLower(req.Currency))
	form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(req.Amount, 10))
	name := req.Metadata["resource_label"]
	if name == "" {
		name = req.Metadata["resource_type"] + " " + req.Metadata["resource_id"]
	}
	if strings.TrimSpace(name) == "" {
		name = "Payment"
	}
	form.Set("line_items[0][price_data][product_data][name]", name)
	if email := strings.TrimSpace(req.Metadata["payer_email"]); email != "" {
		form.Set("customer_email", email)
	}
	for metadataKey, metadataValue := range req.Metadata {
		if metadataValue == "" || strings.HasPrefix(metadataKey, "payment_checkout_") {
			continue
		}
		form.Set("payment_intent_data[metadata]["+metadataKey+"]", metadataValue)
		form.Set("metadata["+metadataKey+"]", metadataValue)
	}

	httpReq, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return providerResult{}, err
	}
	httpReq.SetBasicAuth(a.secret.value(), "")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if key != "" {
		httpReq.Header.Set("Idempotency-Key", key)
	}

	res, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return providerResult{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return providerResult{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return providerResult{}, fmt.Errorf("stripe checkout session failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var session struct {
		ID            string `json:"id"`
		URL           string `json:"url"`
		Status        string `json:"status"`
		PaymentIntent string `json:"payment_intent"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return providerResult{}, err
	}
	if session.ID == "" || session.URL == "" {
		return providerResult{}, errors.New("stripe checkout session response missing id or url")
	}
	rawStatus := session.Status
	if rawStatus == "" {
		rawStatus = "open"
	}
	return providerResult{
		ProviderID: session.ID,
		Status:     statusRequiresAction,
		RawStatus:  rawStatus,
		NextAction: map[string]string{
			"type":                 "stripe_checkout",
			"url":                  session.URL,
			"provider_credentials": "configured",
		},
	}, nil
}

func stripeCheckoutPaymentMethodType(method string) string {
	if method == "google_pay" {
		return "card"
	}
	return method
}

func (a stripeAdapter) Refresh(p Payment) (providerResult, error) {
	if !a.secret.configured() || !strings.HasPrefix(p.ProviderPaymentID, "cs_") {
		return providerResult{ProviderID: p.ProviderPaymentID, Status: p.Status, RawStatus: p.ProviderRawStatus, NextAction: p.NextAction}, nil
	}
	httpReq, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/checkout/sessions/"+url.PathEscape(p.ProviderPaymentID), nil)
	if err != nil {
		return providerResult{}, err
	}
	httpReq.SetBasicAuth(a.secret.value(), "")
	res, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return providerResult{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return providerResult{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return providerResult{}, fmt.Errorf("stripe checkout session refresh failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var session struct {
		ID            string `json:"id"`
		Status        string `json:"status"`
		PaymentStatus string `json:"payment_status"`
		URL           string `json:"url"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return providerResult{}, err
	}
	status := p.Status
	switch session.PaymentStatus {
	case "paid", "no_payment_required":
		status = statusSucceeded
	case "unpaid":
		if session.Status == "expired" {
			status = statusCancelled
		} else {
			status = statusRequiresAction
		}
	}
	action := cloneMap(p.NextAction)
	if session.URL != "" {
		if action == nil {
			action = map[string]string{}
		}
		action["url"] = session.URL
	}
	return providerResult{ProviderID: p.ProviderPaymentID, Status: status, RawStatus: session.Status + ":" + session.PaymentStatus, NextAction: action}, nil
}

func redactStripeError(body []byte) string {
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

func (stripeAdapter) Capture(p Payment, key string) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusSucceeded, RawStatus: "succeeded"}, nil
}

func (stripeAdapter) Cancel(p Payment, key string) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: "canceled"}, nil
}

func (stripeAdapter) Refund(p Payment, req refundRequest, key string) (providerResult, error) {
	return providerResult{ProviderID: "re_" + shortKey(key), Status: refundSucceeded, RawStatus: "succeeded"}, nil
}

func (stripeAdapter) ParseWebhook(body []byte, headers map[string]string) (webhookEvent, error) {
	if headers["Stripe-Signature"] == "" {
		return webhookEvent{}, errors.New("missing stripe signature")
	}
	return parseWebhookJSON(body)
}

func (paypalAdapter) CreatePayment(req createPaymentRequest, key string) (providerResult, error) {
	return providerResult{
		ProviderID: "ORDER-" + shortKey(key),
		Status:     statusRequiresAction,
		RawStatus:  "CREATED",
		NextAction: map[string]string{"type": "paypal_approve", "url": fmt.Sprintf("https://www.paypal.com/checkoutnow?token=ORDER-%s", shortKey(key))},
	}, nil
}

func (paypalAdapter) Refresh(p Payment) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: p.Status, RawStatus: p.ProviderRawStatus, NextAction: p.NextAction}, nil
}

func (paypalAdapter) Capture(p Payment, key string) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusSucceeded, RawStatus: "COMPLETED"}, nil
}

func (paypalAdapter) Cancel(p Payment, key string) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: "VOIDED"}, nil
}

func (paypalAdapter) Refund(p Payment, req refundRequest, key string) (providerResult, error) {
	return providerResult{ProviderID: "PAYPAL-REFUND-" + shortKey(key), Status: refundSucceeded, RawStatus: "COMPLETED"}, nil
}

func (paypalAdapter) ParseWebhook(body []byte, headers map[string]string) (webhookEvent, error) {
	if headers["Paypal-Transmission-Sig"] == "" && headers["PayPal-Transmission-Sig"] == "" {
		return webhookEvent{}, errors.New("missing paypal signature")
	}
	return parseWebhookJSON(body)
}

func shortKey(key string) string {
	if len(key) > 12 {
		return key[:12]
	}
	return key
}

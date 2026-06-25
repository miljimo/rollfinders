package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

type stripeBillingClient struct {
	apiVersion string
	secretKey  string
}

type checkoutSession struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type billingCheckoutResult struct {
	CheckoutURL string `json:"checkout_url,omitempty"`
	SessionID   string `json:"session_id,omitempty"`
	Provider    string `json:"provider"`
}

func (c stripeBillingClient) configured() bool {
	return strings.TrimSpace(c.secretKey) != ""
}

func (c stripeBillingClient) createSubscriptionCheckout(req subscriptionCheckoutRequest, sub Subscription, plan Plan) (checkoutSession, error) {
	if !c.configured() {
		return checkoutSession{}, errors.New("stripe secret key is not configured")
	}
	form := url.Values{}
	form.Set("mode", "subscription")
	form.Set("success_url", req.SuccessURL)
	form.Set("cancel_url", req.CancelURL)
	form.Set("client_reference_id", sub.ID)
	if strings.TrimSpace(req.CustomerEmail) != "" {
		form.Set("customer_email", req.CustomerEmail)
	}
	form.Set("line_items[0][quantity]", "1")
	form.Set("line_items[0][price_data][currency]", strings.ToLower(plan.Currency))
	form.Set("line_items[0][price_data][unit_amount]", strconv.Itoa(plan.PriceMinor))
	form.Set("line_items[0][price_data][recurring][interval]", stripeRecurringInterval(plan.BillingCycle))
	form.Set("line_items[0][price_data][product_data][name]", plan.Name)
	if strings.TrimSpace(plan.Description) != "" {
		form.Set("line_items[0][price_data][product_data][description]", plan.Description)
	}
	metadata := map[string]string{
		"subscription_id": sub.ID,
		"owner_type":      sub.OwnerType,
		"owner_id":        sub.OwnerID,
		"plan_id":         plan.ID,
		"plan_name":       plan.Name,
	}
	for key, value := range metadata {
		form.Set("metadata["+key+"]", value)
		form.Set("subscription_data[metadata]["+key+"]", value)
	}
	if req.PlanChangeID != "" {
		form.Set("metadata[plan_change_id]", req.PlanChangeID)
		form.Set("subscription_data[metadata][plan_change_id]", req.PlanChangeID)
	}
	httpReq, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return checkoutSession{}, err
	}
	httpReq.SetBasicAuth(c.secretKey, "")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if c.apiVersion != "" {
		httpReq.Header.Set("Stripe-Version", c.apiVersion)
	}
	if req.IdempotencyKey != "" {
		httpReq.Header.Set("Idempotency-Key", req.IdempotencyKey)
	}
	res, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return checkoutSession{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return checkoutSession{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return checkoutSession{}, fmt.Errorf("stripe subscription checkout failed: status=%d body=%s", res.StatusCode, redactBillingProviderError(body))
	}
	var session checkoutSession
	if err := json.Unmarshal(body, &session); err != nil {
		return checkoutSession{}, err
	}
	if session.ID == "" || session.URL == "" {
		return checkoutSession{}, errors.New("stripe subscription checkout response missing id or url")
	}
	return session, nil
}

func stripeRecurringInterval(cycle string) string {
	switch strings.ToLower(strings.TrimSpace(cycle)) {
	case "year":
		return "year"
	default:
		return "month"
	}
}

func stripeBillableCycle(cycle string) bool {
	switch strings.ToLower(strings.TrimSpace(cycle)) {
	case "month", "year":
		return true
	default:
		return false
	}
}

func redactBillingProviderError(body []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return "provider_error"
	}
	if errValue, ok := payload["error"].(map[string]any); ok {
		message, _ := errValue["message"].(string)
		code, _ := errValue["code"].(string)
		errType, _ := errValue["type"].(string)
		if message != "" {
			return strings.TrimSpace(strings.Join([]string{errType, code, message}, " "))
		}
	}
	return "provider_error"
}

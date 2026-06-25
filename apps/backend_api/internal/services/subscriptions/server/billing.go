package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

type paymentBillingClient struct {
	baseURL string
	client  *http.Client
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

type paymentBillingSubscriptionRequest struct {
	ClientID      string            `json:"client_id"`
	OwnerType     string            `json:"owner_type"`
	OwnerID       string            `json:"owner_id"`
	CustomerID    string            `json:"customer_id,omitempty"`
	Provider      string            `json:"provider"`
	PlanID        string            `json:"plan_id"`
	PlanName      string            `json:"plan_name"`
	Amount        int               `json:"amount"`
	Currency      string            `json:"currency"`
	Interval      string            `json:"interval"`
	CustomerEmail string            `json:"customer_email,omitempty"`
	SuccessURL    string            `json:"success_url,omitempty"`
	CancelURL     string            `json:"cancel_url,omitempty"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

type paymentBillingSubscriptionResponse struct {
	ID          string `json:"subscription_id"`
	CheckoutURL string `json:"checkout_url"`
	Provider    string `json:"provider"`
}

func (c paymentBillingClient) configured() bool {
	return strings.TrimSpace(c.baseURL) != ""
}

func (c paymentBillingClient) createSubscriptionCheckout(req subscriptionCheckoutRequest, sub Subscription, plan Plan) (checkoutSession, error) {
	if !c.configured() {
		return checkoutSession{}, errors.New("payment service base URL is not configured")
	}
	body := paymentBillingSubscriptionRequest{
		ClientID:      "rollfinders",
		OwnerType:     sub.OwnerType,
		OwnerID:       sub.OwnerID,
		CustomerID:    strings.TrimSpace(req.CustomerEmail),
		Provider:      "stripe",
		PlanID:        plan.ID,
		PlanName:      plan.Name,
		Amount:        plan.PriceMinor,
		Currency:      plan.Currency,
		Interval:      paymentBillingInterval(plan.BillingCycle),
		CustomerEmail: strings.TrimSpace(req.CustomerEmail),
		SuccessURL:    strings.TrimSpace(req.SuccessURL),
		CancelURL:     strings.TrimSpace(req.CancelURL),
		Metadata: map[string]string{
			"subscription_id": sub.ID,
			"owner_type":      sub.OwnerType,
			"owner_id":        sub.OwnerID,
			"plan_id":         plan.ID,
			"plan_name":       plan.Name,
		},
	}
	if req.PlanChangeID != "" {
		body.Metadata["plan_change_id"] = req.PlanChangeID
	}
	if strings.TrimSpace(req.OrganisationID) != "" {
		body.Metadata["organisation_id"] = strings.TrimSpace(req.OrganisationID)
	}
	data, err := json.Marshal(body)
	if err != nil {
		return checkoutSession{}, err
	}
	httpReq, err := http.NewRequest(http.MethodPost, strings.TrimRight(c.baseURL, "/")+"/v1/billing/subscriptions", bytes.NewReader(data))
	if err != nil {
		return checkoutSession{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if req.IdempotencyKey != "" {
		httpReq.Header.Set("Idempotency-Key", req.IdempotencyKey)
	}
	client := c.client
	if client == nil {
		client = http.DefaultClient
	}
	res, err := client.Do(httpReq)
	if err != nil {
		return checkoutSession{}, err
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return checkoutSession{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return checkoutSession{}, fmt.Errorf("payment service subscription checkout failed: status=%d body=%s", res.StatusCode, redactBillingProviderError(responseBody))
	}
	var response paymentBillingSubscriptionResponse
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return checkoutSession{}, err
	}
	if response.ID == "" || response.CheckoutURL == "" {
		return checkoutSession{}, errors.New("payment service subscription checkout response missing id or checkout_url")
	}
	return checkoutSession{ID: response.ID, URL: response.CheckoutURL}, nil
}

func paymentBillingInterval(cycle string) string {
	switch strings.ToLower(strings.TrimSpace(cycle)) {
	case "year":
		return "year"
	default:
		return "month"
	}
}

func stripeRecurringInterval(cycle string) string {
	return paymentBillingInterval(cycle)
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
	if message, ok := payload["message"].(string); ok && strings.TrimSpace(message) != "" {
		return strings.TrimSpace(message)
	}
	if status, ok := payload["status"].(float64); ok {
		return "status=" + strconv.Itoa(int(status))
	}
	return "provider_error"
}

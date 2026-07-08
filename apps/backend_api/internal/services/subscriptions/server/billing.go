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
	ClientID        string            `json:"client_id"`
	OwnerType       string            `json:"owner_type"`
	OwnerID         string            `json:"owner_id"`
	CustomerID      string            `json:"customer_id,omitempty"`
	Provider        string            `json:"provider"`
	PaymentMode     string            `json:"payment_mode"`
	PlanID          string            `json:"plan_id"`
	PlanName        string            `json:"plan_name"`
	Amount          int               `json:"amount"`
	Currency        string            `json:"currency"`
	Interval        string            `json:"interval"`
	RenewalInterval string            `json:"renewal_interval,omitempty"`
	CustomerEmail   string            `json:"customer_email,omitempty"`
	SuccessURL      string            `json:"success_url,omitempty"`
	CancelURL       string            `json:"cancel_url,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

type paymentBillingSubscriptionResponse struct {
	ID          string `json:"subscription_id"`
	CheckoutURL string `json:"checkout_url"`
	Provider    string `json:"provider"`
}

type paymentExternalPaymentRequest struct {
	Amount            int               `json:"amount"`
	Currency          string            `json:"currency"`
	Provider          string            `json:"provider"`
	PaymentMethodType string            `json:"payment_method_type"`
	ExternalReference string            `json:"external_reference"`
	ProviderPaymentID string            `json:"provider_payment_id"`
	ProviderStatus    string            `json:"provider_status"`
	Status            string            `json:"status"`
	Metadata          map[string]string `json:"metadata,omitempty"`
}

func (c paymentBillingClient) configured() bool {
	return strings.TrimSpace(c.baseURL) != ""
}

func (c paymentBillingClient) createSubscriptionCheckout(req subscriptionCheckoutRequest, sub Subscription, plans []Plan) (checkoutSession, error) {
	if !c.configured() {
		return checkoutSession{}, errors.New("payment service base URL is not configured")
	}
	if len(plans) == 0 {
		return checkoutSession{}, errors.New("at least one checkout plan is required")
	}
	plan := plans[0]
	planIDs := paymentCheckoutPlanIDs(plans)
	planName := paymentCheckoutPlanName(plans)
	body := paymentBillingSubscriptionRequest{
		ClientID:        "rollfinders",
		OwnerType:       sub.OwnerType,
		OwnerID:         sub.OwnerID,
		CustomerID:      strings.TrimSpace(req.CustomerEmail),
		Provider:        "stripe",
		PaymentMode:     paymentCheckoutMode(req.PaymentMode),
		PlanID:          plan.ID,
		PlanName:        planName,
		Amount:          paymentCheckoutPlansAmount(plans, req.BillingPeriod),
		Currency:        plan.Currency,
		Interval:        paymentBillingInterval(req.BillingPeriod),
		RenewalInterval: paymentRenewalInterval(req.PaymentMode, req.BillingPeriod),
		CustomerEmail:   strings.TrimSpace(req.CustomerEmail),
		SuccessURL:      strings.TrimSpace(req.SuccessURL),
		CancelURL:       strings.TrimSpace(req.CancelURL),
		Metadata: map[string]string{
			"billing_period":  paymentBillingInterval(req.BillingPeriod),
			"payment_mode":    paymentCheckoutMode(req.PaymentMode),
			"subscription_id": sub.ID,
			"owner_type":      sub.OwnerType,
			"owner_id":        sub.OwnerID,
			"plan_id":         plan.ID,
			"plan_ids":        strings.Join(planIDs, ","),
			"plan_name":       planName,
		},
	}
	if req.PlanChangeID != "" {
		body.Metadata["plan_change_id"] = req.PlanChangeID
		body.Metadata["resource_type"] = "subscription_plan_change"
		body.Metadata["resource_id"] = req.PlanChangeID
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

func (c paymentBillingClient) recordExternalSubscriptionPayment(planChange PlanChange, subscription Subscription, event BillingEvent) error {
	if !c.configured() {
		return errors.New("payment service base URL is not configured")
	}
	if event.AmountMinor <= 0 {
		return nil
	}
	provider := strings.TrimSpace(event.Provider)
	if provider == "" || provider == "subscription-service" {
		provider = "stripe"
	}
	providerReference := strings.TrimSpace(event.PaymentID)
	if providerReference == "" {
		providerReference = strings.TrimSpace(event.ProviderReference)
	}
	eventMetadata := map[string]string{}
	if len(event.Metadata) > 0 {
		_ = json.Unmarshal(event.Metadata, &eventMetadata)
	}
	resourceLabel := firstNonEmptyString(eventMetadata["plan_name"], "Subscription payment")
	body := paymentExternalPaymentRequest{
		Amount:            event.AmountMinor,
		Currency:          event.Currency,
		Provider:          provider,
		PaymentMethodType: "card",
		ExternalReference: "rollfinders:subscription:" + planChange.ID,
		ProviderPaymentID: providerReference,
		ProviderStatus:    "succeeded",
		Status:            "succeeded",
		Metadata: map[string]string{
			"client_id":        "rollfinders",
			"owner_type":       subscription.OwnerType,
			"owner_id":         subscription.OwnerID,
			"payment_scope":    "SUBSCRIPTION",
			"resource_type":    "subscription",
			"resource_id":      planChange.ID,
			"resource_label":   resourceLabel,
			"subscription_id":  subscription.ID,
			"plan_change_id":   planChange.ID,
			"plan_id":          subscription.PlanID,
			"provider":         provider,
			"billing_event_id": event.ID,
		},
	}
	for _, key := range []string{"billing_period", "owner_type", "owner_id", "payment_mode", "plan_name"} {
		if value := strings.TrimSpace(eventMetadata[key]); value != "" {
			body.Metadata[key] = value
		}
	}
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	httpReq, err := http.NewRequest(http.MethodPost, strings.TrimRight(c.baseURL, "/")+"/internal/payments/record-external", bytes.NewReader(data))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Idempotency-Key", "subscription-payment:"+planChange.ID)
	client := c.client
	if client == nil {
		client = http.DefaultClient
	}
	res, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("payment service external payment record failed: status=%d body=%s", res.StatusCode, redactBillingProviderError(responseBody))
	}
	return nil
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func paymentBillingInterval(cycle string) string {
	switch strings.ToLower(strings.TrimSpace(cycle)) {
	case "year":
		return "year"
	default:
		return "month"
	}
}

func paymentCheckoutMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "one_time":
		return "one_time"
	default:
		return "subscription"
	}
}

func paymentRenewalInterval(mode string, cycle string) string {
	if paymentCheckoutMode(mode) == "one_time" {
		return ""
	}
	return paymentBillingInterval(cycle)
}

func paymentCheckoutAmount(priceMinor int, cycle string) int {
	if paymentBillingInterval(cycle) == "year" {
		return priceMinor * 12
	}
	return priceMinor
}

func paymentCheckoutPlansAmount(plans []Plan, cycle string) int {
	total := 0
	for _, plan := range plans {
		total += plan.PriceMinor
	}
	return paymentCheckoutAmount(total, cycle)
}

func paymentCheckoutPlanIDs(plans []Plan) []string {
	ids := make([]string, 0, len(plans))
	for _, plan := range plans {
		if strings.TrimSpace(plan.ID) != "" {
			ids = append(ids, plan.ID)
		}
	}
	return ids
}

func paymentCheckoutPlanName(plans []Plan) string {
	if len(plans) == 0 {
		return "Subscription plans"
	}
	if len(plans) == 1 {
		return plans[0].Name
	}
	return fmt.Sprintf("%s + %d more", plans[0].Name, len(plans)-1)
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

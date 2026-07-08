package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"rollfinders/internal/services/payments/handlers"
)

const (
	subscriptionStatusTrialing          = "trialing"
	subscriptionStatusActive            = "active"
	subscriptionStatusPastDue           = "past_due"
	subscriptionStatusUnpaid            = "unpaid"
	subscriptionStatusCancelled         = "cancelled"
	subscriptionStatusPaused            = "paused"
	subscriptionStatusIncomplete        = "incomplete"
	subscriptionStatusIncompleteExpired = "incomplete_expired"
)

type BillingSubscription struct {
	ID                     string            `json:"subscription_id"`
	ClientID               string            `json:"client_id"`
	OwnerType              string            `json:"owner_type"`
	OwnerID                string            `json:"owner_id"`
	CustomerID             string            `json:"customer_id,omitempty"`
	Provider               string            `json:"provider"`
	ProviderCustomerID     string            `json:"provider_customer_id,omitempty"`
	ProviderSubscriptionID string            `json:"provider_subscription_id,omitempty"`
	ProviderCheckoutID     string            `json:"provider_checkout_id,omitempty"`
	ProviderPaymentID      string            `json:"provider_payment_id,omitempty"`
	ProviderChargeID       string            `json:"provider_charge_id,omitempty"`
	ProviderInvoiceID      string            `json:"provider_invoice_id,omitempty"`
	PlanID                 string            `json:"plan_id"`
	PlanName               string            `json:"plan_name"`
	Currency               string            `json:"currency"`
	Amount                 int64             `json:"amount"`
	Interval               string            `json:"interval"`
	PaymentMode            string            `json:"payment_mode"`
	RenewalInterval        string            `json:"renewal_interval,omitempty"`
	Status                 string            `json:"status"`
	TrialStart             *time.Time        `json:"trial_start,omitempty"`
	TrialEnd               *time.Time        `json:"trial_end,omitempty"`
	CurrentPeriodStart     time.Time         `json:"current_period_start"`
	CurrentPeriodEnd       time.Time         `json:"current_period_end"`
	CancelAtPeriodEnd      bool              `json:"cancel_at_period_end"`
	CancelledAt            *time.Time        `json:"cancelled_at,omitempty"`
	CheckoutURL            string            `json:"checkout_url,omitempty"`
	Metadata               map[string]string `json:"metadata,omitempty"`
	CreatedAt              time.Time         `json:"created_at"`
	UpdatedAt              time.Time         `json:"updated_at"`
}

type SubscriptionInvoice struct {
	ID                string     `json:"invoice_id"`
	SubscriptionID    string     `json:"subscription_id"`
	ProviderInvoiceID string     `json:"provider_invoice_id,omitempty"`
	PaymentID         string     `json:"payment_id,omitempty"`
	Amount            int64      `json:"amount"`
	Currency          string     `json:"currency"`
	Status            string     `json:"status"`
	DueDate           *time.Time `json:"due_date,omitempty"`
	PaidDate          *time.Time `json:"paid_date,omitempty"`
	HostedInvoiceURL  string     `json:"hosted_invoice_url,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type createSubscriptionRequest struct {
	ClientID               string            `json:"client_id"`
	OwnerType              string            `json:"owner_type"`
	OwnerID                string            `json:"owner_id"`
	CustomerID             string            `json:"customer_id"`
	Provider               string            `json:"provider"`
	ProviderCustomerID     string            `json:"provider_customer_id"`
	ProviderSubscriptionID string            `json:"provider_subscription_id"`
	PlanID                 string            `json:"plan_id"`
	PlanName               string            `json:"plan_name"`
	Currency               string            `json:"currency"`
	Amount                 int64             `json:"amount"`
	Interval               string            `json:"interval"`
	PaymentMode            string            `json:"payment_mode"`
	RenewalInterval        string            `json:"renewal_interval"`
	CustomerEmail          string            `json:"customer_email"`
	SuccessURL             string            `json:"success_url"`
	CancelURL              string            `json:"cancel_url"`
	TrialDays              int               `json:"trial_days"`
	Metadata               map[string]string `json:"metadata"`
	CheckoutURL            string            `json:"-"`
}

type subscriptionFilter struct {
	ClientID  string
	OwnerType string
	OwnerID   string
	Status    string
	Limit     int
	Offset    int
}

type subscriptionListResponse struct {
	Subscriptions []BillingSubscription `json:"subscriptions"`
	Count         int                   `json:"count"`
	Pagination    paginationMeta        `json:"pagination"`
}

type subscriptionInvoiceListResponse struct {
	Invoices   []SubscriptionInvoice `json:"invoices"`
	Count      int                   `json:"count"`
	Pagination paginationMeta        `json:"pagination"`
}

func (s *server) createSubscription(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	req, details := decodeCreateSubscription(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Subscription request validation failed.", details)
		return
	}
	status, response, replay, err := s.store.withIdempotency("create_subscription", r.Header.Get("Idempotency-Key"), fingerprint(raw), func() (int, any) {
		checkout, err := s.createProviderSubscriptionCheckout(req, r.Header.Get("Idempotency-Key"))
		if err != nil {
			if providerCode, providerMessage := providerErrorDetails(err); providerCode != "" {
				return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: providerCode, Message: providerMessage, RequestID: requestIDFrom(r)}}
			}
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		req.CheckoutURL = checkout.URL
		return http.StatusCreated, s.store.createSubscription(req)
	})
	if err != nil {
		writeIdempotencyError(w, r, err)
		return
	}
	if replay {
		w.Header().Set("Idempotent-Replayed", "true")
	}
	writeJSON(w, status, response)
}

func (s *server) listSubscriptions(w http.ResponseWriter, r *http.Request) {
	filter := subscriptionFilter{
		ClientID:  strings.TrimSpace(r.URL.Query().Get("client_id")),
		OwnerType: strings.TrimSpace(r.URL.Query().Get("owner_type")),
		OwnerID:   strings.TrimSpace(r.URL.Query().Get("owner_id")),
		Status:    strings.TrimSpace(r.URL.Query().Get("status")),
		Limit:     limitFromQuery(r.URL.Query().Get("limit")),
		Offset:    offsetFromQuery(r.URL.Query().Get("offset")),
	}
	subscriptions := s.store.listSubscriptions(filter)
	writeJSON(w, http.StatusOK, subscriptionListResponse{Subscriptions: subscriptions, Count: len(subscriptions), Pagination: pagination(filter.Limit, filter.Offset, len(subscriptions))})
}

func (s *server) getSubscription(w http.ResponseWriter, r *http.Request) {
	subscription, ok := s.store.getSubscription(handlers.Param(r, "id"))
	if !ok {
		writeError(w, r, http.StatusNotFound, "subscription_not_found", "Subscription was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, subscription)
}

func (s *server) cancelSubscription(w http.ResponseWriter, r *http.Request) {
	subscription, err := s.store.cancelSubscription(handlers.Param(r, "id"))
	if err == errNotFound {
		writeError(w, r, http.StatusNotFound, "subscription_not_found", "Subscription was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, subscription)
}

func (s *server) resumeSubscription(w http.ResponseWriter, r *http.Request) {
	subscription, err := s.store.resumeSubscription(handlers.Param(r, "id"))
	if err == errNotFound {
		writeError(w, r, http.StatusNotFound, "subscription_not_found", "Subscription was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, subscription)
}

func (s *server) listSubscriptionPayments(w http.ResponseWriter, r *http.Request) {
	filter := paymentHistoryFilter{
		ResourceType: "subscription",
		ResourceID:   handlers.Param(r, "id"),
		Limit:        limitFromQuery(r.URL.Query().Get("limit")),
		Offset:       offsetFromQuery(r.URL.Query().Get("offset")),
	}
	payments := s.store.listPayments(filter)
	writeJSON(w, http.StatusOK, PaymentHistoryResponse{Payments: payments, Count: len(payments), Pagination: pagination(filter.Limit, filter.Offset, len(payments))})
}

func (s *server) listSubscriptionInvoices(w http.ResponseWriter, r *http.Request) {
	limit := limitFromQuery(r.URL.Query().Get("limit"))
	offset := offsetFromQuery(r.URL.Query().Get("offset"))
	invoices, ok := s.store.listSubscriptionInvoices(handlers.Param(r, "id"), limit, offset)
	if !ok {
		writeError(w, r, http.StatusNotFound, "subscription_not_found", "Subscription was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, subscriptionInvoiceListResponse{Invoices: invoices, Count: len(invoices), Pagination: pagination(limit, offset, len(invoices))})
}

func decodeCreateSubscription(raw []byte) (createSubscriptionRequest, map[string]string) {
	var req createSubscriptionRequest
	details := map[string]string{}
	if err := json.Unmarshal(raw, &req); err != nil {
		details["body"] = "does not match the subscription schema"
		return req, details
	}
	req.ClientID = strings.TrimSpace(req.ClientID)
	req.OwnerType = strings.TrimSpace(req.OwnerType)
	req.OwnerID = strings.TrimSpace(req.OwnerID)
	req.Provider = strings.TrimSpace(req.Provider)
	req.PlanID = strings.TrimSpace(req.PlanID)
	req.PlanName = strings.TrimSpace(req.PlanName)
	req.Interval = strings.TrimSpace(req.Interval)
	req.PaymentMode = strings.TrimSpace(req.PaymentMode)
	req.RenewalInterval = strings.TrimSpace(req.RenewalInterval)
	req.CustomerEmail = strings.TrimSpace(req.CustomerEmail)
	req.SuccessURL = strings.TrimSpace(req.SuccessURL)
	req.CancelURL = strings.TrimSpace(req.CancelURL)
	if req.ClientID == "" {
		details["client_id"] = "required"
	}
	if req.OwnerType == "" {
		details["owner_type"] = "required"
	}
	if req.OwnerID == "" {
		details["owner_id"] = "required"
	}
	if req.Provider != "stripe" {
		details["provider"] = "must be stripe"
	}
	if req.PlanID == "" {
		details["plan_id"] = "required"
	}
	if req.PlanName == "" {
		details["plan_name"] = "required"
	}
	if req.Amount < 0 {
		details["amount"] = "must be zero or a positive integer in minor currency units"
	}
	if !validCurrency(req.Currency) {
		details["currency"] = "must be a three-letter uppercase currency code"
	}
	if req.Interval != "month" && req.Interval != "year" {
		details["interval"] = "must be month or year"
	}
	if req.PaymentMode == "" {
		req.PaymentMode = "subscription"
	}
	if req.PaymentMode != "subscription" && req.PaymentMode != "one_time" {
		details["payment_mode"] = "must be subscription or one_time"
	}
	if req.PaymentMode == "subscription" {
		if req.RenewalInterval == "" {
			req.RenewalInterval = req.Interval
		}
		if req.RenewalInterval != "month" && req.RenewalInterval != "year" {
			details["renewal_interval"] = "must be month or year"
		}
	} else {
		req.RenewalInterval = ""
	}
	if req.TrialDays < 0 {
		details["trial_days"] = "must be zero or a positive integer"
	}
	return req, details
}

type subscriptionCheckoutResult struct {
	ID  string
	URL string
}

func (s *server) createProviderSubscriptionCheckout(req createSubscriptionRequest, key string) (subscriptionCheckoutResult, error) {
	adapter, ok := s.providers["stripe"].(stripeAdapter)
	if !ok {
		return subscriptionCheckoutResult{}, errors.New("stripe provider is not configured")
	}
	if !adapter.secret.configured() {
		return subscriptionCheckoutResult{ID: "sub_checkout_" + shortKey(key), URL: "https://checkout.stripe.com/pay/sub_checkout_" + shortKey(key)}, nil
	}
	successURL := strings.TrimSpace(req.SuccessURL)
	if successURL == "" {
		successURL = s.cfg.DefaultClientCallbackURL
	}
	cancelURL := strings.TrimSpace(req.CancelURL)
	if cancelURL == "" {
		cancelURL = s.cfg.DefaultClientCallbackURL
	}
	if successURL == "" || cancelURL == "" {
		return subscriptionCheckoutResult{}, errors.New("subscription checkout callback URLs are not configured")
	}

	form := url.Values{}
	stripeMode := "subscription"
	if req.PaymentMode == "one_time" {
		stripeMode = "payment"
	}
	form.Set("mode", stripeMode)
	form.Set("success_url", successURL)
	form.Set("cancel_url", cancelURL)
	form.Set("client_reference_id", req.OwnerID)
	form.Set("line_items[0][quantity]", "1")
	form.Set("line_items[0][price_data][currency]", strings.ToLower(req.Currency))
	form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(req.Amount, 10))
	if stripeMode == "subscription" {
		form.Set("line_items[0][price_data][recurring][interval]", req.RenewalInterval)
	}
	form.Set("line_items[0][price_data][product_data][name]", req.PlanName)
	if req.CustomerEmail != "" {
		form.Set("customer_email", req.CustomerEmail)
	}
	metadata := cloneMap(req.Metadata)
	if metadata == nil {
		metadata = map[string]string{}
	}
	metadata["client_id"] = req.ClientID
	metadata["owner_type"] = req.OwnerType
	metadata["owner_id"] = req.OwnerID
	metadata["plan_id"] = req.PlanID
	metadata["plan_name"] = req.PlanName
	for metadataKey, metadataValue := range metadata {
		if metadataValue == "" || strings.HasPrefix(metadataKey, "stripe_") {
			continue
		}
		form.Set("metadata["+metadataKey+"]", metadataValue)
		if stripeMode == "subscription" {
			form.Set("subscription_data[metadata]["+metadataKey+"]", metadataValue)
		}
	}

	httpReq, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return subscriptionCheckoutResult{}, err
	}
	httpReq.SetBasicAuth(adapter.secret.value(), "")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	adapter.setRequestHeaders(httpReq)
	if key != "" {
		httpReq.Header.Set("Idempotency-Key", key)
	}
	res, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return subscriptionCheckoutResult{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return subscriptionCheckoutResult{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return subscriptionCheckoutResult{}, fmt.Errorf("stripe checkout session failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var session struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return subscriptionCheckoutResult{}, err
	}
	if session.ID == "" || session.URL == "" {
		return subscriptionCheckoutResult{}, errors.New("stripe subscription checkout response missing id or url")
	}
	return subscriptionCheckoutResult{ID: session.ID, URL: session.URL}, nil
}

func (s *store) createSubscription(req createSubscriptionRequest) BillingSubscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	id := s.newID("sub")
	periodEnd := now.AddDate(0, 1, 0)
	if req.Interval == "year" {
		periodEnd = now.AddDate(1, 0, 0)
	}
	status := subscriptionStatusActive
	var trialStart *time.Time
	var trialEnd *time.Time
	if req.TrialDays > 0 {
		status = subscriptionStatusTrialing
		start := now
		end := now.AddDate(0, 0, req.TrialDays)
		trialStart = &start
		trialEnd = &end
	}
	subscription := &BillingSubscription{
		ID:                     id,
		ClientID:               req.ClientID,
		OwnerType:              req.OwnerType,
		OwnerID:                req.OwnerID,
		CustomerID:             strings.TrimSpace(req.CustomerID),
		Provider:               req.Provider,
		ProviderCustomerID:     strings.TrimSpace(req.ProviderCustomerID),
		ProviderSubscriptionID: strings.TrimSpace(req.ProviderSubscriptionID),
		ProviderCheckoutID:     providerCheckoutID(req.CheckoutURL),
		PlanID:                 req.PlanID,
		PlanName:               req.PlanName,
		Currency:               req.Currency,
		Amount:                 req.Amount,
		Interval:               req.Interval,
		PaymentMode:            req.PaymentMode,
		RenewalInterval:        req.RenewalInterval,
		Status:                 status,
		TrialStart:             trialStart,
		TrialEnd:               trialEnd,
		CurrentPeriodStart:     now,
		CurrentPeriodEnd:       periodEnd,
		CheckoutURL:            strings.TrimSpace(req.CheckoutURL),
		Metadata:               cloneMap(req.Metadata),
		CreatedAt:              now,
		UpdatedAt:              now,
	}
	s.subscriptions[id] = subscription
	s.invoices[id] = []*SubscriptionInvoice{{
		ID:             s.newID("inv"),
		SubscriptionID: id,
		Amount:         req.Amount,
		Currency:       req.Currency,
		Status:         invoiceStatusForSubscription(subscription.Status),
		DueDate:        &now,
		PaidDate:       paidDateForSubscriptionStatus(subscription.Status, now),
		CreatedAt:      now,
		UpdatedAt:      now,
	}}
	s.addOutboxLocked("subscription.created", id, map[string]any{"subscription_id": id, "client_id": req.ClientID, "owner_type": req.OwnerType, "owner_id": req.OwnerID, "status": subscription.Status})
	return *cloneSubscription(subscription)
}

func providerCheckoutID(checkoutURL string) string {
	value := strings.TrimSpace(checkoutURL)
	if value == "" {
		return ""
	}
	if parsed, err := url.Parse(value); err == nil {
		parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		for i := len(parts) - 1; i >= 0; i-- {
			if strings.HasPrefix(parts[i], "cs_") || strings.HasPrefix(parts[i], "sub_checkout_") {
				return parts[i]
			}
		}
	}
	return ""
}

func invoiceStatusForSubscription(status string) string {
	switch status {
	case subscriptionStatusActive, subscriptionStatusTrialing:
		return "paid"
	case subscriptionStatusIncomplete, subscriptionStatusPastDue, subscriptionStatusUnpaid:
		return "open"
	default:
		return status
	}
}

func paidDateForSubscriptionStatus(status string, now time.Time) *time.Time {
	if status != subscriptionStatusActive && status != subscriptionStatusTrialing {
		return nil
	}
	paidAt := now
	return &paidAt
}

func (s *store) listSubscriptions(filter subscriptionFilter) []BillingSubscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	subscriptions := make([]BillingSubscription, 0, len(s.subscriptions))
	for _, subscription := range s.subscriptions {
		if filter.ClientID != "" && subscription.ClientID != filter.ClientID {
			continue
		}
		if filter.OwnerType != "" && subscription.OwnerType != filter.OwnerType {
			continue
		}
		if filter.OwnerID != "" && subscription.OwnerID != filter.OwnerID {
			continue
		}
		if filter.Status != "" && subscription.Status != filter.Status {
			continue
		}
		subscriptions = append(subscriptions, *cloneSubscription(subscription))
	}
	sort.Slice(subscriptions, func(i, j int) bool { return subscriptions[i].CreatedAt.After(subscriptions[j].CreatedAt) })
	if offset >= len(subscriptions) {
		return []BillingSubscription{}
	}
	subscriptions = subscriptions[offset:]
	if len(subscriptions) > limit {
		subscriptions = subscriptions[:limit]
	}
	return subscriptions
}

func (s *store) getSubscription(id string) (BillingSubscription, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	subscription, ok := s.subscriptions[id]
	if !ok {
		return BillingSubscription{}, false
	}
	return *cloneSubscription(subscription), true
}

func (s *store) cancelSubscription(id string) (BillingSubscription, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	subscription, ok := s.subscriptions[id]
	if !ok {
		return BillingSubscription{}, errNotFound
	}
	now := time.Now().UTC()
	subscription.Status = subscriptionStatusCancelled
	subscription.CancelAtPeriodEnd = true
	subscription.CancelledAt = &now
	subscription.UpdatedAt = now
	s.addOutboxLocked("subscription.cancelled", id, map[string]any{"subscription_id": id, "status": subscription.Status})
	return *cloneSubscription(subscription), nil
}

func (s *store) resumeSubscription(id string) (BillingSubscription, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	subscription, ok := s.subscriptions[id]
	if !ok {
		return BillingSubscription{}, errNotFound
	}
	now := time.Now().UTC()
	subscription.Status = subscriptionStatusActive
	subscription.CancelAtPeriodEnd = false
	subscription.CancelledAt = nil
	subscription.UpdatedAt = now
	s.addOutboxLocked("subscription.updated", id, map[string]any{"subscription_id": id, "status": subscription.Status})
	return *cloneSubscription(subscription), nil
}

func (s *store) listSubscriptionInvoices(subscriptionID string, limit int, offset int) ([]SubscriptionInvoice, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.subscriptions[subscriptionID]; !ok {
		return nil, false
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	raw := s.invoices[subscriptionID]
	invoices := make([]SubscriptionInvoice, 0, len(raw))
	for _, invoice := range raw {
		invoices = append(invoices, *cloneSubscriptionInvoice(invoice))
	}
	sort.Slice(invoices, func(i, j int) bool { return invoices[i].CreatedAt.After(invoices[j].CreatedAt) })
	if offset >= len(invoices) {
		return []SubscriptionInvoice{}, true
	}
	invoices = invoices[offset:]
	if len(invoices) > limit {
		invoices = invoices[:limit]
	}
	return invoices, true
}

func cloneSubscription(subscription *BillingSubscription) *BillingSubscription {
	cp := *subscription
	cp.Metadata = cloneMap(subscription.Metadata)
	return &cp
}

func cloneSubscriptionInvoice(invoice *SubscriptionInvoice) *SubscriptionInvoice {
	cp := *invoice
	return &cp
}

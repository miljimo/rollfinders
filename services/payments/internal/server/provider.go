package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
)

var errUnsupportedProvider = errors.New("unsupported provider")

func providerErrorDetails(err error) (string, string) {
	if err == nil {
		return "", ""
	}
	message := err.Error()
	if strings.Contains(message, "No such destination") {
		return "stripe_destination_account_missing", "The academy Stripe Connect account is not available to the configured Stripe platform key. Reconnect the academy Stripe account."
	}
	if strings.Contains(message, "stripe checkout session failed") {
		return "stripe_checkout_failed", "Stripe rejected the checkout request."
	}
	return "", ""
}

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

type stripeAdapter struct {
	secret     stripeSecretResolver
	apiVersion string
	context    string
}

type stripeAccount struct {
	ChargesEnabled   bool              `json:"charges_enabled"`
	Created          int64             `json:"created"`
	DetailsSubmitted bool              `json:"details_submitted"`
	ID               string            `json:"id"`
	Metadata         map[string]string `json:"metadata"`
	PayoutsEnabled   bool              `json:"payouts_enabled"`
}

type stripeAccountLink struct {
	URL string `json:"url"`
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

func (a stripeAdapter) CreateConnectedAccount(email string, owner PaymentAccountOwner) (stripeAccount, error) {
	form := url.Values{}
	form.Set("business_profile[product_description]", "RollFinders booking and event payments")
	form.Set("capabilities[card_payments][requested]", "true")
	form.Set("capabilities[transfers][requested]", "true")
	form.Set("country", "GB")
	form.Set("email", email)
	form.Set("metadata[owner_id]", owner.OwnerID)
	form.Set("metadata[owner_type]", owner.OwnerType)
	form.Set("type", "express")
	var account stripeAccount
	if err := a.stripeRequest(http.MethodPost, "/v1/accounts", form, &account); err != nil {
		return stripeAccount{}, err
	}
	return account, nil
}

func (a stripeAdapter) RetrieveConnectedAccount(accountID string) (stripeAccount, error) {
	var account stripeAccount
	if err := a.stripeRequest(http.MethodGet, "/v1/accounts/"+url.PathEscape(accountID), nil, &account); err != nil {
		return stripeAccount{}, err
	}
	return account, nil
}

func (a stripeAdapter) FindReusableConnectedAccount(owner PaymentAccountOwner) (stripeAccount, bool, error) {
	var response struct {
		Data []stripeAccount `json:"data"`
	}
	if err := a.stripeRequest(http.MethodGet, "/v1/accounts?limit=100", nil, &response); err != nil {
		return stripeAccount{}, false, err
	}
	accounts := make([]stripeAccount, 0, len(response.Data))
	for _, account := range response.Data {
		if account.Metadata["owner_id"] == owner.OwnerID && account.Metadata["owner_type"] == owner.OwnerType {
			accounts = append(accounts, account)
		}
	}
	sort.Slice(accounts, func(i, j int) bool {
		return accounts[i].Created > accounts[j].Created
	})
	for _, account := range accounts {
		if account.DetailsSubmitted && account.ChargesEnabled && account.PayoutsEnabled {
			return account, true, nil
		}
	}
	for _, account := range accounts {
		if account.DetailsSubmitted {
			return account, true, nil
		}
	}
	if len(accounts) == 0 {
		return stripeAccount{}, false, nil
	}
	return accounts[0], true, nil
}

func (a stripeAdapter) DeleteDuplicateConnectedAccounts(owner PaymentAccountOwner, retainedAccountID string) error {
	var response struct {
		Data []stripeAccount `json:"data"`
	}
	if err := a.stripeRequest(http.MethodGet, "/v1/accounts?limit=100", nil, &response); err != nil {
		return err
	}
	for _, account := range response.Data {
		if account.ID == retainedAccountID || account.Metadata["owner_id"] != owner.OwnerID || account.Metadata["owner_type"] != owner.OwnerType {
			continue
		}
		var deleted struct {
			ID      string `json:"id"`
			Deleted bool   `json:"deleted"`
		}
		if err := a.stripeRequest(http.MethodDelete, "/v1/accounts/"+url.PathEscape(account.ID), nil, &deleted); err != nil {
			return err
		}
	}
	return nil
}

func (a stripeAdapter) CreateAccountLink(accountID, refreshURL, returnURL string) (stripeAccountLink, error) {
	form := url.Values{}
	form.Set("account", accountID)
	form.Set("refresh_url", refreshURL)
	form.Set("return_url", returnURL)
	form.Set("type", "account_onboarding")
	var link stripeAccountLink
	if err := a.stripeRequest(http.MethodPost, "/v1/account_links", form, &link); err != nil {
		return stripeAccountLink{}, err
	}
	return link, nil
}

func (a stripeAdapter) stripeRequest(method string, path string, form url.Values, target any) error {
	if !a.secret.configured() {
		return errors.New("Stripe API key is not configured")
	}
	var body io.Reader
	if form != nil {
		body = strings.NewReader(form.Encode())
	}
	req, err := http.NewRequest(method, "https://api.stripe.com"+path, body)
	if err != nil {
		return err
	}
	req.SetBasicAuth(a.secret.value(), "")
	if form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	a.setRequestHeaders(req)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("stripe connect request failed: status=%d body=%s", res.StatusCode, redactStripeError(responseBody))
	}
	if target == nil {
		return nil
	}
	return json.Unmarshal(responseBody, target)
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
	applyStripeConnectFormParams(form, req.Metadata)
	for metadataKey, metadataValue := range req.Metadata {
		if metadataValue == "" || strings.HasPrefix(metadataKey, "payment_checkout_") || strings.HasPrefix(metadataKey, "stripe_") {
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
	a.setRequestHeaders(httpReq)
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

func applyStripeConnectFormParams(form url.Values, metadata map[string]string) {
	if destination := strings.TrimSpace(metadata["stripe_destination_account"]); destination != "" {
		form.Set("payment_intent_data[transfer_data][destination]", destination)
	}
	if fee := strings.TrimSpace(metadata["stripe_application_fee_amount"]); fee != "" {
		form.Set("payment_intent_data[application_fee_amount]", fee)
	}
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
	a.setRequestHeaders(httpReq)
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

func (a stripeAdapter) setRequestHeaders(req *http.Request) {
	if strings.TrimSpace(a.apiVersion) != "" {
		req.Header.Set("Stripe-Version", strings.TrimSpace(a.apiVersion))
	}
	if strings.TrimSpace(a.context) != "" {
		req.Header.Set("Stripe-Context", strings.TrimSpace(a.context))
	}
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

func (a stripeAdapter) Cancel(p Payment, key string) (providerResult, error) {
	if a.secret.configured() && strings.HasPrefix(p.ProviderPaymentID, "cs_") {
		return a.expireCheckoutSession(p, key)
	}
	if a.secret.configured() && strings.HasPrefix(p.ProviderPaymentID, "pi_") {
		return a.cancelPaymentIntent(p, key)
	}
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: "canceled"}, nil
}

func (a stripeAdapter) expireCheckoutSession(p Payment, key string) (providerResult, error) {
	httpReq, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions/"+url.PathEscape(p.ProviderPaymentID)+"/expire", nil)
	if err != nil {
		return providerResult{}, err
	}
	httpReq.SetBasicAuth(a.secret.value(), "")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	a.setRequestHeaders(httpReq)
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
		if stripeCheckoutExpireMeansCheckoutCompleted(body) {
			return providerResult{}, errPaymentCompleted
		}
		if stripeCheckoutExpireCanBeTreatedAsCancelled(body) {
			return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: "cancel_unavailable_or_already_expired"}, nil
		}
		return providerResult{}, fmt.Errorf("stripe checkout session expire failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var session struct {
		ID            string `json:"id"`
		Status        string `json:"status"`
		PaymentStatus string `json:"payment_status"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return providerResult{}, err
	}
	rawStatus := session.Status
	if session.PaymentStatus != "" {
		rawStatus += ":" + session.PaymentStatus
	}
	if rawStatus == "" {
		rawStatus = "expired"
	}
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: rawStatus}, nil
}

func stripeCheckoutExpireMeansCheckoutCompleted(body []byte) bool {
	var parsed struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return false
	}
	message := strings.ToLower(strings.TrimSpace(parsed.Error.Message))
	return strings.Contains(message, "checkout session has a status of `complete`") ||
		strings.Contains(message, "checkout session has a status of complete")
}

func stripeCheckoutExpireCanBeTreatedAsCancelled(body []byte) bool {
	var parsed struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return false
	}
	code := strings.ToLower(strings.TrimSpace(parsed.Error.Code))
	message := strings.ToLower(strings.TrimSpace(parsed.Error.Message))
	return code == "resource_missing" ||
		strings.Contains(message, "already expired") ||
		strings.Contains(message, "no such checkout.session")
}

func (a stripeAdapter) cancelPaymentIntent(p Payment, key string) (providerResult, error) {
	httpReq, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/payment_intents/"+url.PathEscape(p.ProviderPaymentID)+"/cancel", nil)
	if err != nil {
		return providerResult{}, err
	}
	httpReq.SetBasicAuth(a.secret.value(), "")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	a.setRequestHeaders(httpReq)
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
		return providerResult{}, fmt.Errorf("stripe payment intent cancel failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var intent struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(body, &intent); err != nil {
		return providerResult{}, err
	}
	rawStatus := intent.Status
	if rawStatus == "" {
		rawStatus = "canceled"
	}
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: rawStatus}, nil
}

func (a stripeAdapter) Refund(p Payment, req refundRequest, key string) (providerResult, error) {
	if !a.secret.configured() {
		return providerResult{ProviderID: "re_" + shortKey(key), Status: refundSucceeded, RawStatus: "succeeded"}, nil
	}
	paymentIntentID := p.ProviderPaymentID
	if strings.HasPrefix(p.ProviderPaymentID, "cs_") {
		var err error
		paymentIntentID, err = a.checkoutSessionPaymentIntent(p.ProviderPaymentID)
		if err != nil {
			return providerResult{}, err
		}
	}
	if !strings.HasPrefix(paymentIntentID, "pi_") {
		return providerResult{}, fmt.Errorf("stripe refund requires payment intent for provider payment %s", p.ProviderPaymentID)
	}

	form := url.Values{}
	form.Set("payment_intent", paymentIntentID)
	if req.Amount > 0 {
		form.Set("amount", strconv.FormatInt(req.Amount, 10))
	}
	if strings.TrimSpace(req.Reason) != "" {
		form.Set("metadata[reason]", strings.TrimSpace(req.Reason))
	}
	form.Set("reverse_transfer", "true")
	form.Set("refund_application_fee", "true")

	httpReq, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/refunds", strings.NewReader(form.Encode()))
	if err != nil {
		return providerResult{}, err
	}
	httpReq.SetBasicAuth(a.secret.value(), "")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	a.setRequestHeaders(httpReq)
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
		return providerResult{}, fmt.Errorf("stripe refund failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var refund struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(body, &refund); err != nil {
		return providerResult{}, err
	}
	status := refundPending
	if refund.Status == "succeeded" {
		status = refundSucceeded
	}
	if refund.Status == "failed" || refund.Status == "canceled" {
		status = refundFailed
	}
	return providerResult{ProviderID: refund.ID, Status: status, RawStatus: refund.Status}, nil
}

func (a stripeAdapter) checkoutSessionPaymentIntent(sessionID string) (string, error) {
	endpoint := "https://api.stripe.com/v1/checkout/sessions/" + url.PathEscape(sessionID) + "?expand[]=payment_intent"
	httpReq, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}
	httpReq.SetBasicAuth(a.secret.value(), "")
	a.setRequestHeaders(httpReq)
	res, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("stripe checkout session payment intent lookup failed: status=%d body=%s", res.StatusCode, redactStripeError(body))
	}
	var session struct {
		PaymentIntent json.RawMessage `json:"payment_intent"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return "", err
	}
	var paymentIntentID string
	if err := json.Unmarshal(session.PaymentIntent, &paymentIntentID); err == nil {
		return paymentIntentID, nil
	}
	var paymentIntent struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(session.PaymentIntent, &paymentIntent); err != nil {
		return "", err
	}
	if paymentIntent.ID == "" {
		return "", errors.New("stripe checkout session is missing payment intent")
	}
	return paymentIntent.ID, nil
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

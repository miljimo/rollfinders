package server

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

var errIdempotencyConflict = errors.New("idempotency conflict")

type createPaymentRequest struct {
	Amount            int64             `json:"amount"`
	Currency          string            `json:"currency"`
	Provider          string            `json:"provider"`
	PaymentMethodType string            `json:"payment_method_type"`
	CaptureMethod     string            `json:"capture_method"`
	ExternalReference string            `json:"external_reference"`
	Metadata          map[string]string `json:"metadata"`
}

type createCheckoutRequest struct {
	ClientID          string            `json:"client_id"`
	ClientState       string            `json:"client_state"`
	ResourceType      string            `json:"resource_type"`
	ResourceID        string            `json:"resource_id"`
	ResourceLabel     string            `json:"resource_label"`
	Amount            int64             `json:"amount"`
	Currency          string            `json:"currency"`
	Provider          string            `json:"provider"`
	PaymentMethodType string            `json:"payment_method_type"`
	PayerUserID       string            `json:"payer_user_id"`
	PayerEmail        string            `json:"payer_email"`
	SuccessURL        string            `json:"success_url"`
	CancelURL         string            `json:"cancel_url"`
	Metadata          map[string]string `json:"metadata"`

	// Backward-compatible RollFinders fields. New clients should use
	// resource_* fields and metadata instead of domain-specific request fields.
	CourseID            string `json:"course_id"`
	AcademyID           string `json:"academy_id"`
	OccurrenceDate      string `json:"occurrence_date"`
	OccurrenceStartTime string `json:"occurrence_start_time"`
	OccurrenceEndTime   string `json:"occurrence_end_time"`
}

type createPaymentClientRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CallbackURL string `json:"callback_url"`
}

type refundRequest struct {
	Amount int64  `json:"amount"`
	Reason string `json:"reason"`
}

type webhookEvent struct {
	ID        string `json:"id"`
	PaymentID string `json:"payment_id"`
	Status    string `json:"status"`
	Type      string `json:"type"`
}

func readJSONEndpoint(w http.ResponseWriter, r *http.Request, requireIdempotency bool) ([]byte, bool) {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		writeError(w, r, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json.", nil)
		return nil, false
	}
	if requireIdempotency && r.Header.Get("Idempotency-Key") == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Idempotency-Key header is required.", map[string]string{"idempotency_key": "required"})
		return nil, false
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil || !json.Valid(raw) {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Request body must be valid JSON.", nil)
		return nil, false
	}
	var probe map[string]json.RawMessage
	_ = json.Unmarshal(raw, &probe)
	for _, field := range []string{"card_number", "cvv", "pan"} {
		if _, ok := probe[field]; ok {
			writeError(w, r, http.StatusBadRequest, "validation_error", "Raw card data is not accepted by this API.", map[string]string{field: "not_allowed"})
			return nil, false
		}
	}
	return raw, true
}

func decodeCreatePayment(raw []byte) (createPaymentRequest, map[string]string) {
	var req createPaymentRequest
	details := map[string]string{}
	if err := json.Unmarshal(raw, &req); err != nil {
		details["body"] = "does not match the payment schema"
		return req, details
	}
	if req.Amount <= 0 {
		details["amount"] = "must be a positive integer in minor currency units"
	}
	if !validCurrency(req.Currency) {
		details["currency"] = "must be a three-letter uppercase currency code"
	}
	if req.Provider != "stripe" && req.Provider != "paypal" {
		details["provider"] = "must be stripe or paypal"
	}
	if !validPaymentMethodType(req.PaymentMethodType) {
		details["payment_method_type"] = "must be card, google_pay, or paypal"
	} else if !validPaymentMethodForProvider(req.Provider, req.PaymentMethodType) {
		details["payment_method_type"] = "must match the selected provider"
	}
	if req.CaptureMethod != "" && req.CaptureMethod != "automatic" && req.CaptureMethod != "manual" {
		details["capture_method"] = "must be automatic or manual"
	}
	return req, details
}

func decodeCreateCheckout(raw []byte) (createCheckoutRequest, map[string]string) {
	var req createCheckoutRequest
	details := map[string]string{}
	if err := json.Unmarshal(raw, &req); err != nil {
		details["body"] = "does not match the checkout schema"
		return req, details
	}
	req.ClientID = strings.TrimSpace(req.ClientID)
	normalizeLegacyCourseCheckout(&req)
	req.ResourceType = strings.TrimSpace(req.ResourceType)
	req.ResourceID = strings.TrimSpace(req.ResourceID)
	req.ResourceLabel = strings.TrimSpace(req.ResourceLabel)
	if req.ResourceType == "" {
		details["resource_type"] = "required"
	}
	if req.ResourceID == "" {
		details["resource_id"] = "required"
	}
	if req.Amount <= 0 {
		details["amount"] = "must be a positive integer in minor currency units"
	}
	if !validCurrency(req.Currency) {
		details["currency"] = "must be a three-letter uppercase currency code"
	}
	if req.Provider != "stripe" && req.Provider != "paypal" {
		details["provider"] = "must be stripe or paypal"
	}
	if !validPaymentMethodType(req.PaymentMethodType) {
		details["payment_method_type"] = "must be card, google_pay, or paypal"
	} else if !validPaymentMethodForProvider(req.Provider, req.PaymentMethodType) {
		details["payment_method_type"] = "must match the selected provider"
	}
	if strings.TrimSpace(req.PayerEmail) != "" && !strings.Contains(req.PayerEmail, "@") {
		details["payer_email"] = "must be a valid email address"
	}
	return req, details
}

func validPaymentMethodType(method string) bool {
	switch method {
	case "card", "google_pay", "paypal":
		return true
	default:
		return false
	}
}

func validPaymentMethodForProvider(provider string, method string) bool {
	switch provider {
	case "stripe":
		return method == "card" || method == "google_pay"
	case "paypal":
		return method == "paypal"
	default:
		return false
	}
}

func decodeCreatePaymentClient(raw []byte) (createPaymentClientRequest, map[string]string) {
	var req createPaymentClientRequest
	details := map[string]string{}
	if err := json.Unmarshal(raw, &req); err != nil {
		details["body"] = "does not match the client registration schema"
		return req, details
	}
	req.ID = strings.TrimSpace(req.ID)
	req.Name = strings.TrimSpace(req.Name)
	req.CallbackURL = strings.TrimSpace(req.CallbackURL)
	if req.Name == "" {
		details["name"] = "required"
	}
	if !validAbsoluteURL(req.CallbackURL) {
		details["callback_url"] = "must be an absolute http or https URL"
	}
	return req, details
}

func checkoutExternalReference(req createCheckoutRequest) string {
	if ref := strings.TrimSpace(req.Metadata["external_reference"]); ref != "" {
		return ref
	}
	return strings.Join([]string{req.ClientID, req.ResourceType, req.ResourceID}, ":")
}

func checkoutURLForPayment(payment Payment, fallback string) string {
	if payment.NextAction != nil {
		if url := payment.NextAction["url"]; url != "" {
			return url
		}
	}
	return fallback
}

func checkoutCallbackURL(baseURL string, checkoutID string, result string) string {
	base := strings.TrimRight(baseURL, "/")
	return base + "/v1/checkouts/" + url.PathEscape(checkoutID) + "/callbacks/" + url.PathEscape(result)
}

func paymentStatusRedirectURL(baseURL string, checkout Checkout, payment Payment, result string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("invalid application status url")
	}
	q := parsed.Query()
	q.Set("checkout_session_id", checkout.CheckoutSessionID)
	q.Set("client_id", checkout.ClientID)
	q.Set("payment_id", checkout.PaymentID)
	q.Set("resource_type", checkout.ResourceType)
	q.Set("resource_id", checkout.ResourceID)
	q.Set("result", result)
	if payment.Status != "" {
		q.Set("payment_status", payment.Status)
	}
	if checkout.ClientState != "" {
		q.Set("state", checkout.ClientState)
	}
	for key, value := range checkout.Metadata {
		if strings.TrimSpace(key) == "" || value == "" {
			continue
		}
		q.Set("metadata_"+key, value)
	}
	parsed.RawQuery = q.Encode()
	return parsed.String(), nil
}

func normalizeLegacyCourseCheckout(req *createCheckoutRequest) {
	if req.Metadata == nil {
		req.Metadata = map[string]string{}
	}
	if req.ResourceType == "" && req.CourseID != "" {
		req.ResourceType = "course_occurrence"
	}
	if req.ResourceID == "" && req.CourseID != "" {
		parts := []string{req.CourseID}
		if req.OccurrenceDate != "" {
			parts = append(parts, req.OccurrenceDate)
		}
		if req.OccurrenceStartTime != "" {
			parts = append(parts, req.OccurrenceStartTime)
		}
		req.ResourceID = strings.Join(parts, ":")
	}
	addLegacyCourseMetadata(req.Metadata, *req)
}

func addLegacyCourseMetadata(metadata map[string]string, req createCheckoutRequest) {
	if req.CourseID != "" {
		metadata["course_id"] = req.CourseID
	}
	if req.AcademyID != "" {
		metadata["academy_id"] = req.AcademyID
	}
	if req.OccurrenceDate != "" {
		metadata["occurrence_date"] = req.OccurrenceDate
	}
	if req.OccurrenceStartTime != "" {
		metadata["occurrence_start_time"] = req.OccurrenceStartTime
	}
	if req.OccurrenceEndTime != "" {
		metadata["occurrence_end_time"] = req.OccurrenceEndTime
	}
}

func validAbsoluteURL(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func limitFromQuery(value string) int {
	if strings.TrimSpace(value) == "" {
		return 100
	}
	limit, err := strconv.Atoi(value)
	if err != nil || limit <= 0 {
		return 100
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func validCurrency(currency string) bool {
	if len(currency) != 3 {
		return false
	}
	for _, r := range currency {
		if r < 'A' || r > 'Z' {
			return false
		}
	}
	return true
}

func writeIdempotencyError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, errIdempotencyConflict) {
		writeError(w, r, http.StatusConflict, "idempotency_conflict", "Idempotency key was reused with a different request.", nil)
		return
	}
	writeError(w, r, http.StatusInternalServerError, "internal_error", "Unexpected internal error.", nil)
}

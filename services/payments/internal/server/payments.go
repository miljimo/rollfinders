package server

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"

	"payments/internal/handlers"
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

type createCourseOccurrenceCheckoutRequest struct {
	ClientID            string            `json:"client_id"`
	ClientState         string            `json:"client_state"`
	CourseID            string            `json:"course_id"`
	AcademyID           string            `json:"academy_id"`
	OccurrenceDate      string            `json:"occurrence_date"`
	OccurrenceStartTime string            `json:"occurrence_start_time"`
	OccurrenceEndTime   string            `json:"occurrence_end_time"`
	Amount              int64             `json:"amount"`
	Currency            string            `json:"currency"`
	Provider            string            `json:"provider"`
	PaymentMethodType   string            `json:"payment_method_type"`
	PayerUserID         string            `json:"payer_user_id"`
	PayerEmail          string            `json:"payer_email"`
	SuccessURL          string            `json:"success_url"`
	CancelURL           string            `json:"cancel_url"`
	Metadata            map[string]string `json:"metadata"`
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

func (s *server) createPaymentClient(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, false)
	if !ok {
		return
	}
	req, details := decodeCreatePaymentClient(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Client registration validation failed.", details)
		return
	}
	client := s.store.createPaymentClient(req)
	writeJSON(w, http.StatusCreated, client)
}

func (s *server) createPayment(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	req, details := decodeCreatePayment(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payment request validation failed.", details)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	status, response, replay, err := s.store.withIdempotency("create_payment", key, fingerprint(raw), func() (int, any) {
		adapter, err := s.providers.get(req.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		result, err := adapter.CreatePayment(req, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		payment := s.store.createPayment(req, result)
		s.store.mu.Lock()
		s.store.metrics.payments++
		s.store.metrics.providerSuccess++
		s.store.mu.Unlock()
		return http.StatusCreated, payment
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

func (s *server) createCourseOccurrenceCheckout(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	req, details := decodeCreateCourseOccurrenceCheckout(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Course checkout request validation failed.", details)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	status, response, replay, err := s.store.withIdempotency("course_occurrence_checkout", key, fingerprint(raw), func() (int, any) {
		_, ok := s.store.getPaymentClient(req.ClientID)
		if !ok {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unknown_client", Message: "Payment client is not registered.", RequestID: requestIDFrom(r)}}
		}
		adapter, err := s.providers.get(req.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		metadata := cloneMap(req.Metadata)
		if metadata == nil {
			metadata = map[string]string{}
		}
		metadata["payment_scope"] = "COURSE_OCCURRENCE"
		metadata["client_id"] = req.ClientID
		if req.ClientState != "" {
			metadata["client_state"] = req.ClientState
		}
		metadata["course_id"] = req.CourseID
		metadata["academy_id"] = req.AcademyID
		metadata["occurrence_date"] = req.OccurrenceDate
		metadata["occurrence_start_time"] = req.OccurrenceStartTime
		metadata["occurrence_end_time"] = req.OccurrenceEndTime
		metadata["payer_email"] = req.PayerEmail
		if req.PayerUserID != "" {
			metadata["payer_user_id"] = req.PayerUserID
		}
		paymentReq := createPaymentRequest{
			Amount:            req.Amount,
			Currency:          req.Currency,
			Provider:          req.Provider,
			PaymentMethodType: req.PaymentMethodType,
			CaptureMethod:     "automatic",
			ExternalReference: courseOccurrenceExternalReference(req),
			Metadata:          metadata,
		}
		result, err := adapter.CreatePayment(paymentReq, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		payment := s.store.createPayment(paymentReq, result)
		checkout := s.store.createCourseOccurrenceCheckout(req, payment, s.cfg.PublicBaseURL)
		s.store.mu.Lock()
		s.store.metrics.payments++
		s.store.metrics.providerSuccess++
		s.store.mu.Unlock()
		return http.StatusCreated, checkout
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

func (s *server) courseOccurrenceCheckoutCallback(w http.ResponseWriter, r *http.Request) {
	checkout, ok := s.store.getCourseOccurrenceCheckout(handlers.Param(r, "id"))
	if !ok {
		writeError(w, r, http.StatusNotFound, "not_found", "Checkout session was not found.", nil)
		return
	}
	result := strings.ToLower(strings.TrimSpace(handlers.Param(r, "result")))
	if result != "success" && result != "cancelled" && result != "failed" && result != "expired" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Checkout callback result is not supported.", nil)
		return
	}
	client, ok := s.store.getPaymentClient(checkout.ClientID)
	if !ok {
		writeError(w, r, http.StatusConflict, "unknown_client", "Checkout client is no longer registered.", nil)
		return
	}
	payment, _ := s.store.getPayment(checkout.PaymentID)
	redirectURL, err := paymentStatusRedirectURL(client.CallbackURL, checkout, payment, result)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "callback_url_invalid", "Application payment status URL is not configured.", nil)
		return
	}
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

func (s *server) getPayment(w http.ResponseWriter, r *http.Request) {
	payment, ok := s.store.getPayment(handlers.Param(r, "id"))
	if !ok {
		writeError(w, r, http.StatusNotFound, "not_found", "Payment was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, payment)
}

func (s *server) capturePayment(w http.ResponseWriter, r *http.Request) {
	s.paymentAction(w, r, "capture", func(adapter providerAdapter, p Payment, key string) (providerResult, error) {
		return adapter.Capture(p, key)
	})
}

func (s *server) cancelPayment(w http.ResponseWriter, r *http.Request) {
	s.paymentAction(w, r, "cancel", func(adapter providerAdapter, p Payment, key string) (providerResult, error) {
		return adapter.Cancel(p, key)
	})
}

func (s *server) paymentAction(w http.ResponseWriter, r *http.Request, action string, call func(providerAdapter, Payment, string) (providerResult, error)) {
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Idempotency-Key header is required.", map[string]string{"idempotency_key": "required"})
		return
	}
	paymentID := handlers.Param(r, "id")
	status, response, replay, err := s.store.withIdempotency(action+":"+paymentID, key, fingerprint([]byte(action+paymentID)), func() (int, any) {
		payment, ok := s.store.getPayment(paymentID)
		if !ok {
			return http.StatusNotFound, ErrorEnvelope{Error: APIError{Code: "not_found", Message: "Payment was not found.", RequestID: requestIDFrom(r)}}
		}
		adapter, err := s.providers.get(payment.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		result, err := call(adapter, payment, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		updated, err := s.store.transitionPayment(payment.ID, result.Status)
		if err != nil {
			return http.StatusConflict, ErrorEnvelope{Error: APIError{Code: "payment_invalid_state", Message: "Payment is not eligible for this operation.", RequestID: requestIDFrom(r)}}
		}
		return http.StatusOK, updated
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

func (s *server) createRefund(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	var req refundRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Refund request validation failed.", nil)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	paymentID := handlers.Param(r, "id")
	status, response, replay, err := s.store.withIdempotency("refund:"+paymentID, key, fingerprint(raw), func() (int, any) {
		payment, ok := s.store.getPayment(paymentID)
		if !ok {
			return http.StatusNotFound, ErrorEnvelope{Error: APIError{Code: "not_found", Message: "Payment was not found.", RequestID: requestIDFrom(r)}}
		}
		adapter, err := s.providers.get(payment.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		result, err := adapter.Refund(payment, req, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		refund, _, err := s.store.createRefund(paymentID, req, result)
		switch {
		case errors.Is(err, errNotFound):
			return http.StatusNotFound, ErrorEnvelope{Error: APIError{Code: "not_found", Message: "Payment was not found.", RequestID: requestIDFrom(r)}}
		case errors.Is(err, errOverRefund):
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "refund_exceeds_available_amount", Message: "Refund amount exceeds the refundable balance.", RequestID: requestIDFrom(r)}}
		case errors.Is(err, errInvalidTransition):
			return http.StatusConflict, ErrorEnvelope{Error: APIError{Code: "payment_invalid_state", Message: "Payment is not refundable.", RequestID: requestIDFrom(r)}}
		}
		s.store.mu.Lock()
		s.store.metrics.refunds++
		s.store.mu.Unlock()
		return http.StatusCreated, refund
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

func (s *server) listRefunds(w http.ResponseWriter, r *http.Request) {
	refunds, ok := s.store.listRefunds(handlers.Param(r, "id"))
	if !ok {
		writeError(w, r, http.StatusNotFound, "not_found", "Payment was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string][]Refund{"refunds": refunds})
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
	if req.PaymentMethodType != "card" && req.PaymentMethodType != "paypal" {
		details["payment_method_type"] = "must be card or paypal"
	}
	if req.CaptureMethod != "" && req.CaptureMethod != "automatic" && req.CaptureMethod != "manual" {
		details["capture_method"] = "must be automatic or manual"
	}
	return req, details
}

func decodeCreateCourseOccurrenceCheckout(raw []byte) (createCourseOccurrenceCheckoutRequest, map[string]string) {
	var req createCourseOccurrenceCheckoutRequest
	details := map[string]string{}
	if err := json.Unmarshal(raw, &req); err != nil {
		details["body"] = "does not match the course checkout schema"
		return req, details
	}
	if strings.TrimSpace(req.ClientID) == "" {
		req.ClientID = "rollfinders"
	}
	if strings.TrimSpace(req.CourseID) == "" {
		details["course_id"] = "required"
	}
	if strings.TrimSpace(req.AcademyID) == "" {
		details["academy_id"] = "required"
	}
	if strings.TrimSpace(req.OccurrenceDate) == "" {
		details["occurrence_date"] = "required"
	}
	if strings.TrimSpace(req.OccurrenceStartTime) == "" {
		details["occurrence_start_time"] = "required"
	}
	if strings.TrimSpace(req.OccurrenceEndTime) == "" {
		details["occurrence_end_time"] = "required"
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
	if req.PaymentMethodType != "card" && req.PaymentMethodType != "paypal" {
		details["payment_method_type"] = "must be card or paypal"
	}
	if strings.TrimSpace(req.PayerEmail) != "" && !strings.Contains(req.PayerEmail, "@") {
		details["payer_email"] = "must be a valid email address"
	}
	return req, details
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

func courseOccurrenceExternalReference(req createCourseOccurrenceCheckoutRequest) string {
	return strings.Join([]string{req.CourseID, req.OccurrenceDate, req.OccurrenceStartTime}, ":")
}

func checkoutURLForPayment(payment Payment, fallback string) string {
	if payment.NextAction != nil {
		if url := payment.NextAction["url"]; url != "" {
			return url
		}
	}
	return fallback
}

func courseOccurrenceCallbackURL(baseURL string, checkoutID string, result string) string {
	base := strings.TrimRight(baseURL, "/")
	return base + "/v1/course-occurrence-checkouts/" + url.PathEscape(checkoutID) + "/callbacks/" + url.PathEscape(result)
}

func paymentStatusRedirectURL(baseURL string, checkout CourseOccurrenceCheckout, payment Payment, result string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("invalid application status url")
	}
	q := parsed.Query()
	q.Set("checkout_session_id", checkout.CheckoutSessionID)
	q.Set("client_id", checkout.ClientID)
	q.Set("payment_id", checkout.PaymentID)
	q.Set("course_id", checkout.CourseID)
	q.Set("academy_id", checkout.AcademyID)
	q.Set("occurrence_date", checkout.OccurrenceDate)
	q.Set("result", result)
	if payment.Status != "" {
		q.Set("payment_status", payment.Status)
	}
	if checkout.ClientState != "" {
		q.Set("state", checkout.ClientState)
	}
	parsed.RawQuery = q.Encode()
	return parsed.String(), nil
}

func validAbsoluteURL(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
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

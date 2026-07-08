package server

import (
	"encoding/json"
	"net/http"
	"strings"
)

type recordExternalPaymentRequest struct {
	Amount            int64             `json:"amount"`
	Currency          string            `json:"currency"`
	Provider          string            `json:"provider"`
	PaymentMethodType string            `json:"payment_method_type"`
	ExternalReference string            `json:"external_reference"`
	ProviderPaymentID string            `json:"provider_payment_id"`
	ProviderStatus    string            `json:"provider_status"`
	Status            string            `json:"status"`
	Metadata          map[string]string `json:"metadata"`
}

func (s *server) recordExternalPayment(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	var req recordExternalPaymentRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Request body must be valid JSON.", nil)
		return
	}
	req.Provider = strings.TrimSpace(req.Provider)
	req.PaymentMethodType = strings.TrimSpace(req.PaymentMethodType)
	req.Status = strings.TrimSpace(req.Status)
	if req.Status == "" {
		req.Status = statusSucceeded
	}
	details := map[string]string{}
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
	}
	if req.Status != statusSucceeded && req.Status != statusFailed && req.Status != statusCancelled && req.Status != statusProcessing && req.Status != statusRequiresAction {
		details["status"] = "must be a recognised payment status"
	}
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "External payment record validation failed.", details)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	status, response, replay, err := s.store.withIdempotency("record_external_payment", key, fingerprint(raw), func() (int, any) {
		payment := s.store.createPayment(createPaymentRequest{
			Amount:            req.Amount,
			Currency:          req.Currency,
			Provider:          req.Provider,
			PaymentMethodType: req.PaymentMethodType,
			CaptureMethod:     "automatic",
			ExternalReference: req.ExternalReference,
			Metadata:          req.Metadata,
		}, providerResult{ProviderID: strings.TrimSpace(req.ProviderPaymentID), Status: req.Status, RawStatus: strings.TrimSpace(req.ProviderStatus)})
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

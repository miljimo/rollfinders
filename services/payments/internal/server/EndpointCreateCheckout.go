package server

import "net/http"

func (s *server) createCheckout(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	req, details := decodeCreateCheckout(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Checkout request validation failed.", details)
		return
	}
	if req.ClientID == "" {
		req.ClientID = s.cfg.DefaultClientID
	}
	key := r.Header.Get("Idempotency-Key")
	status, response, replay, err := s.store.withIdempotency("checkout", key, fingerprint(raw), func() (int, any) {
		_, ok := s.store.getPaymentClient(req.ClientID)
		if !ok {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unknown_client", Message: "Payment client is not registered.", RequestID: requestIDFrom(r)}}
		}
		adapter, err := s.providers.get(req.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		checkoutID := s.store.allocateID("checkout")
		successURL := checkoutCallbackURL(s.cfg.PublicBaseURL, checkoutID, "success")
		cancelURL := checkoutCallbackURL(s.cfg.PublicBaseURL, checkoutID, "cancelled")
		metadata := cloneMap(req.Metadata)
		if metadata == nil {
			metadata = map[string]string{}
		}
		metadata["payment_checkout_success_url"] = successURL
		metadata["payment_checkout_cancel_url"] = cancelURL
		metadata["client_id"] = req.ClientID
		if req.ClientState != "" {
			metadata["client_state"] = req.ClientState
		}
		metadata["resource_type"] = req.ResourceType
		metadata["resource_id"] = req.ResourceID
		if req.ResourceLabel != "" {
			metadata["resource_label"] = req.ResourceLabel
		}
		addLegacyCourseMetadata(metadata, req)
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
			ExternalReference: checkoutExternalReference(req),
			Metadata:          metadata,
		}
		result, err := adapter.CreatePayment(paymentReq, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		payment := s.store.createPayment(paymentReq, result)
		checkout := s.store.createCheckout(req, payment, checkoutID, successURL, cancelURL)
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

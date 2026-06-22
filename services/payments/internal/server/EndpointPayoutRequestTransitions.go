package server

import (
	"errors"
	"net/http"

	"payments/internal/handlers"
)

func (s *server) approvePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.payoutRequestTransition(w, r, payoutStatusApproved, false)
}

func (s *server) rejectPayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.payoutRequestTransition(w, r, payoutStatusRejected, true)
}

func (s *server) holdPayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.payoutRequestTransition(w, r, payoutStatusHeld, true)
}

func (s *server) releasePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.payoutRequestTransition(w, r, payoutStatusPendingReview, false)
}

func (s *server) markPayoutRequestPaid(w http.ResponseWriter, r *http.Request) {
	s.payoutRequestTransition(w, r, payoutStatusPaid, true)
}

func (s *server) cancelPayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.payoutRequestTransition(w, r, payoutStatusCancelled, false)
}

func (s *server) payoutRequestTransition(w http.ResponseWriter, r *http.Request, nextStatus string, requireBody bool) {
	raw := []byte("{}")
	if requireBody || r.ContentLength > 0 || r.Header.Get("Content-Type") != "" {
		var ok bool
		raw, ok = readJSONEndpoint(w, r, false)
		if !ok {
			return
		}
	}
	req, details := decodePayoutTransition(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payout request transition validation failed.", details)
		return
	}
	if nextStatus == payoutStatusRejected && req.Reason == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Rejecting a payout request requires a reason.", map[string]string{"reason": "required"})
		return
	}
	if nextStatus == payoutStatusHeld && req.Reason == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Holding a payout request requires a reason.", map[string]string{"reason": "required"})
		return
	}
	if nextStatus == payoutStatusPaid && req.ProviderReference == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Marking a payout request paid requires a provider reference.", map[string]string{"provider_reference": "required"})
		return
	}
	payout, err := s.store.transitionPayoutRequest(handlers.Param(r, "id"), nextStatus, req)
	switch {
	case err == nil:
		writeJSON(w, http.StatusOK, payout)
	case errors.Is(err, errNotFound):
		writeError(w, r, http.StatusNotFound, "payout_request_not_found", "Payout request was not found.", nil)
	case errors.Is(err, errInvalidTransition):
		writeError(w, r, http.StatusConflict, "payout_request_invalid_state", "Payout request is not eligible for this operation.", nil)
	default:
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Could not update payout request.", nil)
	}
}

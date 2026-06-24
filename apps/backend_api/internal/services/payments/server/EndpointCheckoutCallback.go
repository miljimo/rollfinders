package server

import (
	"net/http"
	"strings"

	"rollfinders/internal/services/payments/handlers"
)

func (s *server) checkoutCallback(w http.ResponseWriter, r *http.Request) {
	checkout, ok := s.store.getCheckout(handlers.Param(r, "id"))
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
	if result == "success" {
		if adapter, err := s.providers.get(payment.Provider); err == nil {
			if refreshed, err := adapter.Refresh(payment); err == nil && refreshed.Status != "" && refreshed.Status != payment.Status {
				if updated, err := s.store.transitionPayment(payment.ID, refreshed.Status); err == nil {
					payment = updated
				}
			}
		}
	}
	redirectURL, err := paymentStatusRedirectURL(client.CallbackURL, checkout, payment, result)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "callback_url_invalid", "Application payment status URL is not configured.", nil)
		return
	}
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

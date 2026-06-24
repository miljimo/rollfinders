package server

import (
	"encoding/json"
	"net/http"
)

func parseWebhookJSON(body []byte) (webhookEvent, error) {
	var event webhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		return webhookEvent{}, err
	}
	return event, nil
}

func providerHeaders(r *http.Request) map[string]string {
	out := map[string]string{}
	for _, key := range []string{"Stripe-Signature", "Paypal-Transmission-Sig", "PayPal-Transmission-Sig"} {
		if value := r.Header.Get(key); value != "" {
			out[key] = value
		}
	}
	return out
}

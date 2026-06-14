package server

import (
	"errors"
	"fmt"
)

var errUnsupportedProvider = errors.New("unsupported provider")

type providerAdapter interface {
	CreatePayment(createPaymentRequest, string) (providerResult, error)
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

type stripeAdapter struct{}
type paypalAdapter struct{}

func (stripeAdapter) CreatePayment(req createPaymentRequest, key string) (providerResult, error) {
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
	return providerResult{ProviderID: "pi_" + shortKey(key), Status: status, RawStatus: raw, NextAction: action}, nil
}

func (stripeAdapter) Capture(p Payment, key string) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusSucceeded, RawStatus: "succeeded"}, nil
}

func (stripeAdapter) Cancel(p Payment, key string) (providerResult, error) {
	return providerResult{ProviderID: p.ProviderPaymentID, Status: statusCancelled, RawStatus: "canceled"}, nil
}

func (stripeAdapter) Refund(p Payment, req refundRequest, key string) (providerResult, error) {
	return providerResult{ProviderID: "re_" + shortKey(key), Status: refundSucceeded, RawStatus: "succeeded"}, nil
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

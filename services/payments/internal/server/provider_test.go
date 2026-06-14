package server

import "testing"

func TestStripeAdapterMapsCreatePaymentStatuses(t *testing.T) {
	adapter := stripeAdapter{}
	result, err := adapter.CreatePayment(createPaymentRequest{
		Amount: 1299, Currency: "GBP", Provider: "stripe", PaymentMethodType: "card",
		Metadata: map[string]string{"requires_action": "true"},
	}, "idem-key")
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != statusRequiresAction || result.NextAction["type"] == "" {
		t.Fatalf("unexpected stripe result: %+v", result)
	}
}

func TestPayPalAdapterReturnsApprovalAction(t *testing.T) {
	adapter := paypalAdapter{}
	result, err := adapter.CreatePayment(createPaymentRequest{Amount: 1299, Currency: "GBP", Provider: "paypal", PaymentMethodType: "paypal"}, "idem-key")
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != statusRequiresAction || result.NextAction["url"] == "" {
		t.Fatalf("unexpected paypal result: %+v", result)
	}
}

func TestWebhookSignatureRequired(t *testing.T) {
	if _, err := (stripeAdapter{}).ParseWebhook([]byte(`{"id":"evt_1"}`), map[string]string{}); err == nil {
		t.Fatal("expected stripe signature error")
	}
	if _, err := (paypalAdapter{}).ParseWebhook([]byte(`{"id":"evt_1"}`), map[string]string{}); err == nil {
		t.Fatal("expected paypal signature error")
	}
}

package server

import (
	"errors"
	"testing"
)

func TestPaymentTransitions(t *testing.T) {
	valid := []struct{ from, to string }{
		{statusRequiresAction, statusAuthorized},
		{statusRequiresAction, statusProcessing},
		{statusRequiresAction, statusSucceeded},
		{statusRequiresAction, statusFailed},
		{statusRequiresAction, statusCancelled},
		{statusAuthorized, statusSucceeded},
		{statusAuthorized, statusCancelled},
		{statusProcessing, statusSucceeded},
		{statusProcessing, statusFailed},
		{statusProcessing, statusCancelled},
		{statusSucceeded, statusPartiallyRefunded},
		{statusSucceeded, statusRefunded},
	}
	for _, tt := range valid {
		if !validPaymentTransition(tt.from, tt.to) {
			t.Fatalf("expected %s -> %s to be valid", tt.from, tt.to)
		}
	}
	if validPaymentTransition(statusSucceeded, statusAuthorized) {
		t.Fatal("terminal regression should be invalid")
	}
}

func TestRefundRejectsOverRefund(t *testing.T) {
	st := newStore()
	p := st.createPayment(createPaymentRequest{Amount: 1000, Currency: "GBP", Provider: "stripe", PaymentMethodType: "card"}, providerResult{Status: statusSucceeded, ProviderID: "pi_test"})
	_, _, err := st.createRefund(p.ID, refundRequest{Amount: 1001}, providerResult{Status: refundSucceeded})
	if !errors.Is(err, errOverRefund) {
		t.Fatalf("expected errOverRefund, got %v", err)
	}
}

func TestSuccessfulRefundUpdatesPaymentAggregate(t *testing.T) {
	st := newStore()
	p := st.createPayment(createPaymentRequest{Amount: 1000, Currency: "GBP", Provider: "stripe", PaymentMethodType: "card"}, providerResult{Status: statusSucceeded, ProviderID: "pi_test"})
	_, payment, err := st.createRefund(p.ID, refundRequest{Amount: 400}, providerResult{Status: refundSucceeded})
	if err != nil {
		t.Fatal(err)
	}
	if payment.Status != statusPartiallyRefunded || payment.RefundedAmount != 400 {
		t.Fatalf("unexpected partial refund aggregate: %+v", payment)
	}
	_, payment, err = st.createRefund(p.ID, refundRequest{Amount: 600}, providerResult{Status: refundSucceeded})
	if err != nil {
		t.Fatal(err)
	}
	if payment.Status != statusRefunded || payment.RefundedAmount != 1000 {
		t.Fatalf("unexpected full refund aggregate: %+v", payment)
	}
}

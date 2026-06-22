package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPayeeBalanceCalculatesEligiblePayoutAmount(t *testing.T) {
	store := newStore("")
	store.createPayment(createPaymentRequest{
		Amount:            1000,
		Currency:          "GBP",
		Provider:          "stripe",
		PaymentMethodType: "card",
		Metadata: map[string]string{
			"client_id":                     "rollfinders",
			"academy_id":                    "academy_123",
			"stripe_application_fee_amount": "50",
		},
	}, providerResult{Status: statusSucceeded, ProviderID: "pi_paid"})
	store.createPayment(createPaymentRequest{
		Amount:            2000,
		Currency:          "GBP",
		Provider:          "stripe",
		PaymentMethodType: "card",
		Metadata: map[string]string{
			"client_id":  "rollfinders",
			"academy_id": "academy_other",
		},
	}, providerResult{Status: statusSucceeded, ProviderID: "pi_other"})
	store.createPayment(createPaymentRequest{
		Amount:            3000,
		Currency:          "GBP",
		Provider:          "stripe",
		PaymentMethodType: "card",
		Metadata: map[string]string{
			"client_id":  "rollfinders",
			"academy_id": "academy_123",
		},
	}, providerResult{Status: statusRequiresAction, ProviderID: "pi_pending"})

	balance := store.getPayeeBalance("academy_123", "rollfinders", "GBP")
	if balance.GrossPaidAmount != 1000 {
		t.Fatalf("expected gross paid 1000, got %+v", balance)
	}
	if balance.PlatformFeeAmount != 50 {
		t.Fatalf("expected platform fee 50, got %+v", balance)
	}
	if balance.AvailablePayoutAmount != 950 {
		t.Fatalf("expected available payout 950, got %+v", balance)
	}
}

func TestPayoutRequestCreationReservesBalanceAndPreventsDuplicateReservation(t *testing.T) {
	store := newStore("")
	store.createPayment(createPaymentRequest{
		Amount:            1000,
		Currency:          "GBP",
		Provider:          "stripe",
		PaymentMethodType: "card",
		Metadata: map[string]string{
			"client_id":  "rollfinders",
			"academy_id": "academy_123",
		},
	}, providerResult{Status: statusSucceeded, ProviderID: "pi_paid"})

	payout, err := store.createPayoutRequest("academy_123", createPayoutRequestPayload{
		ClientID:             "rollfinders",
		Amount:               700,
		Currency:             "GBP",
		DestinationAccountID: "acct_academy",
		RequestedBy:          "user_123",
	})
	if err != nil {
		t.Fatal(err)
	}
	if payout.Status != payoutStatusPendingReview {
		t.Fatalf("expected pending payout request, got %+v", payout)
	}
	if balance := store.getPayeeBalance("academy_123", "rollfinders", "GBP"); balance.AvailablePayoutAmount != 300 || balance.PendingPayoutAmount != 700 {
		t.Fatalf("expected reserved balance after payout request, got %+v", balance)
	}
	if _, err := store.createPayoutRequest("academy_123", createPayoutRequestPayload{
		ClientID:             "rollfinders",
		Amount:               400,
		Currency:             "GBP",
		DestinationAccountID: "acct_academy",
	}); err != errInsufficientFunds {
		t.Fatalf("expected duplicate reservation to be rejected, got %v", err)
	}
}

func TestPayoutRequestRejectAndCancelReleaseReservedBalance(t *testing.T) {
	store := newStore("")
	store.createPayment(createPaymentRequest{
		Amount:            1000,
		Currency:          "GBP",
		Provider:          "stripe",
		PaymentMethodType: "card",
		Metadata: map[string]string{
			"client_id":  "rollfinders",
			"academy_id": "academy_123",
		},
	}, providerResult{Status: statusSucceeded, ProviderID: "pi_paid"})
	payout, err := store.createPayoutRequest("academy_123", createPayoutRequestPayload{
		ClientID:             "rollfinders",
		Amount:               900,
		Currency:             "GBP",
		DestinationAccountID: "acct_academy",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.transitionPayoutRequest(payout.ID, payoutStatusRejected, payoutTransitionPayload{Reason: "duplicate"}); err != nil {
		t.Fatal(err)
	}
	if balance := store.getPayeeBalance("academy_123", "rollfinders", "GBP"); balance.AvailablePayoutAmount != 1000 || balance.PendingPayoutAmount != 0 {
		t.Fatalf("expected rejected payout to release balance, got %+v", balance)
	}
}

func TestPayoutRequestInvalidTransitionsAndMissingDestinationAreRejected(t *testing.T) {
	store := newStore("")
	store.createPayment(createPaymentRequest{
		Amount:            1000,
		Currency:          "GBP",
		Provider:          "stripe",
		PaymentMethodType: "card",
		Metadata: map[string]string{
			"client_id":  "rollfinders",
			"academy_id": "academy_123",
		},
	}, providerResult{Status: statusSucceeded, ProviderID: "pi_paid"})
	if _, err := store.createPayoutRequest("academy_123", createPayoutRequestPayload{
		ClientID: "rollfinders",
		Amount:   500,
		Currency: "GBP",
	}); err != errPayoutDestination {
		t.Fatalf("expected missing destination to be rejected, got %v", err)
	}
	payout, err := store.createPayoutRequest("academy_123", createPayoutRequestPayload{
		ClientID:             "rollfinders",
		Amount:               500,
		Currency:             "GBP",
		DestinationAccountID: "acct_academy",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.transitionPayoutRequest(payout.ID, payoutStatusPaid, payoutTransitionPayload{ProviderReference: "po_123"}); err != errInvalidTransition {
		t.Fatalf("expected direct pending to paid transition to fail, got %v", err)
	}
}

func TestPayoutRequestAPIIsIdempotentAndPaymentHistoryStillWorks(t *testing.T) {
	srv := testServer("")
	paymentBody := []byte(`{"amount":1000,"currency":"GBP","provider":"stripe","payment_method_type":"card","metadata":{"client_id":"rollfinders","academy_id":"academy_123","stripe_application_fee_amount":"50"}}`)
	paymentReq := httptest.NewRequest(http.MethodPost, "/v1/payments", bytes.NewReader(paymentBody))
	authed(paymentReq)
	paymentReq.Header.Set("Content-Type", "application/json")
	paymentReq.Header.Set("Idempotency-Key", "academy-payment")
	paymentRes := httptest.NewRecorder()
	srv.ServeHTTP(paymentRes, paymentReq)
	if paymentRes.Code != http.StatusCreated {
		t.Fatalf("expected payment status 201, got %d: %s", paymentRes.Code, paymentRes.Body.String())
	}

	balanceReq := httptest.NewRequest(http.MethodGet, "/v1/payees/academy_123/balances?client_id=rollfinders&currency=GBP", nil)
	authed(balanceReq)
	balanceRes := httptest.NewRecorder()
	srv.ServeHTTP(balanceRes, balanceReq)
	if balanceRes.Code != http.StatusOK {
		t.Fatalf("expected balance status 200, got %d: %s", balanceRes.Code, balanceRes.Body.String())
	}
	var balance PayeeBalance
	if err := json.Unmarshal(balanceRes.Body.Bytes(), &balance); err != nil {
		t.Fatal(err)
	}
	if balance.AvailablePayoutAmount != 950 {
		t.Fatalf("expected API balance 950, got %+v", balance)
	}

	payoutBody := []byte(`{"client_id":"rollfinders","amount":500,"currency":"GBP","destination_account_id":"acct_academy","requested_by":"user_123"}`)
	var first PayoutRequest
	for i := 0; i < 2; i++ {
		payoutReq := httptest.NewRequest(http.MethodPost, "/v1/payees/academy_123/payout-requests", bytes.NewReader(payoutBody))
		authed(payoutReq)
		payoutReq.Header.Set("Content-Type", "application/json")
		payoutReq.Header.Set("Idempotency-Key", "payout-request-one")
		payoutRes := httptest.NewRecorder()
		srv.ServeHTTP(payoutRes, payoutReq)
		if payoutRes.Code != http.StatusCreated {
			t.Fatalf("request %d expected payout status 201, got %d: %s", i+1, payoutRes.Code, payoutRes.Body.String())
		}
		var payout PayoutRequest
		if err := json.Unmarshal(payoutRes.Body.Bytes(), &payout); err != nil {
			t.Fatal(err)
		}
		if i == 0 {
			first = payout
			continue
		}
		if payout.ID != first.ID {
			t.Fatalf("expected idempotent payout replay, first=%+v second=%+v", first, payout)
		}
	}

	historyReq := httptest.NewRequest(http.MethodGet, "/v1/payments?limit=10", nil)
	authed(historyReq)
	historyRes := httptest.NewRecorder()
	srv.ServeHTTP(historyRes, historyReq)
	if historyRes.Code != http.StatusOK {
		t.Fatalf("expected payment history status 200, got %d: %s", historyRes.Code, historyRes.Body.String())
	}
	var history PaymentHistoryResponse
	if err := json.Unmarshal(historyRes.Body.Bytes(), &history); err != nil {
		t.Fatal(err)
	}
	if history.Count != 1 {
		t.Fatalf("expected payment history to keep working, got %+v", history)
	}
}

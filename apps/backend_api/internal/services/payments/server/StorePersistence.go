package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"rollfinders/internal/services/payments/dataaccess"
)

func randomID(prefix string) string {
	var b [6]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UTC().UnixNano())
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}

func (s *store) createPaymentClientDB(req createPaymentClientRequest) (PaymentClient, error) {
	id := req.ID
	if id == "" {
		id = randomID("client")
	}
	if err := dataaccess.CreatePaymentClient(context.Background(), s.db, id, req.Name, req.CallbackURL); err != nil {
		return PaymentClient{}, err
	}
	return s.getPaymentClientDB(id)
}

func (s *store) getPaymentClientDB(id string) (PaymentClient, error) {
	client, err := dataaccess.GetPaymentClient(context.Background(), s.db, id)
	if errors.Is(err, dataaccess.ErrNotFound) {
		return PaymentClient{}, errNotFound
	}
	if err != nil {
		return PaymentClient{}, err
	}
	return paymentClientFromDataAccess(client), nil
}

func (s *store) createPaymentDB(req createPaymentRequest, provider providerResult) (Payment, error) {
	id := randomID("pay")
	metadata, err := json.Marshal(nonNilMap(req.Metadata))
	if err != nil {
		return Payment{}, err
	}
	if err := dataaccess.CreatePayment(
		context.Background(),
		s.db,
		id,
		req.Amount,
		req.Currency,
		req.Provider,
		req.PaymentMethodType,
		defaultCaptureMethod(req.CaptureMethod),
		provider.Status,
		nullableString(req.ExternalReference),
		string(metadata),
		nullableString(provider.ProviderID),
		nullableString(provider.RawStatus),
	); err != nil {
		return Payment{}, err
	}
	payment, err := s.getPaymentDB(id)
	if err != nil {
		return Payment{}, err
	}
	payment.NextAction = cloneMap(provider.NextAction)
	return payment, nil
}

func (s *store) getPaymentDB(id string) (Payment, error) {
	payment, err := dataaccess.GetPayment(context.Background(), s.db, id)
	if errors.Is(err, dataaccess.ErrNotFound) {
		return Payment{}, errNotFound
	}
	if err != nil {
		return Payment{}, err
	}
	return paymentFromDataAccess(payment), nil
}

func (s *store) createCheckoutDB(req createCheckoutRequest, payment Payment, checkoutID string, successURL string, cancelURL string) (Checkout, error) {
	checkoutURL := checkoutURLForPayment(payment, successURL)
	metadata, err := json.Marshal(nonNilMap(req.Metadata))
	if err != nil {
		return Checkout{}, err
	}
	expiresAt := time.Now().UTC().Add(30 * time.Minute)
	if err := dataaccess.CreateCheckout(
		context.Background(),
		s.db,
		checkoutID,
		req.ClientID,
		nullableString(req.ClientState),
		payment.ID,
		req.ResourceType,
		req.ResourceID,
		nullableString(req.ResourceLabel),
		req.Amount,
		req.Currency,
		nullableString(req.PayerUserID),
		nullableString(req.PayerEmail),
		string(metadata),
		successURL,
		cancelURL,
		checkoutURL,
		expiresAt,
	); err != nil {
		return Checkout{}, err
	}
	return s.getCheckoutDB(checkoutID)
}

func (s *store) getCheckoutDB(id string) (Checkout, error) {
	checkout, err := dataaccess.GetCheckout(context.Background(), s.db, id)
	if errors.Is(err, dataaccess.ErrNotFound) {
		return Checkout{}, errNotFound
	}
	if err != nil {
		return Checkout{}, err
	}
	return checkoutFromDataAccess(checkout), nil
}

func (s *store) listPaymentsDB(filter paymentHistoryFilter) ([]PaymentRecord, error) {
	records, err := dataaccess.ListPaymentHistory(
		context.Background(),
		s.db,
		nullIfEmpty(filter.ClientID),
		nullIfEmpty(filter.ResourceType),
		nullIfEmpty(filter.ResourceID),
		nullIfEmpty(filter.PayerUserID),
		nullIfEmpty(filter.PayerEmail),
		nullIfEmpty(filter.Status),
		filter.Limit,
		filter.Offset,
	)
	if err != nil {
		return nil, err
	}
	out := make([]PaymentRecord, 0, len(records))
	for _, record := range records {
		out = append(out, paymentRecordFromDataAccess(record))
	}
	return out, nil
}

func (s *store) transitionPaymentDB(id, nextStatus string) (Payment, error) {
	payment, err := s.getPaymentDB(id)
	if err != nil {
		return Payment{}, err
	}
	if !validPaymentTransition(payment.Status, nextStatus) {
		return Payment{}, errInvalidTransition
	}
	if err := dataaccess.TransitionPayment(context.Background(), s.db, id, nextStatus, nil); err != nil {
		return Payment{}, err
	}
	return s.getPaymentDB(id)
}

func (s *store) createRefundDB(paymentID string, req refundRequest, result providerResult) (Refund, Payment, error) {
	payment, err := s.getPaymentDB(paymentID)
	if errors.Is(err, errNotFound) {
		return Refund{}, Payment{}, errNotFound
	}
	if err != nil {
		return Refund{}, Payment{}, err
	}
	if payment.Status != statusSucceeded && payment.Status != statusPartiallyRefunded {
		return Refund{}, Payment{}, errInvalidTransition
	}
	amount := req.Amount
	if amount == 0 {
		amount = payment.Amount - payment.RefundedAmount
	}
	if amount <= 0 || amount > payment.Amount-payment.RefundedAmount {
		return Refund{}, Payment{}, errOverRefund
	}
	id := randomID("rfnd")
	if err := dataaccess.CreateRefund(context.Background(), s.db, id, paymentID, amount, payment.Currency, result.Status, nullableString(req.Reason), nullableString(result.ProviderID)); err != nil {
		return Refund{}, Payment{}, err
	}
	refunds, err := s.listRefundsDB(paymentID, 100, 0)
	if err != nil {
		return Refund{}, Payment{}, err
	}
	updated, err := s.getPaymentDB(paymentID)
	if err != nil {
		return Refund{}, Payment{}, err
	}
	for _, refund := range refunds {
		if refund.ID == id {
			return refund, updated, nil
		}
	}
	return Refund{}, Payment{}, errNotFound
}

func (s *store) listRefundsDB(paymentID string, limit int, offset int) ([]Refund, error) {
	if _, err := s.getPaymentDB(paymentID); err != nil {
		return nil, err
	}
	refunds, err := dataaccess.ListRefunds(context.Background(), s.db, paymentID, limit, offset)
	if err != nil {
		return nil, err
	}
	out := make([]Refund, 0, len(refunds))
	for _, refund := range refunds {
		out = append(out, refundFromDataAccess(refund))
	}
	return out, nil
}

func (s *store) getPayeeBalanceDB(payeeID, clientID, currency string) (PayeeBalance, error) {
	if currency == "" {
		currency = "GBP"
	}
	balance, err := dataaccess.GetPayeeBalance(context.Background(), s.db, payeeID, nullIfEmpty(clientID), currency)
	if err != nil {
		return PayeeBalance{}, err
	}
	return payeeBalanceFromDataAccess(balance), nil
}

func (s *store) createPayoutRequestDB(payeeID string, req createPayoutRequestPayload) (PayoutRequest, error) {
	id := randomID("payout")
	err := dataaccess.CreatePayoutRequest(
		context.Background(),
		s.db,
		id,
		req.ClientID,
		payeeID,
		req.Amount,
		req.Currency,
		req.DestinationAccountID,
		nullableString(req.RequestedBy),
		nullableString(req.Notes),
	)
	if err != nil {
		return PayoutRequest{}, payoutDBError(err)
	}
	return s.getPayoutRequestDB(id)
}

func (s *store) listPayoutRequestsDB(filter payoutRequestFilter) ([]PayoutRequest, error) {
	records, err := dataaccess.ListPayoutRequests(
		context.Background(),
		s.db,
		nullIfEmpty(filter.ClientID),
		nullIfEmpty(filter.PayeeID),
		nullIfEmpty(filter.Status),
		nullIfEmpty(filter.Currency),
		filter.Limit,
		filter.Offset,
	)
	if err != nil {
		return nil, err
	}
	out := make([]PayoutRequest, 0, len(records))
	for _, record := range records {
		out = append(out, payoutRequestFromDataAccess(record))
	}
	return out, nil
}

func (s *store) getPayoutRequestDB(id string) (PayoutRequest, error) {
	payout, err := dataaccess.GetPayoutRequest(context.Background(), s.db, id)
	if errors.Is(err, dataaccess.ErrNotFound) {
		return PayoutRequest{}, errNotFound
	}
	if err != nil {
		return PayoutRequest{}, err
	}
	return payoutRequestFromDataAccess(payout), nil
}

func (s *store) getPaymentAccountSettingDB(ownerType, ownerID, provider string) (PaymentAccountSetting, error) {
	rows, err := s.db.Query(context.Background(), `
		SELECT id, owner_type, owner_id, academy_id, provider, provider_account_id, status,
		       charges_enabled, payouts_enabled, created_at, updated_at
		FROM payments.payment_account_settings
		WHERE owner_type = $1 AND owner_id = $2 AND provider = $3
		LIMIT 1
	`, ownerType, ownerID, provider)
	row, err := dataaccess.FirstRowForService(rows, err)
	if errors.Is(err, dataaccess.ErrNotFound) {
		return PaymentAccountSetting{}, errNotFound
	}
	if err != nil {
		return PaymentAccountSetting{}, err
	}
	return paymentAccountSettingFromDataAccess(dataaccess.PaymentAccountSettingFromRow(row)), nil
}

func (s *store) upsertPaymentAccountSettingDB(owner PaymentAccountOwner, account stripeAccount) (PaymentAccountSetting, error) {
	chargesEnabled := account.ChargesEnabled
	payoutsEnabled := account.PayoutsEnabled
	status := "verification_required"
	if account.DetailsSubmitted && chargesEnabled && payoutsEnabled {
		status = "verified"
	}
	academyID := ""
	if owner.OwnerType == "academy" {
		academyID = owner.OwnerID
	}
	rows, err := s.db.Query(context.Background(), `
		INSERT INTO payments.payment_account_settings (
			id, owner_type, owner_id, academy_id, provider, provider_account_id, status,
			charges_enabled, payouts_enabled, created_at, updated_at
		)
		VALUES ($1, $2, $3, NULLIF($4, ''), 'stripe', $5, $6, $7, $8, now(), now())
		ON CONFLICT (owner_type, owner_id, provider) DO UPDATE
		SET academy_id = EXCLUDED.academy_id,
		    provider_account_id = EXCLUDED.provider_account_id,
		    status = EXCLUDED.status,
		    charges_enabled = EXCLUDED.charges_enabled,
		    payouts_enabled = EXCLUDED.payouts_enabled,
		    updated_at = now()
		RETURNING id, owner_type, owner_id, academy_id, provider, provider_account_id, status,
		          charges_enabled, payouts_enabled, created_at, updated_at
	`, randomID("pa"), owner.OwnerType, owner.OwnerID, academyID, account.ID, status, chargesEnabled, payoutsEnabled)
	row, err := dataaccess.FirstRowForService(rows, err)
	if err != nil {
		return PaymentAccountSetting{}, err
	}
	return paymentAccountSettingFromDataAccess(dataaccess.PaymentAccountSettingFromRow(row)), nil
}

func (s *store) disconnectPaymentAccountSettingDB(owner PaymentAccountOwner) (PaymentAccountSetting, error) {
	rows, err := s.db.Query(context.Background(), `
		UPDATE payments.payment_account_settings
		SET provider_account_id = NULL,
		    status = 'disconnected',
		    charges_enabled = false,
		    payouts_enabled = false,
		    updated_at = now()
		WHERE owner_type = $1 AND owner_id = $2 AND provider = 'stripe'
		RETURNING id, owner_type, owner_id, academy_id, provider, provider_account_id, status,
		          charges_enabled, payouts_enabled, created_at, updated_at
	`, owner.OwnerType, owner.OwnerID)
	row, err := dataaccess.FirstRowForService(rows, err)
	if errors.Is(err, dataaccess.ErrNotFound) {
		return PaymentAccountSetting{}, errNotFound
	}
	if err != nil {
		return PaymentAccountSetting{}, err
	}
	return paymentAccountSettingFromDataAccess(dataaccess.PaymentAccountSettingFromRow(row)), nil
}

func (s *store) transitionPayoutRequestDB(id, nextStatus string, req payoutTransitionPayload) (PayoutRequest, error) {
	if err := dataaccess.TransitionPayoutRequest(
		context.Background(),
		s.db,
		id,
		nextStatus,
		nullableString(req.ActorID),
		nullableString(req.ProviderReference),
		nullableString(req.Reason),
		nullableString(req.Notes),
	); err != nil {
		return PayoutRequest{}, payoutDBError(err)
	}
	return s.getPayoutRequestDB(id)
}

func payoutDBError(err error) error {
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "payout_request_not_found"):
		return errNotFound
	case strings.Contains(msg, "payout_request_invalid_state"):
		return errInvalidTransition
	case strings.Contains(msg, "payee_account_not_enabled"):
		return errPayoutDestination
	case strings.Contains(msg, "payout_balance_unavailable"):
		return errInsufficientFunds
	default:
		return err
	}
}

func (s *store) recordProviderEventDB(provider, id string) (bool, error) {
	exists, err := dataaccess.ProviderEventExists(context.Background(), s.db, provider, id)
	if err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}
	if err := dataaccess.RecordProviderEvent(context.Background(), s.db, provider, id); err != nil {
		return false, err
	}
	return true, nil
}

func (s *store) withIdempotencyDB(scope, key, fingerprint string, execute func() (int, any)) (int, any, bool, error) {
	record, err := dataaccess.GetIdempotencyRecord(context.Background(), s.db, scope, key)
	if err == nil {
		if record.Fingerprint != fingerprint {
			return 0, nil, false, errIdempotencyConflict
		}
		var response any
		if record.Response != "" {
			_ = json.Unmarshal([]byte(record.Response), &response)
		}
		return record.StatusCode, response, true, nil
	}
	if err != nil && !errors.Is(err, dataaccess.ErrNotFound) {
		return 0, nil, false, err
	}

	status, response := execute()
	if status >= 200 && status < 300 {
		body, err := json.Marshal(response)
		if err != nil {
			return 0, nil, false, err
		}
		err = dataaccess.SaveIdempotencyRecord(
			context.Background(),
			s.db,
			scope,
			key,
			fingerprint,
			status,
			string(body),
			nil,
			time.Now().UTC().Add(24*time.Hour),
		)
		if err != nil {
			return 0, nil, false, err
		}
	}
	return status, response, false, nil
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func nonNilMap(in map[string]string) map[string]string {
	if in == nil {
		return map[string]string{}
	}
	return in
}

func paymentClientFromDataAccess(client dataaccess.PaymentClient) PaymentClient {
	return PaymentClient{ID: client.ID, Name: client.Name, CallbackURL: client.CallbackURL, CreatedAt: client.CreatedAt}
}

func paymentFromDataAccess(payment dataaccess.Payment) Payment {
	return Payment{
		ID:                payment.ID,
		Amount:            payment.Amount,
		Currency:          payment.Currency,
		Provider:          payment.Provider,
		PaymentMethodType: payment.PaymentMethodType,
		CaptureMethod:     payment.CaptureMethod,
		ExternalReference: payment.ExternalReference,
		Metadata:          payment.Metadata,
		Status:            payment.Status,
		RefundedAmount:    payment.RefundedAmount,
		ProviderPaymentID: payment.ProviderPaymentID,
		ProviderRawStatus: payment.ProviderRawStatus,
		CreatedAt:         payment.CreatedAt,
		UpdatedAt:         payment.UpdatedAt,
	}
}

func checkoutFromDataAccess(checkout dataaccess.Checkout) Checkout {
	return Checkout{
		CheckoutSessionID: checkout.CheckoutSessionID,
		ClientID:          checkout.ClientID,
		ClientState:       checkout.ClientState,
		CheckoutURL:       checkout.CheckoutURL,
		PaymentID:         checkout.PaymentID,
		ResourceType:      checkout.ResourceType,
		ResourceID:        checkout.ResourceID,
		ResourceLabel:     checkout.ResourceLabel,
		Amount:            checkout.Amount,
		Currency:          checkout.Currency,
		PayerUserID:       checkout.PayerUserID,
		PayerEmail:        checkout.PayerEmail,
		Metadata:          checkout.Metadata,
		SuccessURL:        checkout.SuccessURL,
		CancelURL:         checkout.CancelURL,
		ExpiresAt:         checkout.ExpiresAt,
		CreatedAt:         checkout.CreatedAt,
	}
}

func paymentRecordFromDataAccess(record dataaccess.PaymentRecord) PaymentRecord {
	return PaymentRecord{
		Payment:           paymentFromDataAccess(record.Payment),
		CheckoutSessionID: record.CheckoutSessionID,
		ClientID:          record.ClientID,
		ClientState:       record.ClientState,
		ResourceType:      record.ResourceType,
		ResourceID:        record.ResourceID,
		ResourceLabel:     record.ResourceLabel,
		PayerUserID:       record.PayerUserID,
		PayerEmail:        record.PayerEmail,
	}
}

func refundFromDataAccess(refund dataaccess.Refund) Refund {
	return Refund{
		ID:               refund.ID,
		PaymentID:        refund.PaymentID,
		Amount:           refund.Amount,
		Currency:         refund.Currency,
		Status:           refund.Status,
		Reason:           refund.Reason,
		ProviderRefundID: refund.ProviderRefundID,
		CreatedAt:        refund.CreatedAt,
		UpdatedAt:        refund.UpdatedAt,
	}
}

func payeeBalanceFromDataAccess(balance dataaccess.PayeeBalance) PayeeBalance {
	return PayeeBalance{
		PayeeID:                balance.PayeeID,
		ClientID:               balance.ClientID,
		Currency:               balance.Currency,
		GrossPaidAmount:        balance.GrossPaidAmount,
		PlatformFeeAmount:      balance.PlatformFeeAmount,
		RefundedAmount:         balance.RefundedAmount,
		HeldAmount:             balance.HeldAmount,
		PendingPayoutAmount:    balance.PendingPayoutAmount,
		PaidPayoutAmount:       balance.PaidPayoutAmount,
		AvailablePayoutAmount:  balance.AvailablePayoutAmount,
		MinimumPayoutAmount:    balance.MinimumPayoutAmount,
		PayoutDestinationReady: balance.PayoutDestinationReady,
	}
}

func payoutRequestFromDataAccess(payout dataaccess.PayoutRequest) PayoutRequest {
	return PayoutRequest{
		ID:                   payout.ID,
		ClientID:             payout.ClientID,
		PayeeID:              payout.PayeeID,
		Amount:               payout.Amount,
		Currency:             payout.Currency,
		Status:               payout.Status,
		DestinationAccountID: payout.DestinationAccountID,
		RequestedBy:          payout.RequestedBy,
		ActorID:              payout.ActorID,
		ProviderReference:    payout.ProviderReference,
		Reason:               payout.Reason,
		Notes:                payout.Notes,
		CreatedAt:            payout.CreatedAt,
		UpdatedAt:            payout.UpdatedAt,
	}
}

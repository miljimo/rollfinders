package server

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"payments/internal/databases"
)

const (
	statusRequiresAction    = "requires_action"
	statusAuthorized        = "authorized"
	statusProcessing        = "processing"
	statusSucceeded         = "succeeded"
	statusFailed            = "failed"
	statusCancelled         = "cancelled"
	statusPartiallyRefunded = "partially_refunded"
	statusRefunded          = "refunded"

	refundPending   = "pending"
	refundSucceeded = "succeeded"
	refundFailed    = "failed"
	refundCancelled = "cancelled"
)

var (
	errInvalidTransition = errors.New("invalid state transition")
	errOverRefund        = errors.New("refund exceeds refundable amount")
	errNotFound          = errors.New("not found")
	errPaymentCompleted  = errors.New("payment already completed")
)

type Payment struct {
	ID                string            `json:"id"`
	Amount            int64             `json:"amount"`
	Currency          string            `json:"currency"`
	Provider          string            `json:"provider"`
	PaymentMethodType string            `json:"payment_method_type"`
	CaptureMethod     string            `json:"capture_method"`
	ExternalReference string            `json:"external_reference,omitempty"`
	Metadata          map[string]string `json:"metadata,omitempty"`
	Status            string            `json:"status"`
	RefundedAmount    int64             `json:"refunded_amount"`
	ProviderPaymentID string            `json:"provider_payment_id,omitempty"`
	ProviderRawStatus string            `json:"provider_status,omitempty"`
	NextAction        map[string]string `json:"next_action,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

type PaymentRecord struct {
	Payment
	CheckoutSessionID string `json:"checkout_session_id,omitempty"`
	ClientID          string `json:"client_id,omitempty"`
	ClientState       string `json:"client_state,omitempty"`
	ResourceType      string `json:"resource_type,omitempty"`
	ResourceID        string `json:"resource_id,omitempty"`
	ResourceLabel     string `json:"resource_label,omitempty"`
	PayerUserID       string `json:"payer_user_id,omitempty"`
	PayerEmail        string `json:"payer_email,omitempty"`
}

type paymentHistoryFilter struct {
	ClientID     string
	ResourceType string
	ResourceID   string
	PayerUserID  string
	PayerEmail   string
	Status       string
	Limit        int
}

type PaymentHistoryResponse struct {
	Payments []PaymentRecord `json:"payments"`
	Count    int             `json:"count"`
}

type Checkout struct {
	CheckoutSessionID string            `json:"checkout_session_id"`
	ClientID          string            `json:"client_id"`
	ClientState       string            `json:"client_state,omitempty"`
	CheckoutURL       string            `json:"checkout_url"`
	PaymentID         string            `json:"payment_id"`
	ResourceType      string            `json:"resource_type"`
	ResourceID        string            `json:"resource_id"`
	ResourceLabel     string            `json:"resource_label,omitempty"`
	Amount            int64             `json:"amount"`
	Currency          string            `json:"currency"`
	PayerUserID       string            `json:"payer_user_id,omitempty"`
	PayerEmail        string            `json:"payer_email,omitempty"`
	Metadata          map[string]string `json:"metadata,omitempty"`
	SuccessURL        string            `json:"success_url,omitempty"`
	CancelURL         string            `json:"cancel_url,omitempty"`
	ExpiresAt         time.Time         `json:"expires_at"`
	CreatedAt         time.Time         `json:"created_at"`
}

type PaymentClient struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	CallbackURL string    `json:"callback_url"`
	CreatedAt   time.Time `json:"created_at"`
}

type Refund struct {
	ID               string    `json:"id"`
	PaymentID        string    `json:"payment_id"`
	Amount           int64     `json:"amount"`
	Currency         string    `json:"currency"`
	Status           string    `json:"status"`
	Reason           string    `json:"reason,omitempty"`
	ProviderRefundID string    `json:"provider_refund_id,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type OutboxEvent struct {
	ID          string
	Type        string
	AggregateID string
	Payload     map[string]any
	Delivered   bool
	Attempts    int
	LastError   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type idempotencyRecord struct {
	Fingerprint string
	StatusCode  int
	Response    any
}

type providerEvent struct {
	Provider string
	ID       string
}

type store struct {
	db        databases.DataContext
	mu        sync.Mutex
	next      int64
	payments  map[string]*Payment
	checkouts map[string]*Checkout
	clients   map[string]*PaymentClient
	refunds   map[string][]*Refund
	idem      map[string]idempotencyRecord
	idemWait  map[string]chan struct{}
	events    map[providerEvent]struct{}
	outbox    []*OutboxEvent
	metrics   metrics
}

func newStore(databaseURL ...string) *store {
	var db databases.DataContext
	if len(databaseURL) > 0 && databaseURL[0] != "" {
		if opened, err := databases.WithCredential(context.Background(), databaseURL[0]); err == nil {
			db = opened
		}
	}
	return &store{
		db:        db,
		payments:  map[string]*Payment{},
		checkouts: map[string]*Checkout{},
		clients:   map[string]*PaymentClient{},
		refunds:   map[string][]*Refund{},
		idem:      map[string]idempotencyRecord{},
		idemWait:  map[string]chan struct{}{},
		events:    map[providerEvent]struct{}{},
	}
}

func (s *store) createPaymentClient(req createPaymentClientRequest) PaymentClient {
	if s.db != nil {
		client, err := s.createPaymentClientDB(req)
		if err == nil {
			return client
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	id := req.ID
	if id == "" {
		id = s.newID("client")
	}
	client := &PaymentClient{
		ID:          id,
		Name:        req.Name,
		CallbackURL: req.CallbackURL,
		CreatedAt:   now,
	}
	s.clients[client.ID] = client
	return *clonePaymentClient(client)
}

func (s *store) getPaymentClient(id string) (PaymentClient, bool) {
	if s.db != nil {
		client, err := s.getPaymentClientDB(id)
		return client, err == nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	client, ok := s.clients[id]
	if !ok {
		return PaymentClient{}, false
	}
	return *clonePaymentClient(client), true
}

func (s *store) allocateID(prefix string) string {
	if s.db != nil {
		return randomID(prefix)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.newID(prefix)
}

func (s *store) newID(prefix string) string {
	s.next++
	return fmt.Sprintf("%s_%06d", prefix, s.next)
}

func (s *store) createPayment(req createPaymentRequest, provider providerResult) Payment {
	if s.db != nil {
		payment, err := s.createPaymentDB(req, provider)
		if err == nil {
			return payment
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	p := &Payment{
		ID:                s.newID("pay"),
		Amount:            req.Amount,
		Currency:          req.Currency,
		Provider:          req.Provider,
		PaymentMethodType: req.PaymentMethodType,
		CaptureMethod:     defaultCaptureMethod(req.CaptureMethod),
		ExternalReference: req.ExternalReference,
		Metadata:          cloneMap(req.Metadata),
		Status:            provider.Status,
		ProviderPaymentID: provider.ProviderID,
		ProviderRawStatus: provider.RawStatus,
		NextAction:        cloneMap(provider.NextAction),
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	s.payments[p.ID] = p
	s.addOutboxLocked("payment.status_changed", p.ID, paymentEventPayload(*p))
	return *clonePayment(p)
}

func (s *store) createCheckout(req createCheckoutRequest, payment Payment, checkoutID string, successURL string, cancelURL string) Checkout {
	if s.db != nil {
		checkout, err := s.createCheckoutDB(req, payment, checkoutID, successURL, cancelURL)
		if err == nil {
			return checkout
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	checkout := &Checkout{
		CheckoutSessionID: checkoutID,
		ClientID:          req.ClientID,
		ClientState:       req.ClientState,
		CheckoutURL:       checkoutURLForPayment(payment, successURL),
		PaymentID:         payment.ID,
		ResourceType:      req.ResourceType,
		ResourceID:        req.ResourceID,
		ResourceLabel:     req.ResourceLabel,
		Amount:            req.Amount,
		Currency:          req.Currency,
		PayerUserID:       req.PayerUserID,
		PayerEmail:        req.PayerEmail,
		Metadata:          cloneMap(req.Metadata),
		SuccessURL:        successURL,
		CancelURL:         cancelURL,
		ExpiresAt:         now.Add(30 * time.Minute),
		CreatedAt:         now,
	}
	s.checkouts[checkout.CheckoutSessionID] = checkout
	s.addOutboxLocked("checkout.created", checkout.CheckoutSessionID, map[string]any{
		"checkout_session_id": checkout.CheckoutSessionID,
		"client_id":           checkout.ClientID,
		"payment_id":          checkout.PaymentID,
		"resource_type":       checkout.ResourceType,
		"resource_id":         checkout.ResourceID,
		"amount":              checkout.Amount,
		"currency":            checkout.Currency,
		"payer_email":         checkout.PayerEmail,
		"created_at":          checkout.CreatedAt,
	})
	return *cloneCheckout(checkout)
}

func (s *store) getCheckout(id string) (Checkout, bool) {
	if s.db != nil {
		checkout, err := s.getCheckoutDB(id)
		return checkout, err == nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	checkout, ok := s.checkouts[id]
	if !ok {
		return Checkout{}, false
	}
	return *cloneCheckout(checkout), true
}

func (s *store) getPayment(id string) (Payment, bool) {
	if s.db != nil {
		payment, err := s.getPaymentDB(id)
		return payment, err == nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.payments[id]
	if !ok {
		return Payment{}, false
	}
	return *clonePayment(p), true
}

func (s *store) listPayments(filter paymentHistoryFilter) []PaymentRecord {
	if s.db != nil {
		payments, err := s.listPaymentsDB(filter)
		if err == nil {
			return payments
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 100
	}
	records := make([]PaymentRecord, 0, len(s.payments))
	for _, payment := range s.payments {
		record := PaymentRecord{Payment: *clonePayment(payment)}
		for _, checkout := range s.checkouts {
			if checkout.PaymentID != payment.ID {
				continue
			}
			record.CheckoutSessionID = checkout.CheckoutSessionID
			record.ClientID = checkout.ClientID
			record.ClientState = checkout.ClientState
			record.ResourceType = checkout.ResourceType
			record.ResourceID = checkout.ResourceID
			record.ResourceLabel = checkout.ResourceLabel
			record.PayerUserID = checkout.PayerUserID
			record.PayerEmail = checkout.PayerEmail
			break
		}
		if !paymentRecordMatches(record, filter) {
			continue
		}
		records = append(records, record)
	}
	sort.Slice(records, func(i, j int) bool { return records[i].CreatedAt.After(records[j].CreatedAt) })
	if len(records) > limit {
		records = records[:limit]
	}
	return records
}

func paymentRecordMatches(record PaymentRecord, filter paymentHistoryFilter) bool {
	if filter.ClientID != "" && record.ClientID != filter.ClientID {
		return false
	}
	if filter.ResourceType != "" && record.ResourceType != filter.ResourceType {
		return false
	}
	if filter.ResourceID != "" && record.ResourceID != filter.ResourceID {
		return false
	}
	if filter.PayerUserID != "" && record.PayerUserID != filter.PayerUserID && record.Metadata["payer_user_id"] != filter.PayerUserID {
		return false
	}
	if filter.PayerEmail != "" && record.PayerEmail != filter.PayerEmail && record.Metadata["payer_email"] != filter.PayerEmail {
		return false
	}
	if filter.Status != "" && record.Status != filter.Status {
		return false
	}
	return true
}

func (s *store) transitionPayment(id, nextStatus string) (Payment, error) {
	if s.db != nil {
		return s.transitionPaymentDB(id, nextStatus)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.payments[id]
	if !ok {
		return Payment{}, errNotFound
	}
	if !validPaymentTransition(p.Status, nextStatus) {
		return Payment{}, errInvalidTransition
	}
	p.Status = nextStatus
	p.UpdatedAt = time.Now().UTC()
	s.addOutboxLocked("payment.status_changed", p.ID, paymentEventPayload(*p))
	return *clonePayment(p), nil
}

func (s *store) createRefund(paymentID string, req refundRequest, result providerResult) (Refund, Payment, error) {
	if s.db != nil {
		return s.createRefundDB(paymentID, req, result)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.payments[paymentID]
	if !ok {
		return Refund{}, Payment{}, errNotFound
	}
	if p.Status != statusSucceeded && p.Status != statusPartiallyRefunded {
		return Refund{}, Payment{}, errInvalidTransition
	}
	amount := req.Amount
	if amount == 0 {
		amount = p.Amount - p.RefundedAmount
	}
	if amount <= 0 || amount > p.Amount-p.RefundedAmount {
		return Refund{}, Payment{}, errOverRefund
	}
	now := time.Now().UTC()
	refund := &Refund{
		ID:               s.newID("rfnd"),
		PaymentID:        p.ID,
		Amount:           amount,
		Currency:         p.Currency,
		Status:           result.Status,
		Reason:           req.Reason,
		ProviderRefundID: result.ProviderID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	s.refunds[p.ID] = append(s.refunds[p.ID], refund)
	if refund.Status == refundSucceeded {
		p.RefundedAmount += amount
		if p.RefundedAmount == p.Amount {
			p.Status = statusRefunded
		} else {
			p.Status = statusPartiallyRefunded
		}
		p.UpdatedAt = now
		s.addOutboxLocked("payment.status_changed", p.ID, paymentEventPayload(*p))
	}
	s.addOutboxLocked("refund.status_changed", refund.ID, map[string]any{
		"refund_id": refund.ID, "payment_id": p.ID, "status": refund.Status,
		"amount": refund.Amount, "currency": refund.Currency, "created_at": refund.CreatedAt,
	})
	return *cloneRefund(refund), *clonePayment(p), nil
}

func (s *store) listRefunds(paymentID string) ([]Refund, bool) {
	if s.db != nil {
		refunds, err := s.listRefundsDB(paymentID)
		return refunds, err == nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.payments[paymentID]; !ok {
		return nil, false
	}
	items := make([]Refund, 0, len(s.refunds[paymentID]))
	for _, r := range s.refunds[paymentID] {
		items = append(items, *cloneRefund(r))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.Before(items[j].CreatedAt) })
	return items, true
}

func (s *store) recordProviderEvent(provider, id string) bool {
	if s.db != nil {
		recorded, err := s.recordProviderEventDB(provider, id)
		return err == nil && recorded
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	key := providerEvent{Provider: provider, ID: id}
	if _, exists := s.events[key]; exists {
		return false
	}
	s.events[key] = struct{}{}
	return true
}

func (s *store) addOutboxLocked(eventType, aggregateID string, payload map[string]any) {
	now := time.Now().UTC()
	s.outbox = append(s.outbox, &OutboxEvent{
		ID: s.newID("evt"), Type: eventType, AggregateID: aggregateID,
		Payload: payload, CreatedAt: now, UpdatedAt: now,
	})
}

func (s *store) dispatchOutbox(limit int) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for _, event := range s.outbox {
		if count >= limit {
			break
		}
		if event.Delivered {
			continue
		}
		event.Attempts++
		event.Delivered = true
		event.LastError = ""
		event.UpdatedAt = time.Now().UTC()
		count++
	}
	s.metrics.outboxDispatched += int64(count)
	return count
}

func (s *store) withIdempotency(scope, key, fingerprint string, execute func() (int, any)) (int, any, bool, error) {
	if s.db != nil {
		return s.withIdempotencyDB(scope, key, fingerprint, execute)
	}
	idemKey := scope + ":" + key
	for {
		s.mu.Lock()
		if existing, ok := s.idem[idemKey]; ok {
			s.mu.Unlock()
			if existing.Fingerprint != fingerprint {
				return 0, nil, false, errIdempotencyConflict
			}
			return existing.StatusCode, existing.Response, true, nil
		}
		if wait, ok := s.idemWait[idemKey]; ok {
			s.mu.Unlock()
			<-wait
			continue
		}
		wait := make(chan struct{})
		s.idemWait[idemKey] = wait
		s.mu.Unlock()
		break
	}

	status, response := execute()
	s.mu.Lock()
	if status >= 200 && status < 300 {
		s.idem[idemKey] = idempotencyRecord{Fingerprint: fingerprint, StatusCode: status, Response: response}
	}
	close(s.idemWait[idemKey])
	delete(s.idemWait, idemKey)
	s.mu.Unlock()
	return status, response, false, nil
}

func validPaymentTransition(from, to string) bool {
	if from == to {
		return true
	}
	allowed := map[string][]string{
		statusRequiresAction: {statusAuthorized, statusProcessing, statusSucceeded, statusFailed, statusCancelled},
		statusAuthorized:     {statusSucceeded, statusCancelled},
		statusProcessing:     {statusSucceeded, statusFailed, statusCancelled},
		statusSucceeded:      {statusPartiallyRefunded, statusRefunded},
	}
	for _, candidate := range allowed[from] {
		if candidate == to {
			return true
		}
	}
	return false
}

func defaultCaptureMethod(value string) string {
	if value == "" {
		return "automatic"
	}
	return value
}

func fingerprint(body []byte) string {
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}

func paymentEventPayload(p Payment) map[string]any {
	return map[string]any{"payment_id": p.ID, "status": p.Status, "amount": p.Amount, "currency": p.Currency, "updated_at": p.UpdatedAt}
}

func clonePayment(p *Payment) *Payment {
	cp := *p
	cp.Metadata = cloneMap(p.Metadata)
	cp.NextAction = cloneMap(p.NextAction)
	return &cp
}

func cloneRefund(r *Refund) *Refund {
	cp := *r
	return &cp
}

func cloneCheckout(c *Checkout) *Checkout {
	cp := *c
	cp.Metadata = cloneMap(c.Metadata)
	return &cp
}

func clonePaymentClient(c *PaymentClient) *PaymentClient {
	cp := *c
	return &cp
}

func cloneMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

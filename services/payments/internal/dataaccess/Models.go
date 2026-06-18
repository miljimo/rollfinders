package dataaccess

import "time"

type PaymentClient struct {
	ID          string
	Name        string
	CallbackURL string
	CreatedAt   time.Time
}

type Payment struct {
	ID                string
	Amount            int64
	Currency          string
	Provider          string
	PaymentMethodType string
	CaptureMethod     string
	ExternalReference string
	Metadata          map[string]string
	Status            string
	RefundedAmount    int64
	ProviderPaymentID string
	ProviderRawStatus string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Checkout struct {
	CheckoutSessionID string
	ClientID          string
	ClientState       string
	CheckoutURL       string
	PaymentID         string
	ResourceType      string
	ResourceID        string
	ResourceLabel     string
	Amount            int64
	Currency          string
	PayerUserID       string
	PayerEmail        string
	Metadata          map[string]string
	SuccessURL        string
	CancelURL         string
	ExpiresAt         time.Time
	CreatedAt         time.Time
}

type PaymentRecord struct {
	Payment
	CheckoutSessionID string
	ClientID          string
	ClientState       string
	ResourceType      string
	ResourceID        string
	ResourceLabel     string
	PayerUserID       string
	PayerEmail        string
}

type Refund struct {
	ID               string
	PaymentID        string
	Amount           int64
	Currency         string
	Status           string
	Reason           string
	ProviderRefundID string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type IdempotencyRecord struct {
	Fingerprint string
	StatusCode  int
	Response    string
}

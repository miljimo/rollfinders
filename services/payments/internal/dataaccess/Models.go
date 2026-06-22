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

type PlatformFeeSetting struct {
	PlatformFeeBasisPoints         int
	PlatformFeeFixedMinor          int64
	StripeProcessingFeeBasisPoints int
	StripeProcessingFeeFixedMinor  int64
	Currency                       string
}

type IdempotencyRecord struct {
	Fingerprint string
	StatusCode  int
	Response    string
}

type PayeeBalance struct {
	PayeeID                string
	ClientID               string
	Currency               string
	GrossPaidAmount        int64
	PlatformFeeAmount      int64
	RefundedAmount         int64
	HeldAmount             int64
	PendingPayoutAmount    int64
	PaidPayoutAmount       int64
	AvailablePayoutAmount  int64
	MinimumPayoutAmount    int64
	PayoutDestinationReady bool
}

type PayoutRequest struct {
	ID                   string
	ClientID             string
	PayeeID              string
	Amount               int64
	Currency             string
	Status               string
	DestinationAccountID string
	RequestedBy          string
	ActorID              string
	ProviderReference    string
	Reason               string
	Notes                string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

package server

import "time"

type PaymentAccountOwner struct {
	OwnerType string `json:"owner_type"`
	OwnerID   string `json:"owner_id"`
}

type PaymentAccountSetting struct {
	ID                string    `json:"id"`
	OwnerType         string    `json:"owner_type"`
	OwnerID           string    `json:"owner_id"`
	AcademyID         string    `json:"academy_id,omitempty"`
	Provider          string    `json:"provider"`
	ProviderAccountID string    `json:"provider_account_id,omitempty"`
	Status            string    `json:"status"`
	ChargesEnabled    bool      `json:"charges_enabled"`
	PayoutsEnabled    bool      `json:"payouts_enabled"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type stripeConnectRequest struct {
	OwnerType  string `json:"owner_type"`
	OwnerID    string `json:"owner_id"`
	Email      string `json:"email"`
	RefreshURL string `json:"refresh_url"`
	ReturnURL  string `json:"return_url"`
}

type stripeRefreshRequest struct {
	OwnerType string `json:"owner_type"`
	OwnerID   string `json:"owner_id"`
}

type stripeDisconnectRequest struct {
	OwnerType string `json:"owner_type"`
	OwnerID   string `json:"owner_id"`
}

type stripeConnectResponse struct {
	Account     PaymentAccountSetting `json:"account"`
	RedirectURL string                `json:"redirect_url"`
}

package requests

import "rollfinders/internal/services/wallet/domain"

type CreateLinkedAccountRequest struct {
	Provider          domain.LinkedAccountProvider       `json:"provider"`
	ProviderAccountID string                             `json:"provider_account_id"`
	ConnectionType    domain.LinkedAccountConnectionType `json:"connection_type"`
	Status            domain.LinkedAccountStatus         `json:"status"`
	DisplayName       string                             `json:"display_name"`
	ExternalReference string                             `json:"external_reference"`
	Currency          domain.Currency                    `json:"currency"`
}

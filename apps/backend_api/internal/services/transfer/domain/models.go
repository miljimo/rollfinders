package domain

import "time"

type TransferRequest struct {
	SourceWalletID      string `json:"source_wallet_id"`
	DestinationWalletID string `json:"destination_wallet_id"`
	Amount              int64  `json:"amount"`
	Currency            string `json:"currency"`
	ReferenceType       string `json:"reference_type,omitempty"`
	ReferenceID         string `json:"reference_id,omitempty"`
	Description         string `json:"description,omitempty"`
	IdempotencyKey      string `json:"-"`
}

type TransferStatus string

const (
	TransferPending    TransferStatus = "PENDING"
	TransferProcessing TransferStatus = "PROCESSING"
	TransferCompleted  TransferStatus = "COMPLETED"
	TransferFailed     TransferStatus = "FAILED"
	TransferCancelled  TransferStatus = "CANCELLED"
)

type Transfer struct {
	ID                  string    `json:"id"`
	Status              string    `json:"status"`
	Amount              int64     `json:"amount"`
	Currency            string    `json:"currency"`
	SourceWalletID      string    `json:"source_wallet_id,omitempty"`
	DestinationWalletID string    `json:"destination_wallet_id,omitempty"`
	ReferenceType       string    `json:"reference_type,omitempty"`
	ReferenceID         string    `json:"reference_id,omitempty"`
	Description         string    `json:"description,omitempty"`
	IdempotencyKey      string    `json:"idempotency_key,omitempty"`
	FailureReason       string    `json:"failure_reason,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type TransferInitiation struct {
	Transfer Transfer `json:"transfer"`
}

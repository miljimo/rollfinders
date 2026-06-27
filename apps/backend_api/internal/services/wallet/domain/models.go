package domain

import "time"

type Wallet struct {
	ID        string       `json:"id"`
	OwnerType OwnerType    `json:"owner_type"`
	OwnerID   string       `json:"owner_id"`
	Currency  string       `json:"currency"`
	Status    WalletStatus `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type Balance struct {
	WalletID         string `json:"wallet_id"`
	Currency         string `json:"currency"`
	AvailableBalance int64  `json:"available_balance"`
	ReservedBalance  int64  `json:"reserved_balance"`
	LedgerBalance    int64  `json:"ledger_balance"`
}

type Transaction struct {
	ID                  string            `json:"id"`
	Type                TransactionType   `json:"type"`
	Status              TransactionStatus `json:"status"`
	Amount              int64             `json:"amount"`
	Currency            string            `json:"currency"`
	SourceWalletID      string            `json:"source_wallet_id,omitempty"`
	DestinationWalletID string            `json:"destination_wallet_id,omitempty"`
	ReferenceType       string            `json:"reference_type,omitempty"`
	ReferenceID         string            `json:"reference_id,omitempty"`
	IdempotencyKey      string            `json:"idempotency_key,omitempty"`
	OriginalTransaction string            `json:"original_transaction_id,omitempty"`
	CreatedAt           time.Time         `json:"created_at"`
}

type LedgerEntry struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	DebitAmount   int64     `json:"debit_amount"`
	CreditAmount  int64     `json:"credit_amount"`
	Currency      string    `json:"currency"`
	Description   string    `json:"description,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type Reservation struct {
	ID            string            `json:"id"`
	WalletID      string            `json:"wallet_id"`
	TransactionID string            `json:"transaction_id"`
	Amount        int64             `json:"amount"`
	Status        ReservationStatus `json:"status"`
	ExpiresAt     *time.Time        `json:"expires_at,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

package domain

import "time"

type Wallet struct {
	ID        string       `json:"id"`
	Type      WalletType   `json:"wallet_type"`
	OwnerID   string       `json:"owner_id"`
	Currency  Currency     `json:"currency"`
	Status    WalletStatus `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type Balance struct {
	WalletID string   `json:"wallet_id"`
	Currency Currency `json:"currency"`
	// Money the wallets holds
	Available int64 `json:"available_balance"`
	Reserved  int64 `json:"reserved_balance"`
	Balance   int64 `json:"balance"`
}

type Transaction struct {
	ID                  string            `json:"id"`
	Type                TransactionType   `json:"type"`
	Status              TransactionStatus `json:"status"`
	Amount              int64             `json:"amount"`
	Currency            Currency          `json:"currency"`
	SourceWalletID      string            `json:"source_wallet_id,omitempty"`
	DestinationWalletID string            `json:"destination_wallet_id,omitempty"`
	ReferenceType       string            `json:"reference_type,omitempty"`
	ReferenceID         string            `json:"reference_id,omitempty"`
	IdempotencyKey      string            `json:"idempotency_key,omitempty"`
	OriginalTransaction string            `json:"original_transaction_id,omitempty"`
	CreatedAt           time.Time         `json:"created_at"`
}

type Statement struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	Debit         int64     `json:"debit"`
	Credit        int64     `json:"credit"`
	Currency      Currency  `json:"currency"`
	Description   string    `json:"description,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

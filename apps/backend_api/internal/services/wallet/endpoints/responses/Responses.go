package responses

import "rollfinders/internal/services/wallet/domain"

type WalletResponse = domain.Wallet
type BalanceResponse = domain.Balance
type TransactionResponse = domain.Transaction
type LinkedAccountResponse = domain.LinkedAccount
type ReservationResponse = domain.Reservation

type GetTransactionResponse struct {
	Transaction   *domain.Transaction `json:"transaction"`
	LedgerEntries []domain.Statement  `json:"ledger_entries"`
}

type ListWalletTransactionsResponse struct {
	Data []domain.Transaction `json:"data"`
}

type ListLinkedAccountsResponse struct {
	Data []domain.LinkedAccount `json:"data"`
}

type PaginationMeta struct {
	Limit      int  `json:"limit"`
	Offset     int  `json:"offset"`
	Count      int  `json:"count"`
	Total      int  `json:"total"`
	HasMore    bool `json:"has_more"`
	NextOffset int  `json:"next_offset,omitempty"`
}

type ListWalletsResponse struct {
	Wallets    []domain.Wallet `json:"wallets"`
	Pagination PaginationMeta  `json:"pagination"`
}

func NewListWalletsResponse(wallets []domain.Wallet, limit int, offset int, total int) ListWalletsResponse {
	nextOffset := offset + len(wallets)
	meta := PaginationMeta{
		Limit:   limit,
		Offset:  offset,
		Count:   len(wallets),
		Total:   total,
		HasMore: nextOffset < total,
	}
	if meta.HasMore {
		meta.NextOffset = nextOffset
	}
	return ListWalletsResponse{Wallets: wallets, Pagination: meta}
}

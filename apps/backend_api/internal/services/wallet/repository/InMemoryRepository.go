package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sort"
	"strings"
	"sync"
	"time"

	"rollfinders/internal/services/wallet/domain"
)

type InMemoryRepository struct {
	mu               sync.Mutex
	wallets          map[string]domain.Wallet
	transactions     map[string]domain.Transaction
	ledgerEntries    map[string][]domain.LedgerEntry
	reservations     map[string]domain.Reservation
	idempotencyIndex map[string]string
	reversed         map[string]string
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		wallets:          map[string]domain.Wallet{},
		transactions:     map[string]domain.Transaction{},
		ledgerEntries:    map[string][]domain.LedgerEntry{},
		reservations:     map[string]domain.Reservation{},
		idempotencyIndex: map[string]string{},
		reversed:         map[string]string{},
	}
}

func (repo *InMemoryRepository) CreateWallet(_ context.Context, input CreateWalletInput) (domain.Wallet, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	now := time.Now().UTC()
	wallet := domain.Wallet{
		ID:        newID("wal"),
		OwnerType: input.OwnerType,
		OwnerID:   input.OwnerID,
		Currency:  strings.ToUpper(input.Currency),
		Status:    domain.WalletActive,
		CreatedAt: now,
		UpdatedAt: now,
	}
	repo.wallets[wallet.ID] = wallet
	return wallet, nil
}

func (repo *InMemoryRepository) ListWallets(_ context.Context, input ListWalletsInput) (WalletPage, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	limit := input.Limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	offset := input.Offset
	if offset < 0 {
		offset = 0
	}
	wallets := make([]domain.Wallet, 0, len(repo.wallets))
	for _, wallet := range repo.wallets {
		if input.OwnerType != "" && wallet.OwnerType != input.OwnerType {
			continue
		}
		if input.OwnerID != "" && wallet.OwnerID != input.OwnerID {
			continue
		}
		wallets = append(wallets, wallet)
	}
	sort.Slice(wallets, func(left, right int) bool {
		return wallets[left].CreatedAt.After(wallets[right].CreatedAt)
	})
	total := len(wallets)
	if offset >= total {
		wallets = []domain.Wallet{}
	} else {
		end := offset + limit
		if end > total {
			end = total
		}
		wallets = wallets[offset:end]
	}
	return WalletPage{Wallets: wallets, Total: total, Limit: limit, Offset: offset}, nil
}

func (repo *InMemoryRepository) GetWallet(_ context.Context, id string) (domain.Wallet, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	return repo.getWallet(id)
}

func (repo *InMemoryRepository) GetBalance(_ context.Context, walletID string) (domain.Balance, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	wallet, err := repo.getWallet(walletID)
	if err != nil {
		return domain.Balance{}, err
	}
	ledger := repo.ledgerBalance(walletID)
	reserved := repo.reservedBalance(walletID)
	return domain.Balance{
		WalletID:         walletID,
		Currency:         wallet.Currency,
		AvailableBalance: ledger - reserved,
		ReservedBalance:  reserved,
		LedgerBalance:    ledger,
	}, nil
}

func (repo *InMemoryRepository) ListWalletTransactions(_ context.Context, walletID string) ([]domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if _, err := repo.getWallet(walletID); err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	result := []domain.Transaction{}
	for _, entries := range repo.ledgerEntries {
		for _, entry := range entries {
			if entry.WalletID == walletID && !seen[entry.TransactionID] {
				seen[entry.TransactionID] = true
				result = append(result, repo.transactions[entry.TransactionID])
			}
		}
	}
	return result, nil
}

func (repo *InMemoryRepository) GetTransaction(_ context.Context, id string) (domain.Transaction, []domain.LedgerEntry, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	transaction, ok := repo.transactions[id]
	if !ok {
		return domain.Transaction{}, nil, domain.ErrTransactionNotFound
	}
	return transaction, append([]domain.LedgerEntry(nil), repo.ledgerEntries[id]...), nil
}

func (repo *InMemoryRepository) Transfer(_ context.Context, input TransferInput) (domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		return transaction, nil
	}
	source, err := repo.activeWallet(input.SourceWalletID)
	if err != nil {
		return domain.Transaction{}, err
	}
	destination, err := repo.activeWallet(input.DestinationWalletID)
	if err != nil {
		return domain.Transaction{}, err
	}
	if source.Currency != destination.Currency || source.Currency != strings.ToUpper(input.Currency) {
		return domain.Transaction{}, domain.ErrCurrencyMismatch
	}
	if repo.ledgerBalance(source.ID)-repo.reservedBalance(source.ID) < input.Amount {
		return domain.Transaction{}, domain.ErrInsufficientFunds
	}
	return repo.createDoubleEntry(input.Type, source.ID, destination.ID, input.Amount, source.Currency, input.ReferenceType, input.ReferenceID, input.IdempotencyKey, input.Description, ""), nil
}

func (repo *InMemoryRepository) Reserve(_ context.Context, input ReserveInput) (domain.Reservation, domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		for _, reservation := range repo.reservations {
			if reservation.TransactionID == transaction.ID {
				return reservation, transaction, nil
			}
		}
	}
	wallet, err := repo.activeWallet(input.WalletID)
	if err != nil {
		return domain.Reservation{}, domain.Transaction{}, err
	}
	if wallet.Currency != strings.ToUpper(input.Currency) {
		return domain.Reservation{}, domain.Transaction{}, domain.ErrCurrencyMismatch
	}
	if repo.ledgerBalance(wallet.ID)-repo.reservedBalance(wallet.ID) < input.Amount {
		return domain.Reservation{}, domain.Transaction{}, domain.ErrInsufficientFunds
	}
	transaction := repo.createTransaction(domain.TransactionReserve, input.Amount, wallet.Currency, wallet.ID, "", input.ReferenceType, input.ReferenceID, input.IdempotencyKey, "")
	now := time.Now().UTC()
	reservation := domain.Reservation{
		ID:            newID("res"),
		WalletID:      wallet.ID,
		TransactionID: transaction.ID,
		Amount:        input.Amount,
		Status:        domain.ReservationActive,
		ExpiresAt:     input.ExpiresAt,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	repo.reservations[reservation.ID] = reservation
	return reservation, transaction, nil
}

func (repo *InMemoryRepository) Release(_ context.Context, input ReleaseInput) (domain.Reservation, domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		for _, reservation := range repo.reservations {
			if reservation.TransactionID == transaction.ReferenceID {
				return reservation, transaction, nil
			}
		}
	}
	reservation, ok := repo.reservations[input.ReservationID]
	if !ok {
		return domain.Reservation{}, domain.Transaction{}, domain.ErrReservationNotFound
	}
	if reservation.Status != domain.ReservationActive {
		return domain.Reservation{}, domain.Transaction{}, domain.ErrReservationInactive
	}
	now := time.Now().UTC()
	reservation.Status = domain.ReservationReleased
	reservation.UpdatedAt = now
	repo.reservations[reservation.ID] = reservation
	wallet := repo.wallets[reservation.WalletID]
	transaction := repo.createTransaction(domain.TransactionRelease, reservation.Amount, wallet.Currency, reservation.WalletID, "", "reservation", reservation.ID, input.IdempotencyKey, "")
	return reservation, transaction, nil
}

func (repo *InMemoryRepository) Reverse(_ context.Context, input ReverseInput) (domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		return transaction, nil
	}
	original, ok := repo.transactions[input.TransactionID]
	if !ok {
		return domain.Transaction{}, domain.ErrTransactionNotFound
	}
	if _, ok := repo.reversed[original.ID]; ok {
		return domain.Transaction{}, domain.ErrAlreadyReversed
	}
	entries := repo.ledgerEntries[original.ID]
	reversal := repo.createTransaction(domain.TransactionReversal, original.Amount, original.Currency, original.DestinationWalletID, original.SourceWalletID, input.ReferenceType, input.ReferenceID, input.IdempotencyKey, original.ID)
	now := time.Now().UTC()
	for _, entry := range entries {
		repo.ledgerEntries[reversal.ID] = append(repo.ledgerEntries[reversal.ID], domain.LedgerEntry{
			ID:            newID("led"),
			TransactionID: reversal.ID,
			WalletID:      entry.WalletID,
			DebitAmount:   entry.CreditAmount,
			CreditAmount:  entry.DebitAmount,
			Currency:      entry.Currency,
			Description:   input.Description,
			CreatedAt:     now,
		})
	}
	repo.reversed[original.ID] = reversal.ID
	original.Status = domain.TransactionReversed
	repo.transactions[original.ID] = original
	return reversal, nil
}

func (repo *InMemoryRepository) Adjust(_ context.Context, input AdjustmentInput) (domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		return transaction, nil
	}
	if input.Type != domain.TransactionManualCredit && input.Type != domain.TransactionManualDebit && input.Type != domain.TransactionSystemAdjustment {
		input.Type = domain.TransactionSystemAdjustment
	}
	target, err := repo.activeWallet(input.WalletID)
	if err != nil {
		return domain.Transaction{}, err
	}
	counter, err := repo.activeWallet(input.CounterWalletID)
	if err != nil {
		return domain.Transaction{}, err
	}
	if target.Currency != counter.Currency || target.Currency != strings.ToUpper(input.Currency) {
		return domain.Transaction{}, domain.ErrCurrencyMismatch
	}
	sourceID, destinationID := counter.ID, target.ID
	if input.Type == domain.TransactionManualDebit {
		sourceID, destinationID = target.ID, counter.ID
		if repo.ledgerBalance(target.ID)-repo.reservedBalance(target.ID) < input.Amount {
			return domain.Transaction{}, domain.ErrInsufficientFunds
		}
	}
	return repo.createDoubleEntry(input.Type, sourceID, destinationID, input.Amount, target.Currency, "manual_adjustment", input.Reference, input.IdempotencyKey, input.Reason, ""), nil
}

func (repo *InMemoryRepository) getWallet(id string) (domain.Wallet, error) {
	wallet, ok := repo.wallets[id]
	if !ok {
		return domain.Wallet{}, domain.ErrWalletNotFound
	}
	return wallet, nil
}

func (repo *InMemoryRepository) activeWallet(id string) (domain.Wallet, error) {
	wallet, err := repo.getWallet(id)
	if err != nil {
		return domain.Wallet{}, err
	}
	if wallet.Status == domain.WalletClosed {
		return domain.Wallet{}, domain.ErrWalletReadOnly
	}
	if wallet.Status != domain.WalletActive {
		return domain.Wallet{}, domain.ErrWalletInactive
	}
	return wallet, nil
}

func (repo *InMemoryRepository) replay(key string) (domain.Transaction, bool) {
	if key == "" {
		return domain.Transaction{}, false
	}
	id, ok := repo.idempotencyIndex[key]
	if !ok {
		return domain.Transaction{}, false
	}
	return repo.transactions[id], true
}

func (repo *InMemoryRepository) createDoubleEntry(kind domain.TransactionType, sourceID string, destinationID string, amount int64, currency string, referenceType string, referenceID string, key string, description string, originalID string) domain.Transaction {
	transaction := repo.createTransaction(kind, amount, currency, sourceID, destinationID, referenceType, referenceID, key, originalID)
	now := time.Now().UTC()
	repo.ledgerEntries[transaction.ID] = []domain.LedgerEntry{
		{ID: newID("led"), TransactionID: transaction.ID, WalletID: sourceID, DebitAmount: amount, Currency: currency, Description: description, CreatedAt: now},
		{ID: newID("led"), TransactionID: transaction.ID, WalletID: destinationID, CreditAmount: amount, Currency: currency, Description: description, CreatedAt: now},
	}
	return transaction
}

func (repo *InMemoryRepository) createTransaction(kind domain.TransactionType, amount int64, currency string, sourceID string, destinationID string, referenceType string, referenceID string, key string, originalID string) domain.Transaction {
	transaction := domain.Transaction{
		ID:                  newID("txn"),
		Type:                kind,
		Status:              domain.TransactionCompleted,
		Amount:              amount,
		Currency:            currency,
		SourceWalletID:      sourceID,
		DestinationWalletID: destinationID,
		ReferenceType:       referenceType,
		ReferenceID:         referenceID,
		IdempotencyKey:      key,
		OriginalTransaction: originalID,
		CreatedAt:           time.Now().UTC(),
	}
	repo.transactions[transaction.ID] = transaction
	if key != "" {
		repo.idempotencyIndex[key] = transaction.ID
	}
	return transaction
}

func (repo *InMemoryRepository) ledgerBalance(walletID string) int64 {
	var balance int64
	for _, entries := range repo.ledgerEntries {
		for _, entry := range entries {
			if entry.WalletID == walletID {
				balance += entry.CreditAmount
				balance -= entry.DebitAmount
			}
		}
	}
	return balance
}

func (repo *InMemoryRepository) reservedBalance(walletID string) int64 {
	var balance int64
	for _, reservation := range repo.reservations {
		if reservation.WalletID == walletID && reservation.Status == domain.ReservationActive {
			balance += reservation.Amount
		}
	}
	return balance
}

func newID(prefix string) string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

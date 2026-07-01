package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sort"
	"sync"
	"time"

	"rollfinders/internal/services/wallet/domain"
)

type InMemoryRepository struct {
	mu               sync.Mutex
	wallets          map[string]domain.Wallet
	transactions     map[string]domain.Transaction
	ledgerEntries    map[string][]domain.Statement
	idempotencyIndex map[string]string
	reversed         map[string]string
}

// NewInMemoryRepository returns a process-local fake repository for service tests.
// Production wallet service bootstrap must use NewPostgresRepository so wallet
// state is stored in Postgres and survives process restarts.
func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		wallets:          map[string]domain.Wallet{},
		transactions:     map[string]domain.Transaction{},
		ledgerEntries:    map[string][]domain.Statement{},
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
		Type:      input.Type,
		OwnerID:   input.OwnerID,
		Currency:  input.Currency,
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
		if input.Type != "" && wallet.Type != input.Type {
			continue
		}
		if input.OwnerID != "" && wallet.OwnerID != input.OwnerID {
			continue
		}
		if input.Currency != "" && wallet.Currency != input.Currency {
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
	return domain.Balance{
		WalletID:  walletID,
		Currency:  wallet.Currency,
		Available: ledger,
		Reserved:  0,
		Balance:   ledger,
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

func (repo *InMemoryRepository) GetTransaction(_ context.Context, id string) (domain.Transaction, []domain.Statement, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	transaction, ok := repo.transactions[id]
	if !ok {
		return domain.Transaction{}, nil, domain.ErrTransactionNotFound
	}
	return transaction, append([]domain.Statement(nil), repo.ledgerEntries[id]...), nil
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
	if source.Currency != destination.Currency || source.Currency != input.Currency {
		return domain.Transaction{}, domain.ErrCurrencyMismatch
	}
	if repo.ledgerBalance(source.ID) < input.Amount {
		return domain.Transaction{}, domain.ErrInsufficientFunds
	}
	return repo.createDoubleEntry(input.Type, source.ID, destination.ID, input.Amount, source.Currency, input.ReferenceType, input.ReferenceID, input.IdempotencyKey, input.Description, ""), nil
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
		repo.ledgerEntries[reversal.ID] = append(repo.ledgerEntries[reversal.ID], domain.Statement{
			ID:            newID("led"),
			TransactionID: reversal.ID,
			WalletID:      entry.WalletID,
			Debit:         entry.Credit,
			Credit:        entry.Debit,
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
	if target.Currency != counter.Currency || target.Currency != input.Currency {
		return domain.Transaction{}, domain.ErrCurrencyMismatch
	}
	sourceID, destinationID := counter.ID, target.ID
	if input.Type == domain.TransactionManualDebit {
		sourceID, destinationID = target.ID, counter.ID
		if repo.ledgerBalance(target.ID) < input.Amount {
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

func (repo *InMemoryRepository) createDoubleEntry(kind domain.TransactionType, sourceID string, destinationID string, amount int64, currency domain.Currency, referenceType string, referenceID string, key string, description string, originalID string) domain.Transaction {
	transaction := repo.createTransaction(kind, amount, currency, sourceID, destinationID, referenceType, referenceID, key, originalID)
	now := time.Now().UTC()
	repo.ledgerEntries[transaction.ID] = []domain.Statement{
		{ID: newID("led"), TransactionID: transaction.ID, WalletID: sourceID, Debit: amount, Currency: currency, Description: description, CreatedAt: now},
		{ID: newID("led"), TransactionID: transaction.ID, WalletID: destinationID, Credit: amount, Currency: currency, Description: description, CreatedAt: now},
	}
	return transaction
}

func (repo *InMemoryRepository) createTransaction(kind domain.TransactionType, amount int64, currency domain.Currency, sourceID string, destinationID string, referenceType string, referenceID string, key string, originalID string) domain.Transaction {
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
				balance += entry.Credit
				balance -= entry.Debit
			}
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

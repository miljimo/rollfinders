package wallet

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sort"
	"sync"
	"time"

	"rollfinders/internal/services/wallet/dataaccess"
	"rollfinders/internal/services/wallet/domain"
)

type InMemoryRepository struct {
	mu               sync.Mutex
	wallets          map[string]domain.Wallet
	linkedAccounts   map[string][]domain.LinkedAccount
	transactions     map[string]domain.Transaction
	statements       map[string][]domain.Statement
	idempotencyIndex map[string]string
	reversed         map[string]string
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		wallets:          map[string]domain.Wallet{},
		linkedAccounts:   map[string][]domain.LinkedAccount{},
		transactions:     map[string]domain.Transaction{},
		statements:       map[string][]domain.Statement{},
		idempotencyIndex: map[string]string{},
		reversed:         map[string]string{},
	}
}

func (repo *InMemoryRepository) CreateWallet(_ context.Context, input dataaccess.CreateWalletInput) (*domain.Wallet, error) {
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
	return &wallet, nil
}

func (repo *InMemoryRepository) addLinkedAccount(account domain.LinkedAccount) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	repo.linkedAccounts[account.WalletID] = append(repo.linkedAccounts[account.WalletID], account)
}

func (repo *InMemoryRepository) ListWallets(_ context.Context, input dataaccess.ListWalletsInput) (dataaccess.WalletPage, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	limit := testClampLimit(input.Limit)
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
	return dataaccess.WalletPage{Wallets: wallets, Total: total, Limit: limit, Offset: offset}, nil
}

func (repo *InMemoryRepository) GetWallet(_ context.Context, id string) (*domain.Wallet, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	wallet, err := repo.getWallet(id)
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (repo *InMemoryRepository) GetBalance(_ context.Context, walletID string) (*domain.Balance, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	wallet, err := repo.getWallet(walletID)
	if err != nil {
		return nil, err
	}
	balance := repo.ledgerBalance(walletID)
	return &domain.Balance{
		WalletID:  walletID,
		Currency:  wallet.Currency,
		Available: balance,
		Reserved:  0,
		Balance:   balance,
	}, nil
}

func (repo *InMemoryRepository) ListLinkedAccounts(_ context.Context, walletID string) ([]domain.LinkedAccount, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if _, err := repo.getWallet(walletID); err != nil {
		return nil, err
	}
	return append([]domain.LinkedAccount(nil), repo.linkedAccounts[walletID]...), nil
}

func (repo *InMemoryRepository) ListWalletTransactions(_ context.Context, walletID string) ([]domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if _, err := repo.getWallet(walletID); err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	result := []domain.Transaction{}
	for _, entries := range repo.statements {
		for _, entry := range entries {
			if entry.WalletID == walletID && !seen[entry.TransactionID] {
				seen[entry.TransactionID] = true
				result = append(result, repo.transactions[entry.TransactionID])
			}
		}
	}
	sort.Slice(result, func(left, right int) bool {
		return result[left].CreatedAt.After(result[right].CreatedAt)
	})
	return result, nil
}

func (repo *InMemoryRepository) GetTransaction(_ context.Context, id string) (*domain.Transaction, []domain.Statement, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	transaction, ok := repo.transactions[id]
	if !ok {
		return nil, nil, domain.ErrTransactionNotFound
	}
	return &transaction, append([]domain.Statement(nil), repo.statements[id]...), nil
}

func (repo *InMemoryRepository) Transfer(_ context.Context, input dataaccess.TransferInput) (*domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		return &transaction, nil
	}
	source, err := repo.activeWallet(input.SourceWalletID)
	if err != nil {
		return nil, err
	}
	destination, err := repo.activeWallet(input.DestinationWalletID)
	if err != nil {
		return nil, err
	}
	if source.Currency != destination.Currency || source.Currency != input.Currency {
		return nil, domain.ErrCurrencyMismatch
	}
	if repo.ledgerBalance(source.ID) < input.Amount {
		return nil, domain.ErrInsufficientFunds
	}
	transaction := repo.createDoubleEntry(input.Type, source.ID, destination.ID, input.Amount, source.Currency, input.ReferenceType, input.ReferenceID, input.IdempotencyKey, input.Description, "")
	return &transaction, nil
}

func (repo *InMemoryRepository) Reverse(_ context.Context, input dataaccess.ReverseInput) (*domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		return &transaction, nil
	}
	original, ok := repo.transactions[input.TransactionID]
	if !ok {
		return nil, domain.ErrTransactionNotFound
	}
	if repo.reversed[input.TransactionID] != "" || original.Type == domain.TransactionReversal {
		return nil, domain.ErrAlreadyReversed
	}
	entries := repo.statements[input.TransactionID]
	if len(entries) != 2 {
		return nil, domain.ErrTransactionNotFound
	}
	sourceID := entries[1].WalletID
	destinationID := entries[0].WalletID
	reversal := repo.createDoubleEntry(domain.TransactionReversal, sourceID, destinationID, original.Amount, original.Currency, input.ReferenceType, input.ReferenceID, input.IdempotencyKey, input.Description, original.ID)
	repo.reversed[input.TransactionID] = reversal.ID
	return &reversal, nil
}

func (repo *InMemoryRepository) Adjust(_ context.Context, input dataaccess.AdjustmentInput) (*domain.Transaction, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if transaction, ok := repo.replay(input.IdempotencyKey); ok {
		return &transaction, nil
	}
	target, err := repo.activeWallet(input.WalletID)
	if err != nil {
		return nil, err
	}
	counter, err := repo.activeWallet(input.CounterWalletID)
	if err != nil {
		return nil, err
	}
	if target.Currency != counter.Currency || target.Currency != input.Currency {
		return nil, domain.ErrCurrencyMismatch
	}
	sourceID, destinationID := counter.ID, target.ID
	if input.Type == domain.TransactionManualDebit {
		sourceID, destinationID = target.ID, counter.ID
	}
	if input.Type != domain.TransactionManualCredit && input.Type != domain.TransactionManualDebit && input.Type != domain.TransactionSystemAdjustment {
		input.Type = domain.TransactionSystemAdjustment
	}
	transaction := repo.createDoubleEntry(input.Type, sourceID, destinationID, input.Amount, target.Currency, "manual_adjustment", input.Reference, input.IdempotencyKey, input.Reason, "")
	return &transaction, nil
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
	if wallet.Status != domain.WalletActive {
		return domain.Wallet{}, domain.ErrWalletInactive
	}
	return wallet, nil
}

func (repo *InMemoryRepository) replay(key string) (domain.Transaction, bool) {
	if key == "" {
		return domain.Transaction{}, false
	}
	id := repo.idempotencyIndex[key]
	if id == "" {
		return domain.Transaction{}, false
	}
	return repo.transactions[id], true
}

func (repo *InMemoryRepository) ledgerBalance(walletID string) int64 {
	var balance int64
	for _, entries := range repo.statements {
		for _, entry := range entries {
			if entry.WalletID != walletID {
				continue
			}
			balance += entry.Credit - entry.Debit
		}
	}
	return balance
}

func (repo *InMemoryRepository) createDoubleEntry(kind domain.TransactionType, sourceID string, destinationID string, amount int64, currency domain.Currency, referenceType string, referenceID string, key string, description string, originalID string) domain.Transaction {
	transaction := repo.createTransaction(kind, amount, currency, sourceID, destinationID, referenceType, referenceID, key, originalID)
	now := time.Now().UTC()
	repo.statements[transaction.ID] = []domain.Statement{
		{ID: newID("stm"), TransactionID: transaction.ID, WalletID: sourceID, Debit: amount, Currency: currency, Description: description, CreatedAt: now},
		{ID: newID("stm"), TransactionID: transaction.ID, WalletID: destinationID, Credit: amount, Currency: currency, Description: description, CreatedAt: now},
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

func newID(prefix string) string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

func testClampLimit(limit int) int {
	if limit <= 0 {
		return 10
	}
	if limit > 100 {
		return 100
	}
	return limit
}

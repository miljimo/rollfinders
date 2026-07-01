package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/url"
	"strings"
	"time"

	"github.com/lib/pq"

	"rollfinders/internal/services/wallet/domain"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(ctx context.Context, databaseURL string) (*PostgresRepository, error) {
	db, err := sql.Open("postgres", walletSchemaURL(databaseURL))
	if err != nil {
		return nil, err
	}
	db.SetMaxIdleConns(3)
	db.SetMaxOpenConns(5)
	pingCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &PostgresRepository{db: db}, nil
}

func walletSchemaURL(databaseURL string) string {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}
	query := parsed.Query()
	if query.Get("options") == "" {
		query.Set("options", "-c search_path=wallet,public")
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func (repo *PostgresRepository) Close() error {
	if repo == nil || repo.db == nil {
		return nil
	}
	return repo.db.Close()
}

func (repo *PostgresRepository) CreateWallet(ctx context.Context, input CreateWalletInput) (domain.Wallet, error) {
	now := time.Now().UTC()
	row := repo.db.QueryRowContext(ctx,
		`SELECT * FROM wallet.create_wallet($1, $2, $3, $4, $5, $6, $7)`,
		postgresID("wal"), input.Type, input.OwnerID, input.Currency, domain.WalletActive, now, now,
	)
	wallet, err := scanWallet(row)
	return wallet, mapPostgresError(err)
}

func (repo *PostgresRepository) ListWallets(ctx context.Context, input ListWalletsInput) (WalletPage, error) {
	limit := clampLimit(input.Limit)
	offset := input.Offset
	if offset < 0 {
		offset = 0
	}
	rows, err := repo.db.QueryContext(ctx,
		`SELECT * FROM wallet.list_wallets($1, $2, $3, $4, $5)`,
		input.OwnerID, input.Type, input.Currency, limit, offset,
	)
	if err != nil {
		return WalletPage{}, mapPostgresError(err)
	}
	defer rows.Close()

	wallets := []domain.Wallet{}
	total := 0
	for rows.Next() {
		var wallet domain.Wallet
		var totalCount int64
		if err := rows.Scan(&wallet.ID, &wallet.Type, &wallet.OwnerID, &wallet.Currency, &wallet.Status, &wallet.CreatedAt, &wallet.UpdatedAt, &totalCount); err != nil {
			return WalletPage{}, mapPostgresError(err)
		}
		total = int(totalCount)
		wallets = append(wallets, wallet)
	}
	if err := rows.Err(); err != nil {
		return WalletPage{}, mapPostgresError(err)
	}
	return WalletPage{Wallets: wallets, Total: total, Limit: limit, Offset: offset}, nil
}

func (repo *PostgresRepository) GetWallet(ctx context.Context, id string) (domain.Wallet, error) {
	wallet, err := scanWallet(repo.db.QueryRowContext(ctx, `SELECT * FROM wallet.get_wallet($1)`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Wallet{}, domain.ErrWalletNotFound
	}
	return wallet, mapPostgresError(err)
}

func (repo *PostgresRepository) GetBalance(ctx context.Context, walletID string) (domain.Balance, error) {
	var balance domain.Balance
	err := repo.db.QueryRowContext(ctx, `SELECT * FROM wallet.get_balance($1)`, walletID).Scan(&balance.WalletID, &balance.Currency, &balance.Available, &balance.Reserved, &balance.Balance)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Balance{}, domain.ErrWalletNotFound
	}
	return balance, mapPostgresError(err)
}

func (repo *PostgresRepository) ListWalletTransactions(ctx context.Context, walletID string) ([]domain.Transaction, error) {
	if _, err := repo.GetWallet(ctx, walletID); err != nil {
		return nil, err
	}
	rows, err := repo.db.QueryContext(ctx, `SELECT * FROM wallet.list_wallet_transactions($1)`, walletID)
	if err != nil {
		return nil, mapPostgresError(err)
	}
	defer rows.Close()

	transactions := []domain.Transaction{}
	for rows.Next() {
		transaction, err := scanTransaction(rows)
		if err != nil {
			return nil, mapPostgresError(err)
		}
		transactions = append(transactions, transaction)
	}
	return transactions, mapPostgresError(rows.Err())
}

func (repo *PostgresRepository) GetTransaction(ctx context.Context, id string) (domain.Transaction, []domain.Statement, error) {
	transaction, err := scanTransaction(repo.db.QueryRowContext(ctx, `SELECT * FROM wallet.get_transaction($1)`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Transaction{}, nil, domain.ErrTransactionNotFound
	}
	if err != nil {
		return domain.Transaction{}, nil, mapPostgresError(err)
	}
	entries, err := repo.transactionStatements(ctx, id)
	if err != nil {
		return domain.Transaction{}, nil, err
	}
	return transaction, entries, nil
}

func (repo *PostgresRepository) Transfer(ctx context.Context, input TransferInput) (domain.Transaction, error) {
	now := time.Now().UTC()
	transaction, err := scanTransaction(repo.db.QueryRowContext(ctx,
		`SELECT * FROM wallet.transfer($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		postgresID("txn"),
		postgresID("led"),
		postgresID("led"),
		input.Type,
		input.SourceWalletID,
		input.DestinationWalletID,
		input.Amount,
		input.Currency,
		input.ReferenceType,
		input.ReferenceID,
		input.IdempotencyKey,
		input.Description,
		now,
	))
	return transaction, mapPostgresError(err)
}

func (repo *PostgresRepository) Reverse(ctx context.Context, input ReverseInput) (domain.Transaction, error) {
	transaction, err := scanTransaction(repo.db.QueryRowContext(ctx,
		`SELECT * FROM wallet.reverse_transaction($1, $2, $3, $4, $5, $6, $7)`,
		postgresID("txn"),
		input.IdempotencyKey,
		input.TransactionID,
		input.ReferenceType,
		input.ReferenceID,
		input.Description,
		time.Now().UTC(),
	))
	return transaction, mapPostgresError(err)
}

func (repo *PostgresRepository) Adjust(ctx context.Context, input AdjustmentInput) (domain.Transaction, error) {
	transaction, err := scanTransaction(repo.db.QueryRowContext(ctx,
		`SELECT * FROM wallet.adjust($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		postgresID("txn"),
		postgresID("led"),
		postgresID("led"),
		input.Type,
		input.WalletID,
		input.CounterWalletID,
		input.Amount,
		input.Currency,
		input.Reference,
		input.IdempotencyKey,
		input.Reason,
		time.Now().UTC(),
	))
	return transaction, mapPostgresError(err)
}

type scanner interface {
	Scan(...any) error
}

func scanWallet(row scanner) (domain.Wallet, error) {
	var wallet domain.Wallet
	err := row.Scan(&wallet.ID, &wallet.Type, &wallet.OwnerID, &wallet.Currency, &wallet.Status, &wallet.CreatedAt, &wallet.UpdatedAt)
	return wallet, err
}

func scanTransaction(row scanner) (domain.Transaction, error) {
	var transaction domain.Transaction
	err := row.Scan(&transaction.ID, &transaction.Type, &transaction.Status, &transaction.Amount, &transaction.Currency, &transaction.SourceWalletID, &transaction.DestinationWalletID, &transaction.ReferenceType, &transaction.ReferenceID, &transaction.IdempotencyKey, &transaction.OriginalTransaction, &transaction.CreatedAt)
	return transaction, err
}

func (repo *PostgresRepository) transactionStatements(ctx context.Context, transactionID string) ([]domain.Statement, error) {
	rows, err := repo.db.QueryContext(ctx, `SELECT * FROM wallet.get_transaction_statements($1)`, transactionID)
	if err != nil {
		return nil, mapPostgresError(err)
	}
	defer rows.Close()

	entries := []domain.Statement{}
	for rows.Next() {
		var entry domain.Statement
		if err := rows.Scan(&entry.ID, &entry.TransactionID, &entry.WalletID, &entry.Debit, &entry.Credit, &entry.Currency, &entry.Description, &entry.CreatedAt); err != nil {
			return nil, mapPostgresError(err)
		}
		entries = append(entries, entry)
	}
	return entries, mapPostgresError(rows.Err())
}

func mapPostgresError(err error) error {
	if err == nil {
		return nil
	}
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) {
		return err
	}
	switch {
	case strings.Contains(pqErr.Message, domain.ErrWalletNotFound.Error()):
		return domain.ErrWalletNotFound
	case strings.Contains(pqErr.Message, domain.ErrWalletReadOnly.Error()):
		return domain.ErrWalletReadOnly
	case strings.Contains(pqErr.Message, domain.ErrWalletInactive.Error()):
		return domain.ErrWalletInactive
	case strings.Contains(pqErr.Message, domain.ErrCurrencyMismatch.Error()):
		return domain.ErrCurrencyMismatch
	case strings.Contains(pqErr.Message, domain.ErrInsufficientFunds.Error()):
		return domain.ErrInsufficientFunds
	case strings.Contains(pqErr.Message, domain.ErrTransactionNotFound.Error()):
		return domain.ErrTransactionNotFound
	case strings.Contains(pqErr.Message, domain.ErrAlreadyReversed.Error()):
		return domain.ErrAlreadyReversed
	default:
		return err
	}
}

func clampLimit(limit int) int {
	if limit <= 0 {
		return 10
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func postgresID(prefix string) string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

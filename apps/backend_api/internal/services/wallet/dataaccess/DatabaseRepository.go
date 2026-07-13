package dataaccess

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"

	"rollfinders/internal/core/databases"
	"rollfinders/internal/services/wallet/domain"
)

type DatabaseRepository struct {
	db databases.DataContext
}

func NewDatabaseRepository(db databases.DataContext) (*DatabaseRepository, error) {
	if db == nil {
		return nil, errors.New("wallet database context is required")
	}
	return &DatabaseRepository{db: db}, nil
}

func mapDatabaseError(err error) error {
	if err == nil {
		return nil
	}
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) {
		return err
	}
	switch {
	case pqErr.Code == "23505" && pqErr.Constraint == "wallet_wallets_owner_type_currency_key":
		return domain.ErrDuplicateWallet
	case strings.Contains(pqErr.Message, domain.ErrDuplicateWallet.Error()):
		return domain.ErrDuplicateWallet
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
	case strings.Contains(pqErr.Message, domain.ErrReservationNotFound.Error()):
		return domain.ErrReservationNotFound
	case strings.Contains(pqErr.Message, domain.ErrReservationClosed.Error()):
		return domain.ErrReservationClosed
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

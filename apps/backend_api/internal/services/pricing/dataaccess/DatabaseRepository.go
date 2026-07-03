package dataaccess

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"

	"rollfinders/internal/core/databases"
	"rollfinders/internal/services/pricing/domain"
)

type DatabaseRepository struct {
	db databases.DataContext
}

func NewDatabaseRepository(db databases.DataContext) (*DatabaseRepository, error) {
	if db == nil {
		return nil, errors.New("pricing database context is required")
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
	case strings.Contains(pqErr.Message, domain.ErrPolicyNotFound.Error()):
		return domain.ErrPolicyNotFound
	case strings.Contains(pqErr.Message, domain.ErrInvalidProviderID.Error()):
		return domain.ErrInvalidProviderID
	case strings.Contains(pqErr.Message, domain.ErrInvalidCurrency.Error()):
		return domain.ErrInvalidCurrency
	case strings.Contains(pqErr.Message, domain.ErrInvalidPercentageBasisPoints.Error()):
		return domain.ErrInvalidPercentageBasisPoints
	case strings.Contains(pqErr.Message, domain.ErrInvalidFixedAmount.Error()):
		return domain.ErrInvalidFixedAmount
	case strings.Contains(pqErr.Message, domain.ErrInvalidAmount.Error()):
		return domain.ErrInvalidAmount
	default:
		return err
	}
}

func postgresID(prefix string) string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

package dataaccess

import (
	"context"
	"database/sql"
	"errors"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) ReserveFunds(ctx context.Context, input ReserveFundsInput) (*domain.Reservation, error) {
	rows, err := repo.db.Function(
		ctx,
		"wallet.reserve_funds",
		postgresID("res"),
		input.WalletID,
		input.Amount,
		input.Currency,
		input.ReferenceType,
		input.ReferenceID,
		input.IdempotencyKey,
		input.Description,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	reservation, err := ReservationFromFirst(rows)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrReservationNotFound
	}
	if err != nil {
		return nil, err
	}
	return &reservation, nil
}

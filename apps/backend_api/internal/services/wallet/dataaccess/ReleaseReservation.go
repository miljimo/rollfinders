package dataaccess

import (
	"context"
	"database/sql"
	"errors"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) ReleaseReservation(ctx context.Context, input ReservationTransitionInput) (*domain.Reservation, error) {
	rows, err := repo.db.Function(
		ctx,
		"wallet.release_reservation",
		input.ReservationID,
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

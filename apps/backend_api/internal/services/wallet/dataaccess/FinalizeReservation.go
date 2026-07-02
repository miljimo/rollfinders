package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) FinalizeReservation(ctx context.Context, input ReservationTransitionInput) (*domain.Transaction, error) {
	rows, err := repo.db.Function(
		ctx,
		"wallet.finalize_reservation",
		postgresID("txn"),
		postgresID("led"),
		postgresID("led"),
		input.ReservationID,
		input.CounterWalletID,
		input.IdempotencyKey,
		input.Description,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	transaction, err := TransactionFromFirst(rows)
	if err != nil {
		return nil, err
	}
	return &transaction, nil
}

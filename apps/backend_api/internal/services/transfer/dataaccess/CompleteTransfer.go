package dataaccess

import (
	"context"
	"time"

	"rollfinders/internal/services/transfer/domain"
)

func (repo *DatabaseRepository) CompleteTransfer(ctx context.Context, id string) (*domain.Transfer, error) {
	rows, err := repo.db.Function(ctx, "transfer.complete_transfer_request", id, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	return TransferFromFirst(rows)
}

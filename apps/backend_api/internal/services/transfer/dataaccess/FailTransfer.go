package dataaccess

import (
	"context"
	"time"

	"rollfinders/internal/services/transfer/domain"
)

func (repo *DatabaseRepository) FailTransfer(ctx context.Context, input FailTransferInput) (*domain.Transfer, error) {
	rows, err := repo.db.Function(ctx, "transfer.fail_transfer_request", input.ID, input.FailureReason, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	return TransferFromFirst(rows)
}

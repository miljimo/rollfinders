package dataaccess

import (
	"context"
	"time"

	"rollfinders/internal/services/transfer/domain"
)

func (repo *DatabaseRepository) MarkTransferProcessing(ctx context.Context, id string) (*domain.Transfer, error) {
	rows, err := repo.db.Function(ctx, "transfer.mark_transfer_processing", id, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	return TransferFromFirst(rows)
}

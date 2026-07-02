package dataaccess

import (
	"context"

	"rollfinders/internal/services/transfer/domain"
)

func (repo *DatabaseRepository) GetTransfer(ctx context.Context, id string) (*domain.Transfer, error) {
	rows, err := repo.db.Function(ctx, "transfer.get_transfer_request", id)
	if err != nil {
		return nil, err
	}
	return TransferFromFirst(rows)
}

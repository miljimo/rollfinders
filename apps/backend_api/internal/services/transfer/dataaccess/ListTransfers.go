package dataaccess

import (
	"context"

	"rollfinders/internal/services/transfer/domain"
)

func (repo *DatabaseRepository) ListTransfers(ctx context.Context, input ListTransfersInput) ([]domain.Transfer, error) {
	rows, err := repo.db.Function(ctx, "transfer.list_transfer_requests", input.WalletID, clampLimit(input.Limit), maxInt(input.Offset, 0))
	if err != nil {
		return nil, err
	}
	transfers := make([]domain.Transfer, 0, len(rows))
	for _, row := range rows {
		transfers = append(transfers, TransferFromRow(row))
	}
	return transfers, nil
}

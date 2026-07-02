package service

import (
	"context"
	"strings"

	"rollfinders/internal/services/transfer/dataaccess"
	"rollfinders/internal/services/transfer/domain"
)

type Service struct {
	repo dataaccess.Repository
}

func New(repo dataaccess.Repository) *Service {
	return &Service{repo: repo}
}

func validCurrency(currency string) bool {
	if strings.EqualFold(currency, "Points") {
		return true
	}
	switch currency {
	case "GBP":
		return true
	default:
		return false
	}
}

func (svc *Service) InitiateTransfer(ctx context.Context, input domain.TransferRequest) (domain.TransferInitiation, error) {
	transfer, err := svc.CreateTransfer(ctx, input)
	if err != nil {
		return domain.TransferInitiation{}, err
	}
	return domain.TransferInitiation{Transfer: *transfer}, nil
}

func (svc *Service) CreateTransfer(ctx context.Context, input domain.TransferRequest) (*domain.Transfer, error) {
	input.SourceWalletID = strings.TrimSpace(input.SourceWalletID)
	input.DestinationWalletID = strings.TrimSpace(input.DestinationWalletID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if input.SourceWalletID == "" || input.DestinationWalletID == "" || input.SourceWalletID == input.DestinationWalletID {
		return nil, domain.ErrInvalidWallet
	}
	if input.Amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}
	if !validCurrency(input.Currency) {
		return nil, domain.ErrInvalidCurrency
	}
	if input.IdempotencyKey == "" {
		return nil, domain.ErrIdempotencyRequired
	}
	if svc.repo == nil {
		return nil, domain.ErrTransferRepositoryUnavailable
	}
	return svc.repo.CreateTransfer(ctx, dataaccess.CreateTransferInput{
		SourceWalletID:      input.SourceWalletID,
		DestinationWalletID: input.DestinationWalletID,
		Amount:              input.Amount,
		Currency:            input.Currency,
		ReferenceType:       strings.TrimSpace(input.ReferenceType),
		ReferenceID:         strings.TrimSpace(input.ReferenceID),
		Description:         strings.TrimSpace(input.Description),
		IdempotencyKey:      input.IdempotencyKey,
	})
}

func (svc *Service) MarkTransferProcessing(ctx context.Context, id string) (*domain.Transfer, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, domain.ErrTransferNotFound
	}
	if svc.repo == nil {
		return nil, domain.ErrTransferRepositoryUnavailable
	}
	return svc.repo.MarkTransferProcessing(ctx, id)
}

func (svc *Service) UpdateTransferStatus(ctx context.Context, id string, status string, failureReason string) (*domain.Transfer, error) {
	switch domain.TransferStatus(strings.ToUpper(strings.TrimSpace(status))) {
	case domain.TransferProcessing:
		return svc.MarkTransferProcessing(ctx, id)
	case domain.TransferCompleted:
		return svc.CompleteTransfer(ctx, id)
	case domain.TransferFailed:
		return svc.FailTransfer(ctx, id, failureReason)
	default:
		return nil, domain.ErrInvalidTransferStatus
	}
}

func (svc *Service) CompleteTransfer(ctx context.Context, id string) (*domain.Transfer, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, domain.ErrInvalidTransferUpdate
	}
	if svc.repo == nil {
		return nil, domain.ErrTransferRepositoryUnavailable
	}
	return svc.repo.CompleteTransfer(ctx, id)
}

func (svc *Service) FailTransfer(ctx context.Context, id string, reason string) (*domain.Transfer, error) {
	id = strings.TrimSpace(id)
	reason = strings.TrimSpace(reason)
	if id == "" || reason == "" {
		return nil, domain.ErrInvalidTransferUpdate
	}
	if svc.repo == nil {
		return nil, domain.ErrTransferRepositoryUnavailable
	}
	return svc.repo.FailTransfer(ctx, dataaccess.FailTransferInput{ID: id, FailureReason: reason})
}

func (svc *Service) GetTransfer(ctx context.Context, id string) (*domain.Transfer, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, domain.ErrTransferNotFound
	}
	if svc.repo == nil {
		return nil, domain.ErrTransferRepositoryUnavailable
	}
	return svc.repo.GetTransfer(ctx, id)
}

func (svc *Service) ListTransfers(ctx context.Context, walletID string, limit int, offset int) ([]domain.Transfer, error) {
	if svc.repo == nil {
		return nil, domain.ErrTransferRepositoryUnavailable
	}
	return svc.repo.ListTransfers(ctx, dataaccess.ListTransfersInput{WalletID: strings.TrimSpace(walletID), Limit: limit, Offset: offset})
}

package bootstrap

import (
	"context"
	"log/slog"
	"net/http"

	wallet "rollfinders/internal/services/wallet"
	"rollfinders/internal/services/wallet/config"
	"rollfinders/internal/services/wallet/repository"
)

func Handler(ctx context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
	repo, err := repository.NewPostgresRepository(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}
	return wallet.New(wallet.Options{Config: cfg, Logger: logger, Repo: repo}), func() { _ = repo.Close() }, nil
}

package bootstrap

import (
	"log/slog"
	"net/http"

	wallet "rollfinders/internal/services/wallet"
	"rollfinders/internal/services/wallet/config"
	"rollfinders/internal/services/wallet/repository"
)

func Handler(cfg config.Config, logger *slog.Logger) http.Handler {
	return wallet.New(wallet.Options{Config: cfg, Logger: logger, Repo: repository.NewInMemoryRepository()})
}

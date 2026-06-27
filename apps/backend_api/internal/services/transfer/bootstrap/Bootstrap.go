package bootstrap

import (
	"log/slog"
	"net/http"

	"rollfinders/internal/services/transfer"
	"rollfinders/internal/services/transfer/config"
	transfersvc "rollfinders/internal/services/transfer/service"
)

func Handler(cfg config.Config, logger *slog.Logger) http.Handler {
	client := transfersvc.NewWalletHTTPClient(cfg.WalletBaseURL, cfg.WalletRequestTimeout)
	return transfer.New(transfer.Options{Config: cfg, Logger: logger, Service: transfersvc.New(client)})
}

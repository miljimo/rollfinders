package bootstrap

import (
	"context"
	"log/slog"
	"net/http"

	"rollfinders/internal/core/databases"
	"rollfinders/internal/services/transfer"
	"rollfinders/internal/services/transfer/config"
	"rollfinders/internal/services/transfer/dataaccess"
	transfersvc "rollfinders/internal/services/transfer/service"
)

func Handler(ctx context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
	db, err := databases.WithCredential(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}
	repo, err := dataaccess.NewDatabaseRepository(db)
	if err != nil {
		_ = db.Close()
		return nil, nil, err
	}
	return transfer.New(transfer.Options{Config: cfg, Logger: logger, Service: transfersvc.New(repo)}), func() { _ = db.Close() }, nil
}

package bootstrap

import (
	"context"
	"log/slog"
	"net/http"

	"rollfinders/internal/core/databases"
	pricing "rollfinders/internal/services/pricing"
	"rollfinders/internal/services/pricing/config"
	"rollfinders/internal/services/pricing/dataaccess"
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
	return pricing.New(pricing.Options{Config: cfg, Logger: logger, Repo: repo}), func() { _ = db.Close() }, nil
}

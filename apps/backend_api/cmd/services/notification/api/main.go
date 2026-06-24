package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"rollfinders/internal/core/servicebase"
	"rollfinders/internal/services/notification/config"
	"rollfinders/internal/services/notification/dataaccess"
	"rollfinders/internal/services/notification/databases"
	"rollfinders/internal/services/notification/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	servicebase.RunHTTP(servicebase.HTTPOptions[config.Config]{
		Name:       "notification api",
		LoadConfig: config.Load,
		BuildHandler: func(ctx context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
			db, err := databases.Open(ctx, cfg.DatabaseURL)
			if err != nil {
				return nil, nil, err
			}
			handler := server.New(server.Options{Config: cfg, Logger: logger, Store: dataaccess.NewRepository(db)})
			return handler, func() { _ = db.Close() }, nil
		},
		Port:            func(cfg config.Config) string { return cfg.Port },
		ReadTimeout:     func(cfg config.Config) time.Duration { return cfg.ReadTimeout },
		WriteTimeout:    func(cfg config.Config) time.Duration { return cfg.WriteTimeout },
		ShutdownTimeout: func(cfg config.Config) time.Duration { return cfg.ShutdownTimeout },
		Logger:          logger,
	})
}

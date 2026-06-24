package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"rollfinders/internal/core/servicebase"
	"rollfinders/internal/services/analytics/config"
	"rollfinders/internal/services/analytics/database"
	"rollfinders/internal/services/analytics/server"
)

func handler(ctx context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
	db, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}
	return server.New(cfg, server.NewRepository(db), logger), func() { db.Close() }, nil
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	servicebase.RunHTTP(servicebase.HTTPOptions[config.Config]{
		Name:            "analytics api",
		LoadConfig:      config.Load,
		BuildHandler:    handler,
		Port:            func(cfg config.Config) string { return cfg.Port },
		ReadTimeout:     func(cfg config.Config) time.Duration { return cfg.ReadTimeout },
		WriteTimeout:    func(cfg config.Config) time.Duration { return cfg.WriteTimeout },
		ShutdownTimeout: func(cfg config.Config) time.Duration { return cfg.ShutdownTimeout },
		Logger:          logger,
	})
}

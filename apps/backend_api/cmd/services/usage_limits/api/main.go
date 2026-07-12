package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"rollfinders/internal/core/servicebase"
	"rollfinders/internal/services/usage_limits/config"
	"rollfinders/internal/services/usage_limits/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	servicebase.RunHTTP(servicebase.HTTPOptions[config.Config]{
		Name:       "usage limits api",
		LoadConfig: config.Load,
		BuildHandler: func(_ context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
			handler, cleanup := server.NewWithCleanup(server.Options{Config: cfg, Logger: logger})
			return handler, cleanup, nil
		},
		Port:            func(cfg config.Config) string { return cfg.Port },
		ReadTimeout:     func(cfg config.Config) time.Duration { return cfg.ReadTimeout },
		WriteTimeout:    func(cfg config.Config) time.Duration { return cfg.WriteTimeout },
		ShutdownTimeout: func(cfg config.Config) time.Duration { return cfg.ShutdownTimeout },
		Logger:          logger,
	})
}

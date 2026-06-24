package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"rollfinders/internal/core/servicebase"
	"rollfinders/internal/services/booking/config"
	"rollfinders/internal/services/booking/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	servicebase.RunHTTP(servicebase.HTTPOptions[config.Config]{
		Name:       "booking api",
		LoadConfig: config.Load,
		BuildHandler: func(_ context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
			return server.New(server.Options{Config: cfg, Logger: logger}), nil, nil
		},
		Port:            func(cfg config.Config) string { return cfg.Port },
		ReadTimeout:     func(cfg config.Config) time.Duration { return cfg.ReadTimeout },
		WriteTimeout:    func(cfg config.Config) time.Duration { return cfg.WriteTimeout },
		ShutdownTimeout: func(cfg config.Config) time.Duration { return cfg.ShutdownTimeout },
		Logger:          logger,
	})
}

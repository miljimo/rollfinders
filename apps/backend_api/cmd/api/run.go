package main

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/core/servicebase"
	api "rollfinders/internal/services/api"
	"rollfinders/internal/services/api/config"
)

func runGateway(logger *slog.Logger) {
	servicebase.RunHTTP(servicebase.HTTPOptions[config.Config]{
		Name:       "rollfinders api gateway",
		LoadConfig: config.Load,
		BuildHandler: func(_ context.Context, cfg config.Config, logger *slog.Logger) (http.Handler, func(), error) {
			return api.New(api.Options{Config: cfg, Logger: logger}), nil, nil
		},
		Port:            func(cfg config.Config) string { return cfg.Port },
		ReadTimeout:     func(cfg config.Config) time.Duration { return cfg.ReadTimeout },
		WriteTimeout:    func(cfg config.Config) time.Duration { return cfg.WriteTimeout },
		ShutdownTimeout: func(cfg config.Config) time.Duration { return cfg.ShutdownTimeout },
		Logger:          logger,
	})
}

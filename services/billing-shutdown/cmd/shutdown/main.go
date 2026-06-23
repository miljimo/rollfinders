package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"billing-shutdown/internal/config"
	"billing-shutdown/internal/shutdown"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	runner, err := shutdown.New(ctx, cfg, logger)
	if err != nil {
		logger.Error("failed to build shutdown runner", "error", err)
		os.Exit(1)
	}
	if err := runner.Run(ctx); err != nil {
		logger.Error("shutdown runner failed", "error", err)
		os.Exit(1)
	}
}

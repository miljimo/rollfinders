package servicebase

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type HTTPOptions[C any] struct {
	Name            string
	LoadConfig      func() (C, error)
	BuildHandler    func(context.Context, C, *slog.Logger) (http.Handler, func(), error)
	Port            func(C) string
	ReadTimeout     func(C) time.Duration
	WriteTimeout    func(C) time.Duration
	ShutdownTimeout func(C) time.Duration
	Logger          *slog.Logger
}

func RunHTTP[C any](opts HTTPOptions[C]) {
	logger := opts.Logger
	if logger == nil {
		logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}

	cfg, err := opts.LoadConfig()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	handler, closeFn, err := opts.BuildHandler(context.Background(), cfg, logger)
	if err != nil {
		logger.Error("failed to build server", "error", err)
		os.Exit(1)
	}
	if closeFn != nil {
		defer closeFn()
	}

	httpServer := &http.Server{
		Addr:         ":" + opts.Port(cfg),
		Handler:      handler,
		ReadTimeout:  opts.ReadTimeout(cfg),
		WriteTimeout: opts.WriteTimeout(cfg),
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info(opts.Name+" starting", "addr", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case err := <-errCh:
		logger.Error(opts.Name+" stopped unexpectedly", "error", err)
		os.Exit(1)
	case sig := <-stopCh:
		logger.Info("shutdown signal received", "signal", sig.String())
	}

	ctx, cancel := context.WithTimeout(context.Background(), opts.ShutdownTimeout(cfg))
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info(opts.Name+" stopped", "time", time.Now().UTC())
}

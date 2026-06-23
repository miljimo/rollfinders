package worker

import (
	"context"
	"errors"
	"log/slog"
	"sort"
	"sync"
	"time"

	"notification/internal/providers"
)

type Config struct {
	BatchSize    int
	PollInterval time.Duration
	Concurrency  int
}

func DefaultConfig() Config {
	return Config{BatchSize: 10, PollInterval: 5 * time.Second, Concurrency: 1}
}

type Worker struct {
	store    Store
	provider providers.NotificationProvider
	cfg      Config
	logger   *slog.Logger
	now      func() time.Time
}

func New(store Store, provider providers.NotificationProvider, cfg Config, logger *slog.Logger) (*Worker, error) {
	if store == nil {
		return nil, errors.New("worker store is required")
	}
	if provider == nil {
		return nil, errors.New("notification provider is required")
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = DefaultConfig().BatchSize
	}
	if cfg.PollInterval <= 0 {
		cfg.PollInterval = DefaultConfig().PollInterval
	}
	if cfg.Concurrency <= 0 {
		cfg.Concurrency = DefaultConfig().Concurrency
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Worker{store: store, provider: provider, cfg: cfg, logger: logger, now: time.Now}, nil
}

func (w *Worker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.cfg.PollInterval)
	defer ticker.Stop()
	for {
		if err := w.ProcessOnce(ctx); err != nil {
			w.logger.Error("notification worker poll failed", "error", err)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func (w *Worker) ProcessOnce(ctx context.Context) error {
	now := w.now().UTC()
	items, err := w.store.ClaimDue(ctx, w.cfg.BatchSize, now)
	if err != nil {
		return err
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].NextAttemptAt.Equal(items[j].NextAttemptAt) {
			return PriorityRank(items[i].Priority) < PriorityRank(items[j].Priority)
		}
		return items[i].NextAttemptAt.Before(items[j].NextAttemptAt)
	})

	sem := make(chan struct{}, w.cfg.Concurrency)
	var wg sync.WaitGroup
	errCh := make(chan error, len(items))
	for _, item := range items {
		item := item
		sem <- struct{}{}
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() { <-sem }()
			if err := w.process(ctx, item); err != nil {
				errCh <- err
			}
		}()
	}
	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			return err
		}
	}
	return nil
}

func (w *Worker) process(ctx context.Context, item Notification) error {
	startedAt := w.now().UTC()
	attemptNumber := item.AttemptCount + 1
	result, err := w.provider.Send(ctx, providers.Message{
		ID:          item.ID,
		Channel:     item.Channel,
		Subject:     item.Subject,
		ContentText: item.ContentText,
		IsHTML:      item.IsContentHTML,
		From:        item.From,
		ReplyTo:     item.ReplyTo,
		To:          item.To,
		CC:          item.CC,
		BCC:         item.BCC,
		Attachments: item.Attachments,
		Metadata:    item.Metadata,
	})
	completedAt := w.now().UTC()
	if err == nil {
		attempt := AttemptRecord{
			NotificationID:    item.ID,
			AttemptNumber:     attemptNumber,
			Status:            StatusSent,
			ProviderName:      result.ProviderName,
			ProviderMessageID: result.ProviderMessageID,
			ProviderResponse:  result.ResponseMetadata,
			Retryable:         false,
			StartedAt:         startedAt,
			CompletedAt:       completedAt,
		}
		sentAt := result.SentAt
		if sentAt.IsZero() {
			sentAt = completedAt
		}
		return w.store.MarkSent(ctx, SendSuccess{
			NotificationID:    item.ID,
			Attempt:           attempt,
			ProviderName:      result.ProviderName,
			ProviderMessageID: result.ProviderMessageID,
			ProviderResponse:  result.ResponseMetadata,
			SentAt:            sentAt,
		})
	}

	retryable := providers.IsRetryable(err)
	status := StatusFailedPermanent
	var nextAttemptAt *time.Time
	if retryable {
		if next, ok := NextRetryTime(completedAt, attemptNumber); ok {
			next = next.UTC()
			nextAttemptAt = &next
			if attemptNumber == 1 {
				status = StatusFailedRetryable
			} else {
				status = StatusRetrying
			}
		}
	}
	attempt := AttemptRecord{
		NotificationID:   item.ID,
		AttemptNumber:    attemptNumber,
		Status:           status,
		ProviderName:     w.provider.Name(),
		ProviderResponse: map[string]string{"error_class": "provider_error"},
		ErrorMessage:     err.Error(),
		Retryable:        retryable && nextAttemptAt != nil,
		StartedAt:        startedAt,
		CompletedAt:      completedAt,
		NextAttemptAt:    nextAttemptAt,
	}
	return w.store.MarkFailed(ctx, SendFailure{
		NotificationID: item.ID,
		Attempt:        attempt,
		Status:         status,
		LastError:      err.Error(),
		AttemptCount:   attemptNumber,
		NextAttemptAt:  nextAttemptAt,
	})
}

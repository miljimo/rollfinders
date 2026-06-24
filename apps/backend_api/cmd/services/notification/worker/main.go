package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"rollfinders/internal/services/notification/config"
	"rollfinders/internal/services/notification/dataaccess"
	"rollfinders/internal/services/notification/databases"
	"rollfinders/internal/services/notification/providers"
	"rollfinders/internal/services/notification/workerlib"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	serviceCfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}
	cfg := worker.Config{
		BatchSize:    intEnv("NOTIFICATION_WORKER_BATCH_SIZE", 10),
		PollInterval: durationEnv("NOTIFICATION_WORKER_POLL_INTERVAL", 5*time.Second),
		Concurrency:  intEnv("NOTIFICATION_WORKER_CONCURRENCY", 1),
	}
	smtpProvider, err := providers.NewSMTPProvider(providers.SMTPConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     intEnv("SMTP_PORT", 25),
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
		TLSMode:  providers.TLSMode(stringEnv("SMTP_TLS_MODE", string(providers.TLSModeStartTLS))),
		DefaultSender: providers.Address{
			Email: os.Getenv("SMTP_DEFAULT_FROM_EMAIL"),
			Name:  os.Getenv("SMTP_DEFAULT_FROM_NAME"),
		},
		Timeout: durationEnv("SMTP_TIMEOUT", 10*time.Second),
	}, nil, nil)
	if err != nil {
		logger.Error("failed to configure smtp provider", "error", err)
		os.Exit(1)
	}

	db, err := databases.Open(context.Background(), serviceCfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to notification database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	store := repositoryStore{
		repo:     dataaccess.NewRepository(db),
		workerID: stringEnv("NOTIFICATION_WORKER_ID", hostnameFallback()),
	}
	runner, err := worker.New(store, smtpProvider, cfg, logger)
	if err != nil {
		logger.Error("failed to configure notification worker", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	logger.Info("notification worker starting", "batch_size", cfg.BatchSize, "poll_interval", cfg.PollInterval.String(), "concurrency", cfg.Concurrency)
	if err := runner.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Error("notification worker stopped unexpectedly", "error", err)
		os.Exit(1)
	}
	logger.Info("notification worker stopped", "time", time.Now().UTC())
}

type repositoryStore struct {
	repo     *dataaccess.Repository
	workerID string
}

func (s repositoryStore) ClaimDue(ctx context.Context, limit int, now time.Time) ([]worker.Notification, error) {
	items, err := s.repo.LockDueWork(ctx, s.workerID, limit, now)
	if err != nil {
		return nil, err
	}
	notifications := make([]worker.Notification, 0, len(items))
	for _, item := range items {
		notifications = append(notifications, toWorkerNotification(item))
	}
	return notifications, nil
}

func (s repositoryStore) MarkSent(ctx context.Context, update worker.SendSuccess) error {
	_, err := s.repo.RecordAttempt(ctx, dataaccess.AttemptUpdate{
		AttemptID:         newAttemptID(update.NotificationID, update.Attempt.AttemptNumber),
		NotificationID:    update.NotificationID,
		ProviderName:      update.ProviderName,
		ProviderMessageID: update.ProviderMessageID,
		Status:            worker.StatusSent,
		ProviderResponse:  stringMapToAny(update.ProviderResponse),
		CompletedAt:       update.SentAt,
	})
	return err
}

func (s repositoryStore) MarkFailed(ctx context.Context, update worker.SendFailure) error {
	nextAttemptAt := time.Time{}
	if update.NextAttemptAt != nil {
		nextAttemptAt = *update.NextAttemptAt
	}
	_, err := s.repo.RecordAttempt(ctx, dataaccess.AttemptUpdate{
		AttemptID:        newAttemptID(update.NotificationID, update.Attempt.AttemptNumber),
		NotificationID:   update.NotificationID,
		ProviderName:     update.Attempt.ProviderName,
		Status:           update.Status,
		Error:            update.LastError,
		ProviderResponse: stringMapToAny(update.Attempt.ProviderResponse),
		NextAttemptAt:    nextAttemptAt,
		CompletedAt:      update.Attempt.CompletedAt,
	})
	return err
}

func toWorkerNotification(item dataaccess.Notification) worker.Notification {
	return worker.Notification{
		ID:                item.ID,
		Channel:           item.Channel,
		Priority:          item.Priority,
		Status:            item.Status,
		Subject:           item.Subject,
		ContentText:       item.ContentText,
		IsContentHTML:     item.IsContentHTML,
		From:              providers.Address{Email: item.FromEmail, Name: item.FromName},
		ReplyTo:           providers.Address{Email: item.ReplyToEmail, Name: item.ReplyToName},
		To:                recipientsByType(item.Recipients, "TO"),
		CC:                recipientsByType(item.Recipients, "CC"),
		BCC:               recipientsByType(item.Recipients, "BCC"),
		Attachments:       toProviderAttachments(item.Attachments),
		Metadata:          anyMapToString(item.Metadata),
		AttemptCount:      item.AttemptCount,
		NextAttemptAt:     item.NextAttemptAt,
		ProviderName:      item.ProviderName,
		ProviderMessageID: item.ProviderMessageID,
	}
}

func recipientsByType(recipients []dataaccess.Recipient, recipientType string) []providers.Address {
	items := []providers.Address{}
	for _, recipient := range recipients {
		if recipient.RecipientType == recipientType {
			items = append(items, providers.Address{Email: recipient.Email, Name: recipient.Name})
		}
	}
	return items
}

func toProviderAttachments(attachments []dataaccess.Attachment) []providers.Attachment {
	items := make([]providers.Attachment, 0, len(attachments))
	for _, attachment := range attachments {
		items = append(items, providers.Attachment{
			ID:          attachment.ID,
			FileName:    attachment.Filename,
			ContentType: attachment.ContentType,
			StorageURL:  attachment.StorageURL,
		})
	}
	return items
}

func anyMapToString(values map[string]any) map[string]string {
	if len(values) == 0 {
		return nil
	}
	out := make(map[string]string, len(values))
	for key, value := range values {
		out[key] = fmt.Sprint(value)
	}
	return out
}

func stringMapToAny(values map[string]string) map[string]any {
	if len(values) == 0 {
		return nil
	}
	out := make(map[string]any, len(values))
	for key, value := range values {
		out[key] = value
	}
	return out
}

func newAttemptID(notificationID string, attemptNumber int) string {
	return fmt.Sprintf("%s-attempt-%d-%d", notificationID, attemptNumber, time.Now().UTC().UnixNano())
}

func hostnameFallback() string {
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		return "notification-worker"
	}
	return hostname
}

func intEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func stringEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

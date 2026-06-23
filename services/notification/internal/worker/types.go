package worker

import (
	"context"
	"time"

	"notification/internal/providers"
)

const (
	StatusQueued          = "QUEUED"
	StatusProcessing      = "PROCESSING"
	StatusSent            = "SENT"
	StatusFailedRetryable = "FAILED_RETRYABLE"
	StatusRetrying        = "RETRYING"
	StatusFailedPermanent = "FAILED_PERMANENT"
)

const (
	PriorityCritical = "CRITICAL"
	PriorityHigh     = "HIGH"
	PriorityNormal   = "NORMAL"
	PriorityLow      = "LOW"
	PriorityBulk     = "BULK"
)

type Notification struct {
	ID                string
	Channel           string
	Priority          string
	Subject           string
	ContentText       string
	IsContentHTML     bool
	From              providers.Address
	ReplyTo           providers.Address
	To                []providers.Address
	CC                []providers.Address
	BCC               []providers.Address
	Attachments       []providers.Attachment
	Metadata          map[string]string
	AttemptCount      int
	Status            string
	NextAttemptAt     time.Time
	ProviderName      string
	ProviderMessageID string
}

type AttemptRecord struct {
	NotificationID    string
	AttemptNumber     int
	Status            string
	ProviderName      string
	ProviderMessageID string
	ProviderResponse  map[string]string
	ErrorMessage      string
	Retryable         bool
	StartedAt         time.Time
	CompletedAt       time.Time
	NextAttemptAt     *time.Time
}

type SendSuccess struct {
	NotificationID    string
	Attempt           AttemptRecord
	ProviderName      string
	ProviderMessageID string
	ProviderResponse  map[string]string
	SentAt            time.Time
}

type SendFailure struct {
	NotificationID string
	Attempt        AttemptRecord
	Status         string
	LastError      string
	AttemptCount   int
	NextAttemptAt  *time.Time
}

type Store interface {
	ClaimDue(ctx context.Context, limit int, now time.Time) ([]Notification, error)
	MarkSent(ctx context.Context, update SendSuccess) error
	MarkFailed(ctx context.Context, update SendFailure) error
}

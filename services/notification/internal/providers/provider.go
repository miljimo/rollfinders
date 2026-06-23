package providers

import (
	"context"
	"errors"
	"time"
)

const EmailChannel = "EMAIL"

type Address struct {
	Email string
	Name  string
}

type Attachment struct {
	ID          string
	FileName    string
	ContentType string
	StorageURL  string
}

type Message struct {
	ID          string
	Channel     string
	Subject     string
	ContentText string
	IsHTML      bool
	From        Address
	ReplyTo     Address
	To          []Address
	CC          []Address
	BCC         []Address
	Attachments []Attachment
	Metadata    map[string]string
}

type SendResult struct {
	ProviderName      string
	ProviderMessageID string
	ResponseMetadata  map[string]string
	Retryable         bool
	SentAt            time.Time
}

type NotificationProvider interface {
	Name() string
	Send(ctx context.Context, msg Message) (SendResult, error)
}

type ProviderError struct {
	Message   string
	Retryable bool
	Cause     error
}

func (e *ProviderError) Error() string {
	if e == nil {
		return ""
	}
	if e.Cause == nil {
		return e.Message
	}
	return e.Message + ": " + e.Cause.Error()
}

func (e *ProviderError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func RetryableError(message string, cause error) error {
	return &ProviderError{Message: message, Retryable: true, Cause: cause}
}

func PermanentError(message string, cause error) error {
	return &ProviderError{Message: message, Retryable: false, Cause: cause}
}

func IsRetryable(err error) bool {
	var providerErr *ProviderError
	if errors.As(err, &providerErr) {
		return providerErr.Retryable
	}
	return false
}

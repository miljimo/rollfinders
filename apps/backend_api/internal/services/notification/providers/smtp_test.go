package providers

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"
)

type fakeSender struct {
	err        error
	from       string
	recipients []string
	raw        string
}

func (s *fakeSender) Send(_ context.Context, _ SMTPConfig, from string, recipients []string, raw []byte) (string, map[string]string, error) {
	s.from = from
	s.recipients = append([]string{}, recipients...)
	s.raw = string(raw)
	if s.err != nil {
		return "", nil, s.err
	}
	return "smtp-id-1", map[string]string{"accepted": "true"}, nil
}

type fakeStorage struct{}

func (fakeStorage) Open(_ context.Context, storageURL string) (AttachmentContent, error) {
	return AttachmentContent{
		FileName:    "report.txt",
		ContentType: "text/plain",
		Reader:      io.NopCloser(strings.NewReader("attachment-data:" + storageURL)),
	}, nil
}

func TestSMTPProviderSendsRecipientsBodiesAndAttachments(t *testing.T) {
	sender := &fakeSender{}
	provider, err := NewSMTPProvider(SMTPConfig{
		Host:          "smtp.test",
		DefaultSender: Address{Email: "noreply@example.com", Name: "RollFinder"},
	}, fakeStorage{}, sender)
	if err != nil {
		t.Fatal(err)
	}
	provider.now = func() time.Time { return time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC) }

	result, err := provider.Send(context.Background(), Message{
		ID:          "notification-1",
		Channel:     EmailChannel,
		Subject:     "Booking Confirmed",
		ContentText: "<p>Confirmed</p>",
		IsHTML:      true,
		To:          []Address{{Email: "to@example.com"}},
		CC:          []Address{{Email: "cc@example.com"}},
		BCC:         []Address{{Email: "bcc@example.com"}},
		Attachments: []Attachment{{ID: "att-1", StorageURL: "storage://report"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ProviderName != "smtp" || result.ProviderMessageID != "smtp-id-1" {
		t.Fatalf("unexpected result: %#v", result)
	}
	if sender.from != "noreply@example.com" {
		t.Fatalf("unexpected sender: %s", sender.from)
	}
	if strings.Contains(sender.raw, "bcc@example.com") {
		t.Fatalf("raw headers leaked bcc recipient: %s", sender.raw)
	}
	for _, want := range []string{"to@example.com", "cc@example.com", "bcc@example.com"} {
		if !contains(sender.recipients, want) {
			t.Fatalf("missing recipient %s in %#v", want, sender.recipients)
		}
	}
	for _, want := range []string{"multipart/mixed", "text/html", "Booking Confirmed", "report.txt"} {
		if !strings.Contains(sender.raw, want) {
			t.Fatalf("raw message missing %q:\n%s", want, sender.raw)
		}
	}
}

func TestSMTPProviderClassifiesFailures(t *testing.T) {
	tests := []struct {
		name      string
		err       error
		retryable bool
	}{
		{name: "temporary", err: errors.New("dial tcp timeout"), retryable: true},
		{name: "permanent", err: &SMTPStatusError{Code: 550, Message: "invalid recipient"}, retryable: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, err := NewSMTPProvider(SMTPConfig{Host: "smtp.test", DefaultSender: Address{Email: "noreply@example.com"}}, nil, &fakeSender{err: tt.err})
			if err != nil {
				t.Fatal(err)
			}
			_, err = provider.Send(context.Background(), Message{
				Channel:     EmailChannel,
				Subject:     "Hello",
				ContentText: "Body",
				To:          []Address{{Email: "to@example.com"}},
			})
			if err == nil {
				t.Fatal("expected error")
			}
			if got := IsRetryable(err); got != tt.retryable {
				t.Fatalf("retryable=%v, want %v, err=%v", got, tt.retryable, err)
			}
		})
	}
}

func contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}

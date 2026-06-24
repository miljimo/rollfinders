package worker

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"rollfinders/internal/services/notification/providers"
)

type fakeStore struct {
	claimed []Notification
	sent    []SendSuccess
	failed  []SendFailure
}

func (s *fakeStore) ClaimDue(_ context.Context, limit int, _ time.Time) ([]Notification, error) {
	if len(s.claimed) < limit {
		limit = len(s.claimed)
	}
	return append([]Notification{}, s.claimed[:limit]...), nil
}

func (s *fakeStore) MarkSent(_ context.Context, update SendSuccess) error {
	s.sent = append(s.sent, update)
	return nil
}

func (s *fakeStore) MarkFailed(_ context.Context, update SendFailure) error {
	s.failed = append(s.failed, update)
	return nil
}

type fakeProvider struct {
	err  error
	sent []providers.Message
	name string
}

func (p *fakeProvider) Name() string {
	if p.name == "" {
		return "fake"
	}
	return p.name
}

func (p *fakeProvider) Send(_ context.Context, msg providers.Message) (providers.SendResult, error) {
	p.sent = append(p.sent, msg)
	if p.err != nil {
		return providers.SendResult{ProviderName: p.Name()}, p.err
	}
	return providers.SendResult{
		ProviderName:      p.Name(),
		ProviderMessageID: "provider-message-1",
		ResponseMetadata:  map[string]string{"ok": "true"},
		SentAt:            time.Date(2026, 6, 23, 13, 0, 0, 0, time.UTC),
	}, nil
}

func TestWorkerMarksSuccessfulSend(t *testing.T) {
	store := &fakeStore{claimed: []Notification{{ID: "n1", Channel: providers.EmailChannel, Priority: PriorityNormal, Subject: "Hi", ContentText: "Body"}}}
	provider := &fakeProvider{}
	runner, err := New(store, provider, Config{BatchSize: 10, Concurrency: 1}, slog.Default())
	if err != nil {
		t.Fatal(err)
	}
	runner.now = fixedNow

	if err := runner.ProcessOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(store.sent) != 1 {
		t.Fatalf("sent updates=%d, want 1", len(store.sent))
	}
	update := store.sent[0]
	if update.Attempt.Status != StatusSent || update.ProviderName != "fake" || update.ProviderMessageID == "" {
		t.Fatalf("unexpected sent update: %#v", update)
	}
	if update.Attempt.AttemptNumber != 1 {
		t.Fatalf("attempt=%d, want 1", update.Attempt.AttemptNumber)
	}
}

func TestWorkerRetryableFailureSchedulesNextAttempt(t *testing.T) {
	store := &fakeStore{claimed: []Notification{{ID: "n1", AttemptCount: 1, Priority: PriorityNormal}}}
	provider := &fakeProvider{err: providers.RetryableError("temporary", errors.New("timeout"))}
	runner, err := New(store, provider, Config{BatchSize: 10, Concurrency: 1}, slog.Default())
	if err != nil {
		t.Fatal(err)
	}
	runner.now = fixedNow

	if err := runner.ProcessOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(store.failed) != 1 {
		t.Fatalf("failed updates=%d, want 1", len(store.failed))
	}
	update := store.failed[0]
	if update.Status != StatusRetrying {
		t.Fatalf("status=%s, want %s", update.Status, StatusRetrying)
	}
	want := fixedNow().Add(5 * time.Minute)
	if update.NextAttemptAt == nil || !update.NextAttemptAt.Equal(want) {
		t.Fatalf("next attempt=%v, want %v", update.NextAttemptAt, want)
	}
	if !update.Attempt.Retryable {
		t.Fatal("attempt should be retryable")
	}
}

func TestWorkerPermanentAfterExhaustedAttempts(t *testing.T) {
	store := &fakeStore{claimed: []Notification{{ID: "n1", AttemptCount: 4, Priority: PriorityNormal}}}
	provider := &fakeProvider{err: providers.RetryableError("temporary", errors.New("timeout"))}
	runner, err := New(store, provider, Config{BatchSize: 10, Concurrency: 1}, slog.Default())
	if err != nil {
		t.Fatal(err)
	}
	runner.now = fixedNow

	if err := runner.ProcessOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	update := store.failed[0]
	if update.Status != StatusFailedPermanent || update.NextAttemptAt != nil {
		t.Fatalf("unexpected exhausted update: %#v", update)
	}
}

func TestWorkerProcessesEqualDueByPriority(t *testing.T) {
	due := fixedNow()
	store := &fakeStore{claimed: []Notification{
		{ID: "bulk", Priority: PriorityBulk, NextAttemptAt: due},
		{ID: "critical", Priority: PriorityCritical, NextAttemptAt: due},
		{ID: "high", Priority: PriorityHigh, NextAttemptAt: due},
	}}
	provider := &fakeProvider{}
	runner, err := New(store, provider, Config{BatchSize: 10, Concurrency: 1}, slog.Default())
	if err != nil {
		t.Fatal(err)
	}
	runner.now = fixedNow

	if err := runner.ProcessOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	got := []string{provider.sent[0].ID, provider.sent[1].ID, provider.sent[2].ID}
	want := []string{"critical", "high", "bulk"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order=%v, want %v", got, want)
		}
	}
}

func TestRetrySchedule(t *testing.T) {
	now := fixedNow()
	tests := []struct {
		completedAttempt int
		wantDelay        time.Duration
		ok               bool
	}{
		{completedAttempt: 1, wantDelay: time.Minute, ok: true},
		{completedAttempt: 2, wantDelay: 5 * time.Minute, ok: true},
		{completedAttempt: 3, wantDelay: 15 * time.Minute, ok: true},
		{completedAttempt: 4, wantDelay: time.Hour, ok: true},
		{completedAttempt: 5, ok: false},
	}
	for _, tt := range tests {
		got, ok := NextRetryTime(now, tt.completedAttempt)
		if ok != tt.ok {
			t.Fatalf("attempt %d ok=%v, want %v", tt.completedAttempt, ok, tt.ok)
		}
		if ok && !got.Equal(now.Add(tt.wantDelay)) {
			t.Fatalf("attempt %d got %v, want %v", tt.completedAttempt, got, now.Add(tt.wantDelay))
		}
	}
}

func fixedNow() time.Time {
	return time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC)
}

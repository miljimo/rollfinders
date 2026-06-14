package server

import (
	"fmt"
	"net/http"
)

type metrics struct {
	requests         int64
	payments         int64
	refunds          int64
	webhooks         int64
	providerSuccess  int64
	providerFailure  int64
	outboxDispatched int64
}

func (s *server) metrics(w http.ResponseWriter, r *http.Request) {
	s.store.mu.Lock()
	m := s.store.metrics
	s.store.mu.Unlock()
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	_, _ = fmt.Fprintf(w, "# HELP payments_api_requests_total Total API requests.\n# TYPE payments_api_requests_total counter\npayments_api_requests_total %d\n", m.requests)
	_, _ = fmt.Fprintf(w, "# HELP payments_created_total Total created payments.\n# TYPE payments_created_total counter\npayments_created_total %d\n", m.payments)
	_, _ = fmt.Fprintf(w, "# HELP refunds_created_total Total created refunds.\n# TYPE refunds_created_total counter\nrefunds_created_total %d\n", m.refunds)
	_, _ = fmt.Fprintf(w, "# HELP webhooks_processed_total Total processed webhooks.\n# TYPE webhooks_processed_total counter\nwebhooks_processed_total %d\n", m.webhooks)
	_, _ = fmt.Fprintf(w, "# HELP provider_calls_total Provider calls by result.\n# TYPE provider_calls_total counter\nprovider_calls_total{result=\"success\"} %d\nprovider_calls_total{result=\"failure\"} %d\n", m.providerSuccess, m.providerFailure)
	_, _ = fmt.Fprintf(w, "# HELP outbox_events_dispatched_total Total dispatched outbox events.\n# TYPE outbox_events_dispatched_total counter\noutbox_events_dispatched_total %d\n", m.outboxDispatched)
}

func (s *server) dispatchOutbox(w http.ResponseWriter, r *http.Request) {
	count := s.store.dispatchOutbox(100)
	s.logger.Info("outbox dispatch completed", "dispatched", count)
	writeJSON(w, http.StatusOK, map[string]int{"dispatched": count})
}

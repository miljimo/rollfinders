package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"rollfinders/internal/services/usage_limits/config"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg    config.Config
	logger *slog.Logger
	repo   *repository
}

func NewWithCleanup(opts Options) (http.Handler, func()) {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger}
	cleanup := func() {}
	if opts.Config.DatabaseURL != "" {
		repo, err := openRepository(context.Background(), opts.Config.DatabaseURL)
		if err != nil {
			opts.Logger.Warn("usage limits database unavailable at startup", "error", err)
		} else {
			s.repo = repo
			cleanup = func() { _ = repo.close() }
		}
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /readyz", s.ready)
	mux.HandleFunc("POST /v1/usage-limits/check", s.check)
	mux.HandleFunc("POST /v1/usage-limits/reservations", s.createReservation)
	mux.HandleFunc("POST /v1/usage-limits/reservations/{reservation_id}/confirm", s.confirmReservation)
	mux.HandleFunc("POST /v1/usage-limits/reservations/{reservation_id}/release", s.releaseReservation)
	mux.HandleFunc("POST /v1/usage-limits/increment", s.increment)
	mux.HandleFunc("POST /v1/usage-limits/decrement", s.decrement)
	mux.HandleFunc("GET /v1/usage-limits/owners/{owner_type}/{owner_id}", s.owner)
	return s.accessLog(mux), cleanup
}

func (s *server) accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		s.logger.Info("request handled", "method", r.Method, "path", r.URL.Path, "duration_ms", time.Since(start).Milliseconds())
	})
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "usage_limits"})
}

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	if s.repo == nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is not configured.")
		return
	}
	if err := s.repo.ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is unavailable.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "usage_limits"})
}

func (s *server) decodeUsageRequest(w http.ResponseWriter, r *http.Request) (usageRequest, bool) {
	var req usageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request_body", "Request body must be valid JSON.")
		return req, false
	}
	req.OwnerType = strings.TrimSpace(strings.ToLower(req.OwnerType))
	req.OwnerID = strings.TrimSpace(req.OwnerID)
	req.SubscriptionPlanID = strings.TrimSpace(req.SubscriptionPlanID)
	req.ResourceType = strings.TrimSpace(strings.ToLower(req.ResourceType))
	req.ActionKey = strings.TrimSpace(strings.ToLower(req.ActionKey))
	req.IdempotencyKey = strings.TrimSpace(req.IdempotencyKey)
	if req.Amount == 0 {
		req.Amount = 1
	}
	if req.PeriodType == "" {
		req.PeriodType = "lifetime"
	}
	req.PeriodType = strings.TrimSpace(strings.ToLower(req.PeriodType))
	if req.OwnerType == "" || req.OwnerID == "" || req.ResourceType == "" || req.ActionKey == "" || req.Amount < 1 {
		writeError(w, http.StatusBadRequest, "invalid_usage_request", "Owner, resource, action, and positive amount are required.")
		return req, false
	}
	if req.PeriodType != "lifetime" && req.PeriodType != "subscription_period" {
		writeError(w, http.StatusBadRequest, "invalid_period_type", "Period type must be lifetime or subscription_period.")
		return req, false
	}
	return req, true
}

func (s *server) check(w http.ResponseWriter, r *http.Request) {
	if s.repo == nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is unavailable.")
		return
	}
	req, ok := s.decodeUsageRequest(w, r)
	if !ok {
		return
	}
	decision, err := s.repo.check(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "usage_check_failed", "Usage limit check failed.")
		return
	}
	status := http.StatusOK
	if !decision.Allowed {
		status = http.StatusForbidden
	}
	writeJSON(w, status, decision)
}

func (s *server) createReservation(w http.ResponseWriter, r *http.Request) {
	if s.repo == nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is unavailable.")
		return
	}
	req, ok := s.decodeUsageRequest(w, r)
	if !ok {
		return
	}
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	}
	if req.IdempotencyKey == "" {
		writeError(w, http.StatusBadRequest, "idempotency_key_required", "Reservation requires an idempotency key.")
		return
	}
	decision, err := s.repo.reserve(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "reservation_failed", "Usage reservation failed.")
		return
	}
	status := http.StatusOK
	if !decision.Allowed {
		status = http.StatusForbidden
	}
	writeJSON(w, status, decision)
}

func (s *server) confirmReservation(w http.ResponseWriter, r *http.Request) {
	s.updateReservation(w, r, "confirm")
}

func (s *server) releaseReservation(w http.ResponseWriter, r *http.Request) {
	s.updateReservation(w, r, "release")
}

func (s *server) updateReservation(w http.ResponseWriter, r *http.Request, action string) {
	if s.repo == nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is unavailable.")
		return
	}
	id := strings.TrimSpace(r.PathValue("reservation_id"))
	if id == "" {
		writeError(w, http.StatusBadRequest, "reservation_required", "Reservation id is required.")
		return
	}
	var err error
	if action == "confirm" {
		err = s.repo.confirm(r.Context(), id)
	} else {
		err = s.repo.release(r.Context(), id)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "reservation_update_failed", "Usage reservation update failed.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": action + "ed", "reservation_id": id})
}

func (s *server) increment(w http.ResponseWriter, r *http.Request) {
	s.adjust(w, r, 1)
}

func (s *server) decrement(w http.ResponseWriter, r *http.Request) {
	s.adjust(w, r, -1)
}

func (s *server) adjust(w http.ResponseWriter, r *http.Request, direction int) {
	if s.repo == nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is unavailable.")
		return
	}
	req, ok := s.decodeUsageRequest(w, r)
	if !ok {
		return
	}
	if err := s.repo.adjust(r.Context(), req, direction); err != nil {
		writeError(w, http.StatusInternalServerError, "usage_adjustment_failed", "Usage adjustment failed.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "applied"})
}

func (s *server) owner(w http.ResponseWriter, r *http.Request) {
	if s.repo == nil {
		writeError(w, http.StatusServiceUnavailable, "database_unavailable", "Usage Limits database is unavailable.")
		return
	}
	ownerType := strings.TrimSpace(strings.ToLower(r.PathValue("owner_type")))
	ownerID := strings.TrimSpace(r.PathValue("owner_id"))
	if ownerType == "" || ownerID == "" {
		writeError(w, http.StatusBadRequest, "owner_required", "Owner type and owner id are required.")
		return
	}
	summary, err := s.repo.ownerSummary(r.Context(), ownerType, ownerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "owner_summary_failed", "Owner usage summary failed.")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

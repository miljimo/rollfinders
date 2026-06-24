package server

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"rollfinders/internal/services/analytics/config"
)

type Server struct {
	cfg    config.Config
	repo   *Repository
	logger *slog.Logger
}

func New(cfg config.Config, repo *Repository, logger *slog.Logger) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	s := &Server{cfg: cfg, repo: repo, logger: logger}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /readyz", s.ready)
	mux.Handle("POST /v1/events", s.requireAuth(http.HandlerFunc(s.trackEvent)))
	mux.Handle("POST /v1/aggregate", s.requireAuth(http.HandlerFunc(s.aggregate)))
	mux.Handle("GET /v1/reports/founder-summary", s.requireAuth(http.HandlerFunc(s.founderSummary)))
	mux.Handle("GET /v1/reports/academy-profile-views", s.requireAuth(http.HandlerFunc(s.academyProfileViews)))
	return s.log(mux)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.Ready(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "not_ready"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) trackEvent(w http.ResponseWriter, r *http.Request) {
	var req TrackEventRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil || strings.TrimSpace(req.EventName) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid analytics event"})
		return
	}
	req.EventName = strings.TrimSpace(req.EventName)
	id := newID()
	if err := s.repo.Track(r.Context(), id, req); err != nil {
		s.logger.Error("analytics event write failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "write_failed"})
		return
	}
	writeJSON(w, http.StatusAccepted, TrackEventResponse{EventID: id, Status: "accepted"})
}

func (s *Server) aggregate(w http.ResponseWriter, r *http.Request) {
	metricDate := r.URL.Query().Get("date")
	if metricDate == "" {
		var body struct {
			Date string `json:"date"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		metricDate = body.Date
	}
	if _, err := time.Parse("2006-01-02", metricDate); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid date"})
		return
	}
	metrics, err := s.repo.Aggregate(r.Context(), metricDate)
	response := AggregateResponse{OK: err == nil, MetricDate: metricDate, Metrics: metrics}
	if err != nil {
		s.logger.Error("analytics aggregation failed", "error", err)
		response.Error = "aggregation_failed"
		writeJSON(w, http.StatusAccepted, response)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) founderSummary(w http.ResponseWriter, r *http.Request) {
	days := 30
	if raw := r.URL.Query().Get("days"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			days = parsed
		}
	}
	if days < 1 {
		days = 1
	}
	if days > 365 {
		days = 365
	}
	report, err := s.repo.FounderSummary(r.Context(), days)
	if err != nil {
		s.logger.Error("analytics report failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "report_failed"})
		return
	}
	writeJSON(w, http.StatusOK, report)
}

func (s *Server) academyProfileViews(w http.ResponseWriter, r *http.Request) {
	academyID := strings.TrimSpace(r.URL.Query().Get("academyId"))
	if academyID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "academyId is required"})
		return
	}
	count, err := s.repo.AcademyProfileViewCount(r.Context(), academyID)
	if err != nil {
		s.logger.Error("academy profile view count failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "report_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"profileViewCount": count})
}

func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.APIKey == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "analytics service credentials are not configured"})
			return
		}
		token := bearer(r.Header.Get("Authorization"))
		if token == "" {
			token = r.Header.Get("X-API-Key")
		}
		if subtle.ConstantTimeCompare([]byte(token), []byte(s.cfg.APIKey)) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid analytics service credential"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) log(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		s.logger.Info("request handled", "method", r.Method, "path", r.URL.Path, "duration_ms", time.Since(start).Milliseconds())
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func bearer(header string) string {
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func newID() string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(bytes[:])
}

type readyRepo interface {
	Ready(ctx context.Context) error
}

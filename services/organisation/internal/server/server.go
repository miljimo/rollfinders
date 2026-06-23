package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"organisation/internal/config"
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

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger}
	if opts.Config.DatabaseURL != "" {
		repo, err := openRepository(context.Background(), opts.Config.DatabaseURL)
		if err != nil {
			opts.Logger.Warn("organisation database unavailable at startup", "error", err)
		} else {
			s.repo = repo
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /readyz", s.ready)
	mux.HandleFunc("GET /v1/organisations", s.listOrganisations)
	mux.HandleFunc("GET /v1/organisations/{organisation_id}", s.getOrganisation)
	mux.HandleFunc("GET /v1/applications", s.listApplications)
	mux.HandleFunc("GET /v1/applications/{application_id}", s.getApplication)
	mux.HandleFunc("GET /v1/applications/{application_id}/services", s.listApplicationServices)

	return withRequestID(s.accessLog(mux))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (s *server) accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		s.logger.Info("request handled", "request_id", requestIDFrom(r), "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

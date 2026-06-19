package server

import (
	"net/http"
	"time"

	"courses/internal/handlers"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (s *server) requireAuth(next handlers.HttpHandler) handlers.HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.APIKey == "" {
			handlers.WriteError(w, http.StatusUnauthorized, "unauthorized", "API authentication is not configured.")
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+s.cfg.APIKey && r.Header.Get("X-API-Key") != s.cfg.APIKey {
			handlers.WriteError(w, http.StatusUnauthorized, "unauthorized", "Valid API credentials are required.")
			return
		}
		next(w, r)
	}
}

func (s *server) accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		s.logger.Info("request handled", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

package server

import (
	"net/http"
	"strings"
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
		next(w, r)
	}
}

func (s *server) requirePlatformCourseTypeAdmin(next handlers.HttpHandler) handlers.HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		switch strings.ToUpper(strings.TrimSpace(firstNonEmpty(r.Header.Get("X-Actor-Role"), r.Header.Get("X-User-Role")))) {
		case "PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN":
			next(w, r)
		default:
			handlers.WriteError(w, http.StatusForbidden, "forbidden", "Only platform admins and super admins can create or manage course types.")
		}
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

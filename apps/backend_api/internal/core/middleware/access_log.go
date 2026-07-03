package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

type AccessLogOption func(*accessLogOptions)

type accessLogOptions struct {
	message          string
	requestIDFrom    func(*http.Request) string
	serviceAttribute string
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func AccessLog(logger *slog.Logger, next http.Handler, options ...AccessLogOption) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}

	opts := accessLogOptions{message: "request handled"}
	for _, option := range options {
		option(&opts)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		attrs := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		}
		if opts.serviceAttribute != "" {
			attrs = append([]any{"service", opts.serviceAttribute}, attrs...)
		}
		if opts.requestIDFrom != nil {
			if requestID := opts.requestIDFrom(r); requestID != "" {
				attrs = append([]any{"request_id", requestID}, attrs...)
			}
		}

		logger.Info(opts.message, attrs...)
	})
}

func WithAccessLogMessage(message string) AccessLogOption {
	return func(opts *accessLogOptions) {
		if message != "" {
			opts.message = message
		}
	}
}

func WithAccessLogRequestID(fn func(*http.Request) string) AccessLogOption {
	return func(opts *accessLogOptions) {
		opts.requestIDFrom = fn
	}
}

func WithAccessLogService(service string) AccessLogOption {
	return func(opts *accessLogOptions) {
		opts.serviceAttribute = service
	}
}

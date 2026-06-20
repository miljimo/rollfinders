package server

import (
	"log/slog"
	"net/http"
	"time"

	"booking/internal/config"
	"booking/internal/handlers"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg    config.Config
	logger *slog.Logger
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger}
	router := &handlers.Router{}

	mustHandle := func(pattern string, methods []string, handler handlers.HttpHandler, middleware ...handlers.MiddlewareFunc) {
		if len(middleware) > 0 {
			handler = handlers.WithMiddleware(handler).Apply(middleware...)
		}
		if _, err := router.Handle(pattern, methods, handler); err != nil {
			panic(err)
		}
	}

	mustHandle("/healthz", []string{http.MethodGet}, s.health)
	mustHandle("/readyz", []string{http.MethodGet}, s.ready)
	mustHandle("/v1/bookings", []string{http.MethodPost}, s.createBooking, s.requireAuth)
	mustHandle("/v1/bookings", []string{http.MethodGet}, s.listBookings, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}", []string{http.MethodGet}, s.getBooking, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/cancel", []string{http.MethodPost}, s.cancelBooking, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/confirm", []string{http.MethodPost}, s.confirmBooking, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/complete", []string{http.MethodPost}, s.completeBooking, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/payment-link", []string{http.MethodPost}, s.linkPayment, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/participants", []string{http.MethodPost}, s.createParticipant, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/participants", []string{http.MethodGet}, s.listParticipants, s.requireAuth)
	mustHandle("/v1/bookings/{booking_id}/participants/{participant_id}/attendance", []string{http.MethodPost}, s.recordAttendance, s.requireAuth)

	return withRequestID(s.accessLog(router))
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
		s.logger.Info("request handled",
			"request_id", requestIDFrom(r),
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

func (s *server) requireAuth(next handlers.HttpHandler) handlers.HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.APIKey == "" {
			writeError(w, r, http.StatusUnauthorized, "unauthorized", "API authentication is not configured.", nil)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+s.cfg.APIKey && r.Header.Get("X-API-Key") != s.cfg.APIKey {
			writeError(w, r, http.StatusUnauthorized, "unauthorized", "Valid API credentials are required.", nil)
			return
		}
		next(w, r)
	}
}

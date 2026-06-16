package server

import (
	"log/slog"
	"net/http"
	"time"

	"payments/internal/config"
	"payments/internal/handlers"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}

	s := &server{
		cfg:       opts.Config,
		logger:    opts.Logger,
		store:     newStore(),
		providers: providerRegistry{"stripe": stripeAdapter{}, "paypal": paypalAdapter{}},
	}

	router := &handlers.Router{}
	mustHandle := func(pattern string, methods []string, handler handlers.HttpHandler, middleware ...handlers.MiddlewareFunc) {
		if len(middleware) > 0 {
			handler = handlers.WithMiddleware(handler).Apply(middleware...)
		}
		_, err := router.Handle(pattern, methods, handler)
		if err != nil {
			panic(err)
		}
	}

	mustHandle("/healthz", []string{http.MethodGet}, s.health)
	mustHandle("/readyz", []string{http.MethodGet}, s.ready)
	if opts.Config.MetricsEnabled {
		mustHandle("/metrics", []string{http.MethodGet}, s.metrics)
	}
	auth := s.requireAuth
	mustHandle("/v1/course-occurrence-checkouts", []string{http.MethodPost}, s.createCourseOccurrenceCheckout, auth)
	mustHandle("/v1/payments", []string{http.MethodPost}, s.createPayment, auth)
	mustHandle("/v1/payments/{id}", []string{http.MethodGet}, s.getPayment, auth)
	mustHandle("/v1/payments/{id}/capture", []string{http.MethodPost}, s.capturePayment, auth)
	mustHandle("/v1/payments/{id}/cancel", []string{http.MethodPost}, s.cancelPayment, auth)
	mustHandle("/v1/payments/{id}/refunds", []string{http.MethodPost}, s.createRefund, auth)
	mustHandle("/v1/payments/{id}/refunds", []string{http.MethodGet}, s.listRefunds, auth)
	mustHandle("/v1/webhooks/{provider}", []string{http.MethodPost}, s.webhook)
	mustHandle("/internal/outbox/dispatch", []string{http.MethodPost}, s.dispatchOutbox)

	return withRequestID(s.accessLog(router))
}

type server struct {
	cfg       config.Config
	logger    *slog.Logger
	store     *store
	providers providerRegistry
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
		s.store.mu.Lock()
		s.store.metrics.requests++
		s.store.mu.Unlock()
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

package server

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"notification/internal/config"
	"notification/internal/dataaccess"
	"notification/internal/handlers"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
	Store  NotificationStore
}

type NotificationStore interface {
	Create(ctx context.Context, input dataaccess.CreateNotificationInput) (dataaccess.Notification, bool, error)
	Get(ctx context.Context, id string) (dataaccess.Notification, error)
	Search(ctx context.Context, filter dataaccess.SearchFilter) ([]dataaccess.Notification, error)
}

type server struct {
	cfg    config.Config
	logger *slog.Logger
	store  NotificationStore
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger, store: opts.Store}
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
	mustHandle("/v1/notifications", []string{http.MethodPost}, s.createNotification, s.requireAuth)
	mustHandle("/v1/notifications", []string{http.MethodGet}, s.listNotifications, s.requireAuth)
	mustHandle("/v1/notifications/{notification_id}", []string{http.MethodGet}, s.getNotification, s.requireAuth)

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
			writeError(w, r, http.StatusUnauthorized, "unauthorized", "Notification service credentials are not configured.", nil)
			return
		}
		token := bearerToken(r.Header.Get("Authorization"))
		if token == "" {
			token = r.Header.Get("X-API-Key")
		}
		if subtle.ConstantTimeCompare([]byte(token), []byte(s.cfg.APIKey)) != 1 {
			writeError(w, r, http.StatusUnauthorized, "unauthorized", "A valid notification service API credential is required.", nil)
			return
		}
		next(w, r)
	}
}

func bearerToken(header string) string {
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

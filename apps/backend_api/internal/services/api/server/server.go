package server

import (
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/services/api/config"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg     config.Config
	logger  *slog.Logger
	proxies map[string]http.Handler
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{
		cfg:    opts.Config,
		logger: opts.Logger,
		proxies: map[string]http.Handler{
			"user":          createNewProxyHandler(opts.Config.UserBaseURL, "", ""),
			"authorisation": createNewProxyHandler(opts.Config.AuthorisationBaseURL, "/v1/authorisation", "/v1"),
			"academy":       createNewProxyHandler(opts.Config.AcademyBaseURL, "", ""),
			"organisation":  createNewProxyHandler(opts.Config.OrganisationBaseURL, "", ""),
			"course":        createNewProxyHandler(opts.Config.CourseBaseURL, "", ""),
			"booking":       createNewProxyHandler(opts.Config.BookingBaseURL, "", ""),
			"payment":       createNewProxyHandler(opts.Config.PaymentBaseURL, "", ""),
			"subscriptions": createNewProxyHandler(opts.Config.SubscriptionBaseURL, "", ""),
			"wallet":        createNewProxyHandler(opts.Config.WalletBaseURL, "", ""),
			"transfer":      createNewProxyHandler(opts.Config.TransferBaseURL, "", ""),
			"legacy":        createNewProxyHandler(opts.Config.LegacyNextBaseURL, "/legacy", ""),
		},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", s.docs)
	mux.HandleFunc("GET /openapi.json", s.openAPI)
	mux.HandleFunc("GET /doc/api", s.openAPI)
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /readyz", s.ready)
	mux.HandleFunc("/", s.route)

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
		s.logger.Info("request handled",
			"request_id", requestIDFrom(r),
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

package pricing

import (
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/pricing/config"
	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/endpoints"
	"rollfinders/internal/services/pricing/service"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
	Repo   dataaccess.Repository
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Repo == nil {
		panic("pricing repository is required")
	}
	svc := service.New(opts.Repo)
	router := &handlers.Router{}
	mustHandle := func(pattern string, methods []string, handler http.HandlerFunc) {
		_, err := router.Handle(pattern, methods, handlers.HttpHandler(handler))
		if err != nil {
			panic(err)
		}
	}
	mustHandle("/", []string{http.MethodGet}, pricingAPIIndex)
	mustHandle("/healthz", []string{http.MethodGet}, func(w http.ResponseWriter, _ *http.Request) {
		handlers.WriteOK(w, map[string]string{"status": "ok"})
	})
	mustHandle("/readyz", []string{http.MethodGet}, func(w http.ResponseWriter, _ *http.Request) {
		handlers.WriteOK(w, map[string]string{"status": "ready"})
	})
	if opts.Config.MetricsEnabled {
		mustHandle("/metrics", []string{http.MethodGet}, func(w http.ResponseWriter, _ *http.Request) {
			handlers.WriteOK(w, map[string]int{"requests": 0})
		})
	}
	mustHandle("/v1/pricing/policies/platform-fee", []string{http.MethodGet}, endpoints.GetActivePlatformFeePolicy(svc))
	mustHandle("/v1/pricing/policies/platform-fee", []string{http.MethodPut}, endpoints.UpdatePlatformFeePolicy(svc))
	mustHandle("/v1/pricing/policies/platform-fee/preview", []string{http.MethodPost}, endpoints.PreviewPlatformFee(svc))
	return accessLog(opts.Logger, router)
}

func pricingAPIIndex(w http.ResponseWriter, _ *http.Request) {
	handlers.WriteOK(w, map[string]any{
		"service": "pricing",
		"version": "v1",
		"endpoints": []map[string]string{
			{"method": http.MethodGet, "path": "/healthz", "description": "Liveness check"},
			{"method": http.MethodGet, "path": "/readyz", "description": "Readiness check"},
			{"method": http.MethodGet, "path": "/metrics", "description": "Service metrics"},
			{"method": http.MethodGet, "path": "/v1/pricing/policies/platform-fee", "description": "Get active platform fee policy"},
			{"method": http.MethodPut, "path": "/v1/pricing/policies/platform-fee", "description": "Update active platform fee policy"},
			{"method": http.MethodPost, "path": "/v1/pricing/policies/platform-fee/preview", "description": "Preview platform fee calculation"},
		},
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func accessLog(logger *slog.Logger, route http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		route.ServeHTTP(rec, r)
		logger.Info("pricing request handled", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

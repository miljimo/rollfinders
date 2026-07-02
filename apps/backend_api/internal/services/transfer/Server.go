package transfer

import (
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/transfer/config"
	"rollfinders/internal/services/transfer/endpoints"
	"rollfinders/internal/services/transfer/service"
)

type Options struct {
	Config  config.Config
	Logger  *slog.Logger
	Service *service.Service
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	svc := opts.Service
	if svc == nil {
		svc = service.New(nil)
	}
	router := &handlers.Router{}
	mustHandle := func(pattern string, methods []string, handler http.HandlerFunc) {
		_, err := router.Handle(pattern, methods, handlers.HttpHandler(handler))
		if err != nil {
			panic(err)
		}
	}
	mustHandle("/healthz", []string{http.MethodGet}, func(w http.ResponseWriter, _ *http.Request) { handlers.WriteOK(w, map[string]string{"status": "ok"}) })
	mustHandle("/readyz", []string{http.MethodGet}, func(w http.ResponseWriter, _ *http.Request) {
		handlers.WriteOK(w, map[string]string{"status": "ready"})
	})
	if opts.Config.MetricsEnabled {
		mustHandle("/metrics", []string{http.MethodGet}, func(w http.ResponseWriter, _ *http.Request) { handlers.WriteOK(w, map[string]int{"requests": 0}) })
	}
	mustHandle("/v1/transfers", []string{http.MethodGet}, endpoints.ListTransfers(svc))
	mustHandle("/v1/transfers", []string{http.MethodPost}, endpoints.CreateTransfer(svc))
	mustHandle("/v1/transfers/{id}", []string{http.MethodGet}, endpoints.GetTransfer(svc))
	mustHandle("/v1/transfers/{id}/status", []string{http.MethodPost}, endpoints.UpdateTransferStatus(svc))
	return accessLog(opts.Logger, router)
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func accessLog(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		logger.Info("transfer request handled", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

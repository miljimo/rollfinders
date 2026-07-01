package wallet

import (
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/config"
	"rollfinders/internal/services/wallet/endpoints"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
	Repo   repository.Repository
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Repo == nil {
		panic("wallet repository is required")
	}
	svc := service.New(opts.Repo)
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
	mustHandle("/v1/wallets", []string{http.MethodGet}, endpoints.ListWallets(svc))
	mustHandle("/v1/wallets", []string{http.MethodPost}, endpoints.CreateWallet(svc))
	mustHandle("/v1/wallets/transfer", []string{http.MethodPost}, endpoints.CreateTransfer(svc))
	mustHandle("/v1/wallets/reverse", []string{http.MethodPost}, endpoints.ReverseTransaction(svc))
	mustHandle("/v1/wallets/adjustment", []string{http.MethodPost}, endpoints.CreateAdjustment(svc))
	mustHandle("/v1/wallets/{id}", []string{http.MethodGet}, endpoints.GetWallet(svc))
	mustHandle("/v1/wallets/{id}/balance", []string{http.MethodGet}, endpoints.GetWalletBalance(svc))
	mustHandle("/v1/wallets/{id}/transactions", []string{http.MethodGet}, endpoints.ListWalletTransactions(svc))
	mustHandle("/v1/transactions/{id}", []string{http.MethodGet}, endpoints.GetTransaction(svc))
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

func accessLog(logger *slog.Logger, route http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		route.ServeHTTP(rec, r)
		logger.Info("Wallet request handled", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

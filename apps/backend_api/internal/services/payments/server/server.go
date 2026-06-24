package server

import (
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/services/payments/config"
	"rollfinders/internal/services/payments/handlers"
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
		store:     newStore(opts.Config.DatabaseURL),
		providers: providerRegistry{"stripe": stripeAdapter{secret: stripeSecretResolver{envValue: opts.Config.StripeSecretKey, filePath: opts.Config.StripeSecretKeyFile}, apiVersion: opts.Config.StripeAPIVersion, context: opts.Config.StripeContext}, "paypal": paypalAdapter{}},
	}
	if opts.Config.DefaultClientCallbackURL != "" {
		s.store.createPaymentClient(createPaymentClientRequest{
			ID:          opts.Config.DefaultClientID,
			Name:        opts.Config.DefaultClientName,
			CallbackURL: opts.Config.DefaultClientCallbackURL,
		})
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
	mustHandle("/v1/clients", []string{http.MethodPost}, s.createPaymentClient, auth)
	mustHandle("/v1/checkouts", []string{http.MethodPost}, s.createCheckout, auth)
	mustHandle("/v1/checkouts/{id}/callbacks/{result}", []string{http.MethodGet}, s.checkoutCallback)
	mustHandle("/v1/course-occurrence-checkouts", []string{http.MethodPost}, s.createCheckout, auth)
	mustHandle("/v1/course-occurrence-checkouts/{id}/callbacks/{result}", []string{http.MethodGet}, s.checkoutCallback)
	mustHandle("/v1/payments", []string{http.MethodPost}, s.createPayment, auth)
	mustHandle("/v1/payments", []string{http.MethodGet}, s.listPayments, auth)
	mustHandle("/v1/payments/{id}", []string{http.MethodGet}, s.getPayment, auth)
	mustHandle("/v1/payments/{id}/capture", []string{http.MethodPost}, s.capturePayment, auth)
	mustHandle("/v1/payments/{id}/cancel", []string{http.MethodPost}, s.cancelPayment, auth)
	mustHandle("/v1/payments/{id}/refunds", []string{http.MethodPost}, s.createRefund, auth)
	mustHandle("/v1/payments/{id}/refunds", []string{http.MethodGet}, s.listRefunds, auth)
	mustHandle("/v1/payees/{payee_id}/balances", []string{http.MethodGet}, s.getPayeeBalance, auth)
	mustHandle("/v1/payees/{payee_id}/payout-requests", []string{http.MethodPost}, s.createPayoutRequest, auth)
	mustHandle("/v1/payees/{payee_id}/payout-requests", []string{http.MethodGet}, s.listPayeePayoutRequests, auth)
	mustHandle("/v1/payout-requests", []string{http.MethodGet}, s.listPayoutRequests, auth)
	mustHandle("/v1/payout-requests/{id}", []string{http.MethodGet}, s.getPayoutRequest, auth)
	mustHandle("/v1/payout-requests/{id}/approve", []string{http.MethodPost}, s.approvePayoutRequest, auth)
	mustHandle("/v1/payout-requests/{id}/reject", []string{http.MethodPost}, s.rejectPayoutRequest, auth)
	mustHandle("/v1/payout-requests/{id}/hold", []string{http.MethodPost}, s.holdPayoutRequest, auth)
	mustHandle("/v1/payout-requests/{id}/release", []string{http.MethodPost}, s.releasePayoutRequest, auth)
	mustHandle("/v1/payout-requests/{id}/mark-paid", []string{http.MethodPost}, s.markPayoutRequestPaid, auth)
	mustHandle("/v1/payout-requests/{id}/cancel", []string{http.MethodPost}, s.cancelPayoutRequest, auth)
	mustHandle("/v1/payment-accounts/stripe", []string{http.MethodGet}, s.getPaymentAccountSetting, auth)
	mustHandle("/v1/payment-accounts/stripe/connect", []string{http.MethodPost}, s.createStripeConnectAccountLink, auth)
	mustHandle("/v1/payment-accounts/stripe/refresh", []string{http.MethodPost}, s.refreshStripeConnectAccount, auth)
	mustHandle("/v1/payment-accounts/stripe/disconnect", []string{http.MethodPost}, s.disconnectStripeConnectAccount, auth)
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
		next(w, r)
	}
}

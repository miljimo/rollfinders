package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/services/subscriptions/config"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg     config.Config
	logger  *slog.Logger
	repo    *repository
	billing stripeBillingClient
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{
		cfg:    opts.Config,
		logger: opts.Logger,
		billing: stripeBillingClient{
			apiVersion: opts.Config.StripeAPIVersion,
			secretKey:  opts.Config.StripeSecretKey,
		},
	}
	if opts.Config.DatabaseURL != "" {
		repo, err := openRepository(context.Background(), opts.Config.DatabaseURL)
		if err != nil {
			opts.Logger.Warn("subscriptions database unavailable at startup", "error", err)
		} else {
			s.repo = repo
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("GET /readyz", s.ready)
	mux.HandleFunc("GET /v1/products", s.listProducts)
	mux.HandleFunc("POST /v1/products", s.createProduct)
	mux.HandleFunc("GET /v1/products/{product_key}", s.getProduct)
	mux.HandleFunc("PUT /v1/products/{product_key}", s.updateProduct)
	mux.HandleFunc("DELETE /v1/products/{product_key}", s.deleteProduct)
	mux.HandleFunc("POST /v1/products/{product_key}/suspend", s.suspendProduct)
	mux.HandleFunc("GET /v1/product-features", s.listFeatures)
	mux.HandleFunc("POST /v1/product-features", s.createFeature)
	mux.HandleFunc("GET /v1/product-features/{feature_key}", s.getFeature)
	mux.HandleFunc("PUT /v1/product-features/{feature_key}", s.updateFeature)
	mux.HandleFunc("DELETE /v1/product-features/{feature_key}", s.deleteFeature)
	mux.HandleFunc("POST /v1/product-features/{feature_key}/disable", s.disableFeature)
	mux.HandleFunc("GET /v1/plans", s.listPlans)
	mux.HandleFunc("GET /v1/plans/billing-cycles", s.listBillingCycles)
	mux.HandleFunc("POST /v1/plans", s.createPlan)
	mux.HandleFunc("GET /v1/plans/{plan_key}", s.getPlan)
	mux.HandleFunc("PUT /v1/plans/{plan_key}", s.updatePlan)
	mux.HandleFunc("DELETE /v1/plans/{plan_key}", s.deletePlan)
	mux.HandleFunc("POST /v1/plans/{plan_key}/suspend", s.suspendPlan)
	mux.HandleFunc("PUT /v1/plans/{plan_key}/features", s.replacePlanFeatures)
	mux.HandleFunc("PUT /v1/plans/{plan_key}/products", s.replacePlanProducts)
	mux.HandleFunc("GET /v1/applications/{application_id}/available-product-features", s.availableProductFeatures)
	mux.HandleFunc("GET /v1/applications/{application_id}/subscriptions", s.listSubscriptions)
	mux.HandleFunc("POST /v1/applications/{application_id}/subscriptions", s.createSubscription)
	mux.HandleFunc("GET /v1/subscriptions/{subscription_id}", s.getSubscription)
	mux.HandleFunc("PUT /v1/subscriptions/{subscription_id}", s.updateSubscription)
	mux.HandleFunc("DELETE /v1/subscriptions/{subscription_id}", s.deleteSubscription)
	mux.HandleFunc("POST /v1/subscriptions/{subscription_id}/cancel", s.cancelSubscription)
	mux.HandleFunc("POST /v1/subscriptions/{subscription_id}/suspend", s.suspendSubscription)
	mux.HandleFunc("POST /v1/subscriptions/{subscription_id}/change-plan", s.changePlan)
	mux.HandleFunc("POST /v1/subscriptions/{subscription_id}/checkout", s.createSubscriptionCheckout)
	mux.HandleFunc("POST /v1/subscriptions/{subscription_id}/plan-changes", s.createPlanChange)
	mux.HandleFunc("GET /v1/subscriptions/{subscription_id}/plan-changes", s.listPlanChanges)
	mux.HandleFunc("GET /v1/subscriptions/{subscription_id}/billing-events", s.listBillingEvents)
	mux.HandleFunc("GET /v1/applications/{application_id}/entitlements", s.entitlements)
	mux.HandleFunc("POST /v1/entitlements/check", s.checkEntitlement)

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
		s.logger.Info("request handled", "request_id", requestIDFrom(r), "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

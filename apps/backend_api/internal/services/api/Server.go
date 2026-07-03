package api

import (
	"log/slog"
	"net/http"

	"rollfinders/internal/core/middleware"
	"rollfinders/internal/services/api/config"
	"rollfinders/internal/services/api/domain"
	"rollfinders/internal/services/api/endpoints"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg           config.Config
	logger        *slog.Logger
	proxies       map[string]http.Handler
	routeHandlers map[routeHandlerKey]http.Handler
}

type routeHandlerKey struct {
	Method string
	Path   string
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{
		cfg:    opts.Config,
		logger: opts.Logger,
		proxies: map[string]http.Handler{
			domain.ProxyKeyUser:          createNewProxyHandler(opts.Config.UserBaseURL, "", ""),
			domain.ProxyKeyAuthorisation: createNewProxyHandler(opts.Config.AuthorisationBaseURL, domain.AuthorisationProxyPath, domain.V1Path),
			domain.ProxyKeyAcademy:       createNewProxyHandler(opts.Config.AcademyBaseURL, "", ""),
			domain.ProxyKeyOrganisation:  createNewProxyHandler(opts.Config.OrganisationBaseURL, "", ""),
			domain.ProxyKeyCourse:        createNewProxyHandler(opts.Config.CourseBaseURL, "", ""),
			domain.ProxyKeyBooking:       createNewProxyHandler(opts.Config.BookingBaseURL, "", ""),
			domain.ProxyKeyPayment:       createNewProxyHandler(opts.Config.PaymentBaseURL, "", ""),
			domain.ProxyKeySubscriptions: createNewProxyHandler(opts.Config.SubscriptionBaseURL, "", ""),
			domain.ProxyKeyWallet:        createNewProxyHandler(opts.Config.WalletBaseURL, "", ""),
			domain.ProxyKeyTransfer:      createNewProxyHandler(opts.Config.TransferBaseURL, "", ""),
			domain.ProxyKeyPricing:       createNewProxyHandler(opts.Config.PricingBaseURL, "", ""),
			domain.ProxyKeyLegacy:        createNewProxyHandler(opts.Config.LegacyNextBaseURL, domain.LegacyProxyPath, ""),
		},
		routeHandlers: map[routeHandlerKey]http.Handler{
			{Method: http.MethodPost, Path: string(Transfers)}: endpoints.CreateWalletTransfer(endpoints.WalletTransferOptions{
				TransferBaseURL: opts.Config.TransferBaseURL,
				WalletBaseURL:   opts.Config.WalletBaseURL,
				RequestIDFrom:   requestIDFrom,
				WriteError:      writeError,
			}),
		},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", s.docs)
	mux.HandleFunc("GET "+domain.OpenAPIPath, s.openAPI)
	mux.HandleFunc("GET /doc/api", s.openAPI)
	mux.HandleFunc("GET "+domain.HealthPath, s.health)
	mux.HandleFunc("GET "+domain.ReadyPath, s.ready)
	mux.HandleFunc("/", s.route)
	return withRequestID(middleware.AccessLog(s.logger, mux, middleware.WithAccessLogRequestID(requestIDFrom)))
}

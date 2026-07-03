package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/domain"
	"rollfinders/internal/services/pricing/endpoints/responses"
	"rollfinders/internal/services/pricing/service"
)

func GetActivePlatformFeePolicy(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		policy, err := svc.GetActivePlatformFeePolicy(r.Context(), dataaccess.GetActivePlatformFeePolicyInput{
			ProviderID: handlers.Query(r, "provider_id"),
			Currency:   domain.Currency(handlers.Query(r, "currency")),
		})
		if err != nil {
			handlers.ErrorWithStatus(w, pricingStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]any{"policy": (*responses.PlatformFeePolicyResponse)(policy)}, http.StatusOK)
	}
}

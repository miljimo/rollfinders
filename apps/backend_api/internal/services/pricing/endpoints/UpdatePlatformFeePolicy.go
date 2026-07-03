package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/endpoints/requests"
	"rollfinders/internal/services/pricing/endpoints/responses"
	"rollfinders/internal/services/pricing/service"
)

func UpdatePlatformFeePolicy(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req requests.UpdatePlatformFeePolicyRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		policy, err := svc.UpdatePlatformFeePolicy(r.Context(), dataaccess.UpdatePlatformFeePolicyInput{
			ProviderID:            req.ProviderID,
			PercentageBasisPoints: req.PercentageBasisPoints,
			FixedAmountMinor:      req.FixedAmountMinor,
			Currency:              req.Currency,
			ActorUserID:           handlers.Header(r, "X-Actor-User-ID"),
		})
		if err != nil {
			handlers.ErrorWithStatus(w, pricingStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]any{"policy": (*responses.PlatformFeePolicyResponse)(policy)}, http.StatusOK)
	}
}

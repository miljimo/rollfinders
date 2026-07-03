package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/endpoints/requests"
	"rollfinders/internal/services/pricing/endpoints/responses"
	"rollfinders/internal/services/pricing/service"
)

func PreviewPlatformFee(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req requests.PreviewPlatformFeeRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		preview, err := svc.PreviewPlatformFee(r.Context(), dataaccess.PreviewPlatformFeeInput{
			AmountMinor: req.AmountMinor,
			ProviderID:  req.ProviderID,
			Currency:    req.Currency,
		})
		if err != nil {
			handlers.ErrorWithStatus(w, pricingStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]any{"preview": (*responses.PlatformFeePreviewResponse)(preview)}, http.StatusOK)
	}
}

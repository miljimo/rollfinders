package endpoints

import (
	"net/http"
	"strconv"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/dataaccess"
	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/endpoints/responses"
	"rollfinders/internal/services/wallet/service"
)

func ListWallets(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := intQuery(r, "limit", 10)
		offset := intQuery(r, "offset", 0)
		page, err := svc.ListWallets(r.Context(), dataaccess.ListWalletsInput{
			Type:     domain.WalletType(firstQuery(r, "wallet_type", "walletType")),
			OwnerID:  firstQuery(r, "owner_id", "ownerId"),
			Currency: domain.Currency(r.URL.Query().Get("currency")),
			Limit:    limit,
			Offset:   offset,
		})
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, responses.NewListWalletsResponse(page.Wallets, page.Limit, page.Offset, page.Total), http.StatusOK)
	}
}

func firstQuery(r *http.Request, keys ...string) string {
	for _, key := range keys {
		if value := r.URL.Query().Get(key); value != "" {
			return value
		}
	}
	return ""
}

func intQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

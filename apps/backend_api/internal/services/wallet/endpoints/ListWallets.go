package endpoints

import (
	"net/http"
	"strconv"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type paginationMeta struct {
	Limit      int  `json:"limit"`
	Offset     int  `json:"offset"`
	Count      int  `json:"count"`
	Total      int  `json:"total"`
	HasMore    bool `json:"has_more"`
	NextOffset int  `json:"next_offset,omitempty"`
}

func ListWallets(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := intQuery(r, "limit", 10)
		offset := intQuery(r, "offset", 0)
		page, err := svc.ListWallets(r.Context(), repository.ListWalletsInput{
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
		nextOffset := page.Offset + len(page.Wallets)
		meta := paginationMeta{
			Limit:   page.Limit,
			Offset:  page.Offset,
			Count:   len(page.Wallets),
			Total:   page.Total,
			HasMore: nextOffset < page.Total,
		}
		if meta.HasMore {
			meta.NextOffset = nextOffset
		}
		_ = handlers.SuccessWithData(w, map[string]interface{}{"wallets": page.Wallets, "pagination": meta}, http.StatusOK)
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
